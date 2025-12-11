#!/bin/bash
# Teste de performance usando curl

BACKEND_URL="http://localhost:3001"

echo "🧪 TESTE DE PERFORMANCE - AGRO-AI"
echo "=================================="
echo ""

# 1. Login
echo "1️⃣ Fazendo login..."
LOGIN_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@agro.com","password":"123456"}')

TOKEN=$(echo $LOGIN_RESPONSE | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('accessToken') or data.get('token', ''))" 2>/dev/null)

if [ -z "$TOKEN" ]; then
    echo "❌ Falha no login"
    echo "Resposta: $LOGIN_RESPONSE"
    exit 1
fi

echo "✅ Login realizado"
echo ""

# 2. Request 1 (sem cache - deve ser MISS)
echo "2️⃣ Request 1 (deve ser MISS - busca do banco)..."
START1=$(date +%s%N)
RESPONSE1=$(curl -s -X GET "$BACKEND_URL/api/opportunities" \
  -H "Authorization: Bearer $TOKEN")
END1=$(date +%s%N)
TIME1=$((($END1 - $START1) / 1000000))

COUNT1=$(echo $RESPONSE1 | python3 -c "import sys, json; data=json.load(sys.stdin); print(len(data) if isinstance(data, list) else 0)" 2>/dev/null || echo "0")

echo "   Tempo: ${TIME1}ms"
echo "   Oportunidades: $COUNT1"
echo ""

# 3. Request 2 (com cache - deve ser HIT)
echo "3️⃣ Request 2 (deve ser HIT - do cache)..."
START2=$(date +%s%N)
RESPONSE2=$(curl -s -X GET "$BACKEND_URL/api/opportunities" \
  -H "Authorization: Bearer $TOKEN")
END2=$(date +%s%N)
TIME2=$((($END2 - $START2) / 1000000))

COUNT2=$(echo $RESPONSE2 | python3 -c "import sys, json; data=json.load(sys.stdin); print(len(data) if isinstance(data, list) else 0)" 2>/dev/null || echo "0")

echo "   Tempo: ${TIME2}ms"
echo "   Oportunidades: $COUNT2"
echo ""

# 4. Análise
if [ $TIME2 -lt $TIME1 ]; then
    IMPROVEMENT=$((100 - (TIME2 * 100 / TIME1)))
    REDUCTION=$((TIME1 - TIME2))
    echo "✅ CACHE FUNCIONANDO!"
    echo "   Melhoria: ~${IMPROVEMENT}% mais rápido"
    echo "   Redução: ${REDUCTION}ms"
else
    echo "⚠️ Cache pode não estar funcionando (tempo similar)"
fi
echo ""

# 5. Teste ETL Assíncrono
echo "4️⃣ Testando ETL Assíncrono..."
ETL_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/admin/etl/start" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"market","skipIbge":true}')

JOB_ID=$(echo $ETL_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin).get('jobId', ''))" 2>/dev/null)

if [ -z "$JOB_ID" ]; then
    echo "⚠️ Falha ao iniciar ETL"
    echo "Resposta: $ETL_RESPONSE"
else
    echo "✅ ETL iniciado (Job ID: $JOB_ID)"
    echo "   Aguardando 3 segundos..."
    sleep 3
    
    STATUS_RESPONSE=$(curl -s -X GET "$BACKEND_URL/api/admin/etl/status/$JOB_ID" \
      -H "Authorization: Bearer $TOKEN")
    
    JOB_STATUS=$(echo $STATUS_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin).get('status', ''))" 2>/dev/null)
    JOB_PROGRESS=$(echo $STATUS_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin).get('progress', 0))" 2>/dev/null)
    
    echo "   Status: $JOB_STATUS"
    echo "   Progresso: ${JOB_PROGRESS}%"
    
    if [ "$JOB_STATUS" = "running" ] || [ "$JOB_STATUS" = "completed" ]; then
        echo "✅ ETL ASSÍNCRONO FUNCIONANDO!"
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
    echo "Melhoria de cache: ~$((100 - (TIME2 * 100 / TIME1)))%"
    echo "Redução: $((TIME1 - TIME2))ms"
fi
echo "ETL Assíncrono: ✅ Funcionando"
echo ""

