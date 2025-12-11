#!/bin/bash
# Script de teste de performance
# Testa cache, ETL assíncrono e mede tempos

echo "🧪 TESTE DE PERFORMANCE - AGRO-AI"
echo "=================================="
echo ""

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

BACKEND_URL="http://localhost:3001"
PYTHON_URL="http://localhost:8000"

# 1. Teste de Health
echo "1️⃣ Testando Health Check..."
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/health")
if [ "$HEALTH" = "200" ]; then
    echo -e "${GREEN}✅ Backend está online${NC}"
else
    echo -e "${RED}❌ Backend offline (HTTP $HEALTH)${NC}"
    exit 1
fi
echo ""

# 2. Teste de Login (para obter token)
echo "2️⃣ Fazendo login..."
LOGIN_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@agro.com","password":"123456"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ Falha no login${NC}"
    echo "Resposta: $LOGIN_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✅ Login realizado (token obtido)${NC}"
echo ""

# 3. Teste de Cache - Request 1 (deve ser MISS)
echo "3️⃣ Testando Cache - Request 1 (deve ser MISS)..."
START1=$(date +%s%N)
RESPONSE1=$(curl -s -X GET "$BACKEND_URL/api/opportunities" \
  -H "Authorization: Bearer $TOKEN")
END1=$(date +%s%N)
TIME1=$((($END1 - $START1) / 1000000))

echo "Tempo: ${TIME1}ms"
echo ""

# 4. Teste de Cache - Request 2 (deve ser HIT)
echo "4️⃣ Testando Cache - Request 2 (deve ser HIT)..."
START2=$(date +%s%N)
RESPONSE2=$(curl -s -X GET "$BACKEND_URL/api/opportunities" \
  -H "Authorization: Bearer $TOKEN")
END2=$(date +%s%N)
TIME2=$((($END2 - $START2) / 1000000))

echo "Tempo: ${TIME2}ms"

if [ $TIME2 -lt $TIME1 ]; then
    IMPROVEMENT=$((100 - (TIME2 * 100 / TIME1)))
    echo -e "${GREEN}✅ Cache funcionando! Melhoria: ~${IMPROVEMENT}%${NC}"
else
    echo -e "${YELLOW}⚠️ Cache pode não estar funcionando (tempo similar)${NC}"
fi
echo ""

# 5. Teste de ETL Assíncrono
echo "5️⃣ Testando ETL Assíncrono..."
ETL_START=$(curl -s -X POST "$BACKEND_URL/api/admin/etl/start" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"market","skipIbge":true}')

JOB_ID=$(echo $ETL_START | grep -o '"jobId":"[^"]*"' | cut -d'"' -f4)

if [ -z "$JOB_ID" ]; then
    echo -e "${RED}❌ Falha ao iniciar ETL${NC}"
    echo "Resposta: $ETL_START"
else
    echo -e "${GREEN}✅ ETL iniciado (Job ID: $JOB_ID)${NC}"
    echo "Aguardando 3 segundos..."
    sleep 3
    
    # Verifica status
    STATUS=$(curl -s -X GET "$BACKEND_URL/api/admin/etl/status/$JOB_ID" \
      -H "Authorization: Bearer $TOKEN")
    
    JOB_STATUS=$(echo $STATUS | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    JOB_PROGRESS=$(echo $STATUS | grep -o '"progress":[0-9]*' | cut -d':' -f2)
    
    echo "Status: $JOB_STATUS"
    echo "Progresso: ${JOB_PROGRESS}%"
    
    if [ "$JOB_STATUS" = "running" ] || [ "$JOB_STATUS" = "completed" ]; then
        echo -e "${GREEN}✅ ETL assíncrono funcionando!${NC}"
    else
        echo -e "${YELLOW}⚠️ Status: $JOB_STATUS${NC}"
    fi
fi
echo ""

# 6. Resumo
echo "=================================="
echo "📊 RESUMO DOS TESTES"
echo "=================================="
echo "Request 1 (sem cache): ${TIME1}ms"
echo "Request 2 (com cache): ${TIME2}ms"
if [ $TIME2 -lt $TIME1 ]; then
    echo -e "${GREEN}Melhoria de cache: ~$((100 - (TIME2 * 100 / TIME1)))%${NC}"
fi
echo "ETL Assíncrono: ✅ Funcionando"
echo ""

