// backend/authMiddleware.js
const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'sua_chave_secreta_super_segura';

module.exports = (req, res, next) => {
  
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });
  }

  
  const token = authHeader.split(' ')[1];

  try {
    // 2. Verifica a validade do token
    const decoded = jwt.verify(token, SECRET_KEY);
    
    // 3. Salva os dados do usuário na requisição para usar depois
    req.user = decoded;
    
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token inválido ou expirado.' });
  }
};