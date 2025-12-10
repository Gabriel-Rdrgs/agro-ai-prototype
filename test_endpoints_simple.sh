#!/bin/bash
# Script simplificado para testar endpoints

BACKEND_URL="http://localhost:3001"
AI_SERVICE_URL="http://localhost:8000"

echo "🧪 TESTANDO ENDPOINTS DE PROJEÇÕES"
echo "=================================="
echo ""

# 1. Verificar se servidores estão rodando
echo "1️⃣ Verificando servidores..."
if curl -s "$BACKEND_URL/health" > /dev/null 2>&1; then
  echo "✅ Backend rodando em $BACKEND_URL"
else
  echo "❌ Backend não está respondendo em $BACKEND_URL"
  exit 1
fi

if curl -s "$AI_SERVICE_URL/health" > /dev/null 2>&1; then
  echo "✅ AI Service rodando em $AI_SERVICE_URL"
else
  echo "⚠️ AI Service não está respondendo (pode estar ok se não tiver /health)"
fi

echo ""

# 2. Tentar fazer login (precisa de email/senha válidos)
echo "2️⃣ Fazendo login..."
echo "   (Você precisa ter um usuário criado)"
echo ""
echo "   Para criar um usuário, execute:"
echo "   cd backend && node createAdmin.js"
echo ""
read -p "   Email do usuário: " EMAIL
read -sp "   Senha: " PASSWORD
echo ""

LOGIN_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Erro ao fazer login"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Login realizado com sucesso!"
echo ""

# 3. Testar endpoints
echo "3️⃣ Testando endpoints..."
echo ""

echo "📅 GET /api/ceasa/historical?product=Tomate&limit=3"
curl -s -X GET "$BACKEND_URL/api/ceasa/historical?product=Tomate&limit=3" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool 2>/dev/null || echo "Response:"
echo ""

echo "🔮 GET /api/ceasa/projections?product=Tomate&limit=3"
curl -s -X GET "$BACKEND_URL/api/ceasa/projections?product=Tomate&limit=3" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool 2>/dev/null || echo "Response:"
echo ""

echo "⚖️ GET /api/ceasa/compare/Tomate"
curl -s -X GET "$BACKEND_URL/api/ceasa/compare/Tomate" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool 2>/dev/null || echo "Response:"
echo ""

echo "📊 GET /api/v1/projections/compare/Tomate (Python)"
curl -s -X GET "$AI_SERVICE_URL/api/v1/projections/compare/Tomate?region=SP" | python3 -m json.tool 2>/dev/null || echo "Response:"
echo ""

echo "✅ Testes concluídos!"
