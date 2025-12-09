#!/bin/bash
# Script para corrigir instalação do Prophet

echo "🔧 Corrigindo instalação do Prophet..."

# Ativa venv se existir
if [ -d "venv" ]; then
    source venv/bin/activate
fi

echo "1️⃣ Reinstalando cmdstanpy..."
pip install --upgrade cmdstanpy

echo "2️⃣ Instalando CmdStan..."
python -c "from cmdstanpy import install_cmdstan; install_cmdstan(verbose=True)"

echo "3️⃣ Reinstalando Prophet..."
pip install --upgrade prophet

echo "✅ Concluído! Teste com:"
echo "   python -c \"from services.price_forecast import price_forecast_service; result = price_forecast_service.forecast('Tomate', 'SP', 30); print('Status:', result['status'])\""

