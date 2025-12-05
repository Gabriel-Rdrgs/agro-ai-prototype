# Dockerfile de Produção para o Backend Node.js
FROM node:18-alpine

WORKDIR /app

# 1. Instala OpenSSL (Obrigatório para o Prisma rodar no Alpine Linux)
RUN apk add --no-cache openssl libc6-compat

# 2. Copia arquivos de dependência
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# 3. Instala dependências (modo limpo)
RUN npm ci

# 4. Gera o Prisma Client
RUN npx prisma generate

# 5. Copia o resto do código
COPY . .

# 6. Expõe a porta
EXPOSE 3001
CMD ["npm", "start"]