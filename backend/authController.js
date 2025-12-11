// backend/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto'); // Nativo do Node, para gerar tokens aleatórios
const prisma = require('./utils/prisma');
const { dbCircuitBreaker } = require('./utils/circuitBreaker');
const { logAction } = require('./services/auditService');
const { getCachedUser, invalidateUserCache } = require('./utils/authCache');
// O CÓDIGO NOVO (SEGURO - TIPO SÉNIOR) ✅
const SECRET_KEY = process.env.JWT_SECRET;

// Se a chave não existir no .env, o servidor para e avisa no terminal
if (!SECRET_KEY) {
  console.error("❌ ERRO CRÍTICO: A variável JWT_SECRET não foi encontrada no .env!");
  process.exit(1); // Encerra o servidor imediatamente para segurança
}
// Função auxiliar para gerar o Token de Acesso (Curta Duração)
function generateAccessToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    SECRET_KEY,
    { expiresIn: '15m' } // Expira rápido para segurança
  );
}

exports.register = async (req, res) => {
  // 1. REMOVEMOS 'role' da extração. Se o hacker mandar, a gente ignora.
  const { name, email, password } = req.body; 

  try {
    // ✅ NOVO: Usa cache para verificar se usuário existe
    const existingUser = await getCachedUser(email, prisma);
    if (existingUser) return res.status(400).json({ error: 'E-mail já cadastrado.' });

    const hashedPassword = await bcrypt.hash(password, 10);

    // 2. FORÇAMOS o cargo 'analyst'. Segurança "Hardcoded".
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'analyst' // <--- AQUI ESTÁ A TRAVA DE SEGURANÇA 🔒
      }
    });
    
    // ✅ NOVO: Cache o novo usuário para evitar query imediata
    const cache = require('./utils/cache');
    cache.set(`user:${user.email}`, {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      password: user.password // Cache temporário para login
    }, 300);

    // Opcional: Log de Auditoria
    // if (logAction) await logAction(user.id, 'REGISTER', 'Novo usuário registrado via Web'); 

    const { password: _, ...userWithoutPassword } = user;
    res.status(201).json({ message: 'Usuário criado!', user: userWithoutPassword });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao registrar usuário.' });
  }
};

// backend/authController.js

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // ✅ Usa Cache + Circuit Breaker para reduzir carga no Supabase
    let user;
    try {
      // Adiciona timeout explícito para evitar travamentos
      user = await Promise.race([
        dbCircuitBreaker.execute(async () => {
          // ✅ NOVO: Usa cache agressivo para reduzir queries ao banco
          return await getCachedUser(email, prisma);
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout: Conexão com banco demorou mais de 10s')), 10000)
        )
      ]);
    } catch (dbError) {
      // Log detalhado do erro para diagnóstico
      console.error('❌ Erro no Circuit Breaker:', {
        message: dbError.message,
        code: dbError.code,
        name: dbError.name,
        stack: dbError.stack?.split('\n').slice(0, 3).join('\n')
      });
      
      // Se for erro de conexão/pool, tenta retry com backoff exponencial
      if (dbError.message?.includes("Can't reach database server") || 
          dbError.message?.includes("timeout") ||
          dbError.message?.includes("pool") ||
          dbError.message?.includes("Server has closed the connection") ||
          dbError.code === 'P1001' || // Connection error
          dbError.code === 'P1000' || // Authentication error
          dbError.code === 'P1017') { // Server closed connection
        
        console.log('🔄 Erro de conexão detectado, tentando retry com backoff...');
        
        // Retry com backoff exponencial (até 3 tentativas)
        let retrySuccess = false;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const backoffDelay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // 1s, 2s, 4s (max 5s)
            console.log(`⏳ Tentativa ${attempt}/3 após ${backoffDelay}ms...`);
            
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
            
            // Tenta a query novamente usando cache (sem desconectar/reconectar para não esgotar pool)
            user = await getCachedUser(email, prisma);
            retrySuccess = true;
            console.log(`✅ Retry bem-sucedido na tentativa ${attempt}`);
            break;
          } catch (retryError) {
            console.warn(`⚠️ Retry ${attempt}/3 falhou: ${retryError.message?.substring(0, 60)}`);
            if (attempt === 3) {
              // Última tentativa falhou
              throw new Error('Serviço de banco de dados temporariamente indisponível. Tente novamente em alguns instantes.');
            }
          }
        }
        
        if (!retrySuccess) {
          throw new Error('Não foi possível conectar ao banco de dados após múltiplas tentativas.');
        }
      } else {
        throw dbError;
      }
    }
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    // 1. Gera o Token de Acesso
    const accessToken = generateAccessToken(user);

    // 2. Gera o Refresh Token
    const refreshToken = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // 3. Salva o Refresh Token no banco (com circuit breaker + retry)
    try {
      await dbCircuitBreaker.execute(async () => {
        // Retry com backoff para refreshToken (conexão pode ter sido fechada)
        let retrySuccess = false;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            await prisma.refreshToken.create({
              data: {
                token: refreshToken,
                userId: user.id,
                expiresAt: expiresAt
              }
            });
            retrySuccess = true;
            break;
          } catch (tokenError) {
            // Se for erro de conexão fechada (P1017), tenta reconectar
            if (tokenError.code === 'P1017' || 
                tokenError.message?.includes('Server has closed the connection') ||
                tokenError.message?.includes("Can't reach database")) {
              
              if (attempt < 3) {
                const backoffDelay = Math.min(500 * attempt, 2000); // 500ms, 1000ms, 2000ms
                console.log(`🔄 Retry refreshToken (${attempt}/3) após ${backoffDelay}ms...`);
                await new Promise(resolve => setTimeout(resolve, backoffDelay));
                
                // Tenta reconectar se necessário
                try {
                  await prisma.$connect();
                } catch (reconnectErr) {
                  // Ignora erro de reconexão se já estiver conectado
                }
                continue;
              }
            }
            throw tokenError;
          }
        }
        
        if (!retrySuccess) {
          throw new Error('Não foi possível salvar refresh token após múltiplas tentativas');
        }
      });
    } catch (tokenError) {
      // Se falhar ao salvar refresh token, ainda permite login (mas sem refresh token)
      console.error('⚠️ Erro ao salvar refresh token (login continua):', tokenError.message);
      // Não bloqueia o login, apenas não terá refresh token
    }

    // 4. RASTREABILIDADE (O Novo Log) ✅
    // Importante: Fazemos isso ANTES de responder, ou em paralelo, mas nunca duplicamos a resposta.
    await logAction(user.id, 'LOGIN', `Login realizado via Web. Role: ${user.role}`);

    // 5. Resposta Final (ÚNICA VEZ) 🏁
    res.json({
      message: 'Login realizado!',
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });

  } catch (error) {
    console.error("Erro no Login:", error);
    // Verificação extra: Se o erro for de "headers sent", não tentamos responder de novo para não poluir o log
    if (!res.headersSent) {
        res.status(500).json({ error: 'Erro ao realizar login.' });
    }
  }
};

exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) return res.status(401).json({ error: 'Refresh Token não fornecido.' });

  try {
    // 1. Procura esse token no banco
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true } // Já traz os dados do dono do token
    });

    // 2. Validações de segurança
    if (!storedToken) {
      return res.status(403).json({ error: 'Token inválido (não encontrado).' });
    }

    if (storedToken.expiresAt < new Date()) {
      // Se venceu, apaga do banco para limpar
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      return res.status(403).json({ error: 'Sessão expirada. Faça login novamente.' });
    }

    // 3. Tudo certo? Gera um novo Crachá (Access Token)
    const newAccessToken = generateAccessToken(storedToken.user);

    res.json({ accessToken: newAccessToken });

  } catch (error) {
    console.error("Erro no Refresh:", error);
    res.status(500).json({ error: 'Erro ao renovar token.' });
  }
};