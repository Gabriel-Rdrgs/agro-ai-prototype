// backend/createAdmin.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = 'paulo@agro.com';
  const password = '123456';
  const name = 'Paulo (Sócio)';

  console.log(`🔐 Criando usuário admin: ${email}...`);

  // 1. Criptografar a senha
  const hashedPassword = await bcrypt.hash(password, 10);

  // 2. Criar ou Atualizar o usuário no banco (Upsert evita erro se já existir)
  const user = await prisma.user.upsert({
    where: { email: email },
    update: {}, // Se já existir, não faz nada
    create: {
      email,
      name,
      password: hashedPassword,
      role: 'admin'
    },
  });

  console.log(`✅ Usuário criado com sucesso! ID: ${user.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });