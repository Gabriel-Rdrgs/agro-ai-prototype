// backend/authController_supabase.js
// ✅ MIGRADO PARA SUPABASE AUTH (FASE 0 - Semana 1)
// Substitui authController.js manual por middleware do Supabase Auth

const { supabaseAdmin } = require('./utils/supabase');
const supabase = require('./utils/supabase');
const { logAction } = require('./services/auditService');

/**
 * Registro de usuário via Supabase Auth
 * Requer autenticação de admin (verificado pelo middleware checkRole)
 */
exports.register = async (req, res) => {
  const { name, email, password } = req.body;

  // Validação básica
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nome, email e senha são obrigatórios.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres.' });
  }

  try {
    // ✅ Usa Supabase Auth Admin para criar usuário
    if (!supabaseAdmin) {
      return res.status(500).json({ 
        error: 'Serviço de autenticação não configurado corretamente. Contate o administrador.' 
      });
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Confirma email automaticamente (admin cria)
      user_metadata: {
        name: name,
        role: 'analyst' // ✅ Segurança: role hardcoded, não aceita do body
      }
    });

    if (error) {
      console.error('❌ Erro Supabase Auth:', error.message);
      
      // Tratamento de erros específicos
      if (error.message.includes('already registered')) {
        return res.status(400).json({ error: 'E-mail já cadastrado.' });
      }
      
      return res.status(500).json({ 
        error: 'Erro ao registrar usuário.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }

    if (!data.user) {
      return res.status(500).json({ error: 'Usuário criado mas dados não retornados.' });
    }

    // ✅ Opcional: Log de Auditoria
    if (logAction) {
      try {
        await logAction(data.user.id, 'REGISTER', `Novo usuário registrado: ${email}`);
      } catch (auditError) {
        console.warn('⚠️ Erro ao registrar log de auditoria:', auditError.message);
        // Não falha o registro se o log falhar
      }
    }

    // Retorna dados do usuário (sem senha)
    const userResponse = {
      id: data.user.id,
      email: data.user.email,
      name: data.user.user_metadata?.name || name,
      role: data.user.user_metadata?.role || 'analyst',
      created_at: data.user.created_at
    };

    res.status(201).json({ 
      message: 'Usuário criado com sucesso!',
      user: userResponse
    });

  } catch (error) {
    console.error('❌ Erro inesperado no registro:', error);
    res.status(500).json({ 
      error: 'Erro interno ao registrar usuário.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Login via Supabase Auth
 * NOTA: O frontend já faz login direto com Supabase, mas mantemos esta rota
 * para compatibilidade e casos especiais (ex: testes, integrações)
 */
exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
  }

  try {
    // ✅ Usa Supabase Auth para login
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) {
      console.error('❌ Erro Supabase Auth login:', error.message);
      
      if (error.message === 'Invalid login credentials') {
        return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
      }
      
      return res.status(500).json({ 
        error: 'Erro ao fazer login.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }

    if (!data.session || !data.user) {
      return res.status(500).json({ error: 'Sessão não criada corretamente.' });
    }

    // Retorna token e dados do usuário
    res.json({
      message: 'Login realizado com sucesso!',
      token: data.session.access_token,
      refreshToken: data.session.refresh_token,
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name || '',
        role: data.user.user_metadata?.role || 'user'
      }
    });

  } catch (error) {
    console.error('❌ Erro inesperado no login:', error);
    res.status(500).json({ 
      error: 'Erro interno ao fazer login.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Refresh Token via Supabase Auth
 */
exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token é obrigatório.' });
  }

  try {
    // ✅ Usa Supabase Auth para refresh
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken
    });

    if (error) {
      console.error('❌ Erro Supabase Auth refresh:', error.message);
      return res.status(401).json({ 
        error: 'Refresh token inválido ou expirado.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }

    if (!data.session) {
      return res.status(500).json({ error: 'Sessão não renovada corretamente.' });
    }

    res.json({
      message: 'Token renovado com sucesso!',
      token: data.session.access_token,
      refreshToken: data.session.refresh_token
    });

  } catch (error) {
    console.error('❌ Erro inesperado no refresh:', error);
    res.status(500).json({ 
      error: 'Erro interno ao renovar token.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
