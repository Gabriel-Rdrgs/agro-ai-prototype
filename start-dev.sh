#!/usr/bin/env bash

echo "🚀 Iniciando ambiente de desenvolvimento Agro-AI..."

# 1) AI service (Python)
cd "$(dirname "$0")/ai-service"
source venv/bin/activate
uvicorn main:app --reload &
AI_PID=$!
echo "🧠 AI service rodando (PID $AI_PID)"

# 2) Backend (Node)
cd ../backend
nvm use --lts >/dev/null 2>&1
npm run dev &
BACKEND_PID=$!
echo "🌐 Backend rodando (PID $BACKEND_PID)"

# 3) Frontend (se quiser ligar junto)
cd ../frontend
nvm use --lts >/dev/null 2>&1
npm run dev &
FRONT_PID=$!
echo "📊 Frontend rodando (PID $FRONT_PID)"

echo ""
echo "✅ Tudo iniciado. Para encerrar, use: kill $AI_PID $BACKEND_PID $FRONT_PID"
wait
