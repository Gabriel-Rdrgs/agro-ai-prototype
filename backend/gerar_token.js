// backend/gerar_token.js
require('dotenv').config();
const jwt = require('jsonwebtoken');

const secret = process.env.JWT_SECRET;
if (!secret) {
    console.error("❌ Erro: JWT_SECRET não encontrado no .env");
    process.exit(1);
}

// Cria um token para o "Robô ETL" que vale por 10 anos
const token = jwt.sign(
    { id: 99999, role: 'admin', name: 'AgroAI Bot' }, 
    secret, 
    { expiresIn: '3650d' }
);

console.log("\n🔑 SEU TOKEN DE SERVIÇO (Copie tudo abaixo):\n");
console.log(token);
console.log("\n------------------------------------------------\n");