#!/bin/bash
# Script para testar endpoints de projeções

BACKEND_URL="http://localhost:3001"
AI_SERVICE_URL="http://localhost:8000"

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🧪 TESTANDO ENDPOINTS DE PROJEÇÕES${NC}\n"

# Solicita credenciais
read -p "Email: " EMAIL
read -sp "Senha: " PASSWORD
echo ""

# 1. Login
echo -e "${YELLOW}1️⃣ Fazendo login...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Erro ao fazer login${NC}"
  echo "Response: $LOGIN_RESPONSE"
  echo ""
  echo "💡 Dica: Para criar um usuário, execute:"
  echo "   cd backend && node createAdmin.js"
  exit 1
fi

echo -e "${GREEN}✅ Login realizado!${NC}\n"

# 2. Testar histórico
echo -e "${YELLOW}2️⃣ GET /api/ceasa/historical?product=Tomate&limit=3${NC}"
HIST_RESPONSE=$(curl -s -X GET "$BACKEND_URL/api/ceasa/historical?product=Tomate&limit=3" \
  -H "Authorization: Bearer $TOKEN")
echo "$HIST_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$HIST_RESPONSE"
echo ""

# 3. Testar projeções
echo -e "${YELLOW}3️⃣ GET /api/ceasa/projections?product=Tomate&limit=3${NC}"
PROJ_RESPONSE=$(curl -s -X GET "$BACKEND_URL/api/ceasa/projections?product=Tomate&limit=3" \
  -H "Authorization: Bearer $TOKEN")
echo "$PROJ_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$PROJ_RESPONSE"
echo ""

# 4. Testar comparação
echo -e "${YELLOW}4️⃣ GET /api/ceasa/compare/Tomate${NC}"
COMPARE_RESPONSE=$(curl -s -X GET "$BACKEND_URL/api/ceasa/compare/Tomate" \
  -H "Authorization: Bearer $TOKEN")
echo "$COMPARE_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$COMPARE_RESPONSE"
echo ""

# 5. Testar validação Python
echo -e "${YELLOW}5️⃣ GET /api/v1/projections/compare/Tomate (Python)${NC}"
VALIDATE_RESPONSE=$(curl -s -X GET "$AI_SERVICE_URL/api/v1/projections/compare/Tomate?region=SP")
echo "$VALIDATE_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$VALIDATE_RESPONSE"
echo ""

# 6. Testar alertas
echo -e "${YELLOW}6️⃣ GET /api/v1/projections/alerts${NC}"
ALERTS_RESPONSE=$(curl -s -X GET "$AI_SERVICE_URL/api/v1/projections/alerts")
echo "$ALERTS_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$ALERTS_RESPONSE"
echo ""

echo -e "${GREEN}✅ Testes concluídos!${NC}"
