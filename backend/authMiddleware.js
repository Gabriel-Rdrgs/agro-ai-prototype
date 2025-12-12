const supabase = require('./utils/supabase');

/**
 * Middleware: Verifica Token via Supabase
 */
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticação não fornecido' });
    }

    const token = authHeader.split(' ')[1];

    // Valida o token no Supabase Auth
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error('❌ Erro de validação Supabase:', error?.message);
      return res.status(401).json({ error: 'Sessão inválida ou expirada' });
    }

    // Popula req.user com dados do Supabase + Role (se existir nos metadados)
    req.user = {
      id: user.id,
      email: user.email,
      // Supabase guarda roles extras em user_metadata. Se não tiver, assume 'user'
      role: user.user_metadata?.role || 'user', 
      aud: user.aud
    };

    next();
  } catch (err) {
    console.error('❌ Erro interno no authMiddleware:', err);
    return res.status(500).json({ error: 'Erro interno de autenticação' });
  }
};

/**
 * Middleware: Verifica Cargo (RBAC)
 * Funciona igual ao anterior, mas olhando para o req.user populado pelo Supabase
 */
const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    // Se o usuário não tem role ou a role não está na lista permitida
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Acesso Proibido: Você não tem permissão para esta ação.' 
      });
    }
    next();
  };
};

// Exportação nomeada para não quebrar as rotas existentes
module.exports = {
  verifyToken,
  checkRole
};