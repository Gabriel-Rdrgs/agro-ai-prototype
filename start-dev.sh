#!/usr/bin/env bash

echo "==========================================="
echo " AGRO-ARBITRAGE AI - INICIANDO SISTEMA"
echo "==========================================="
echo

# 1. Sobe containers (Node + Python) em background
echo "[1/3] Subindo containers (Node + Python)..."
docker compose up -d

# 2. Mostra logs do backend (ajusta o nome do service se precisar)
echo "[2/3] Mostrando logs do backend (CTRL+C para sair dos logs, containers continuam rodando)..."
docker compose logs -f --tail=50 backend &

# 3. Inicia o frontend React
echo "[3/3] Iniciando Frontend React..."
cd frontend
npm start
