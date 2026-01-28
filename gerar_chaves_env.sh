#!/bin/bash

# Script para gerar chaves secretas para os arquivos .env
# Uso: ./gerar_chaves_env.sh

echo "🔐 Gerador de Chaves Secretas para .env"
echo "========================================"
echo ""

# Verifica se openssl está instalado
if ! command -v openssl &> /dev/null; then
    echo "❌ Erro: openssl não está instalado."
    echo "   Instale com: sudo apt-get install openssl"
    exit 1
fi

echo "📝 Gerando chaves..."
echo ""

# Gera JWT_SECRET
JWT_SECRET=$(openssl rand -base64 32)
echo "✅ JWT_SECRET gerado:"
echo "   $JWT_SECRET"
echo ""

# Gera INTERNAL_API_KEY
INTERNAL_API_KEY=$(openssl rand -base64 32)
echo "✅ INTERNAL_API_KEY gerado:"
echo "   $INTERNAL_API_KEY"
echo ""

echo "========================================"
echo "📋 Use estas chaves nos seus arquivos .env:"
echo ""
echo "Backend (.env):"
echo "JWT_SECRET=$JWT_SECRET"
echo "INTERNAL_API_KEY=$INTERNAL_API_KEY"
echo ""
echo "AI Service (.env):"
echo "INTERNAL_API_KEY=$INTERNAL_API_KEY"
echo ""
echo "========================================"
echo "💡 Dica: Copie e cole essas linhas diretamente nos seus arquivos .env"
echo ""
















