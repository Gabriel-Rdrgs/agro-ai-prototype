# backend/Dockerfile

# Troca: De 'alpine' (leve/problemático) para 'slim' (Debian leve/robusto)
FROM node:18-slim

# Instala bibliotecas de sistema necessárias para o Prisma + OpenSSL
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

# Gera o cliente do banco
RUN npx prisma generate

COPY . .

EXPOSE 3001

CMD ["npm", "start"]