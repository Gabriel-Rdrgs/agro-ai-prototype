#!/usr/bin/env python3
"""
Script de teste direto do Prophet para diagnosticar problemas.
Execute dentro do container Docker.
"""

import sys
import logging
logging.basicConfig(level=logging.DEBUG, format='%(levelname)s:%(name)s:%(message)s')

print("="*70)
print("🧪 TESTE DIRETO DO PROPHET")
print("="*70)

# 1. Testa importação
print("\n1️⃣ Testando importação do Prophet...")
try:
    from prophet import Prophet
    print("✅ Prophet importado com sucesso")
except Exception as e:
    print(f"❌ Erro ao importar Prophet: {e}")
    sys.exit(1)

# 2. Testa inicialização
print("\n2️⃣ Testando inicialização do Prophet...")
try:
    model = Prophet(
        yearly_seasonality=True,
        weekly_seasonality=True,
        daily_seasonality=False,
        seasonality_mode='multiplicative',
        changepoint_prior_scale=0.05,
        interval_width=0.80
    )
    print("✅ Prophet inicializado com sucesso")
except Exception as e:
    print(f"❌ Erro ao inicializar Prophet: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# 3. Testa serviço
print("\n3️⃣ Testando PriceForecastService...")
try:
    from services.price_forecast import price_forecast_service
    print("✅ Serviço importado")
    
    # Limpa cache
    price_forecast_service._train_prophet_model.cache_clear()
    print("✅ Cache limpo")
    
    # Testa forecast
    result = price_forecast_service.forecast('Tomate', 'SP', 7)
    print(f"\n📊 RESULTADO:")
    print(f"   Modelo: {result.get('forecast_model')}")
    print(f"   Status: {result.get('status')}")
    print(f"   Previsões: {len(result.get('forecast', []))}")
    
    if result.get('forecast'):
        prices = [f['price'] for f in result['forecast']]
        print(f"   Preços: {prices}")
        print(f"   Variação: R$ {max(prices) - min(prices):.2f}")
    
    if result.get('forecast_model') == 'prophet':
        print("\n✅ SUCESSO: Prophet está funcionando!")
    else:
        print("\n⚠️ ATENÇÃO: Ainda usando fallback")
        print(f"   Motivo possível: {result.get('message', 'N/A')}")
        
except Exception as e:
    print(f"❌ Erro ao testar serviço: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n" + "="*70)
print("✅ TESTE CONCLUÍDO")
print("="*70)




