// backend/authMiddleware.js
const jwt = require('jsonwebtoken');

// O CÓDIGO NOVO (SEGURO - TIPO SÉNIOR) ✅
const SECRET_KEY = process.env.JWT_SECRET;

// Se a chave não existir no .env, o servidor para e avisa no terminal
if (!SECRET_KEY) {
  console.error("❌ ERRO CRÍTICO: A variável JWT_SECRET não foi encontrada no .env!");
  process.exit(1); // Encerra o servidor imediatamente para segurança
}

// --- FERRAMENTA 1: Verifica se o token é verdadeiro (O Crachá) ---
// Antes isso era o "module.exports" direto, agora é uma função nomeada.
exports.verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });
  }

  // O token vem como "Bearer eyJhbGci...", pegamos só a parte final
  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded; // Salva os dados do usuário (id, role) na requisição
    next(); // Pode passar
  } catch (error) {
    return res.status(403).json({ error: 'Token inválido ou expirado.' });
  }
};

// --- FERRAMENTA 2: Verifica o Cargo (RBAC) ---
// Essa é a novidade! Ela bloqueia se o cargo não for o certo.
exports.checkRole = (allowedRoles) => {
  return (req, res, next) => {
    // O verifyToken já rodou antes e colocou o req.user aqui
    // Se não tiver usuário ou o cargo dele não estiver na lista permitida...
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Acesso Proibido: Você não tem permissão para esta ação.' 
      });
    }
    next(); // Pode passar
  };
};