// backend/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto'); // Nativo do Node, para gerar tokens aleatórios
const { PrismaClient } = require('@prisma/client');
const { logAction } = require('./services/auditService');

const prisma = new PrismaClient();
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
    const existingUser = await prisma.user.findUnique({ where: { email } });
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
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    // 1. Gera o Token de Acesso
    const accessToken = generateAccessToken(user);

    // 2. Gera o Refresh Token
    const refreshToken = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // 3. Salva o Refresh Token no banco
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: expiresAt
      }
    });

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