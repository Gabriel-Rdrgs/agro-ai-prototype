# ai-service/scripts/test_prediction.py
from services.market_intelligence import market_service
import logging

logging.basicConfig(level=logging.INFO)

def test_full_intelligence():
    print("\n🔮 Teste Completo: Prophet + Clima + Diesel")
    
    # Simula um cenário de muita chuva (150mm) para ver se o preço reage
    rain_scenario = 150.0 
    
    result = market_service.get_forecast("soja", days=30, rain_forecast_mm=rain_scenario)
    
    if "error" in result:
        print(f"❌ Erro: {result['error']}")
    else:
        print(f"✅ Sucesso!")
        print(f"   Produto: {result['product'].upper()}")
        print(f"   Preço Base (Prophet): R$ {result['base_predicted_price']}")
        print(f"   🌧️ Chuva ({rain_scenario}mm): Impacto de R$ {result['weather_adjustment']['impact']}")
        print(f"   Preço Final: R$ {result['final_predicted_price']}")
        print(f"   🚛 Diesel (Ref): R$ {result['logistics_reference'].get('diesel_price_ref', 'N/A')}")

if __name__ == "__main__":
    test_full_intelligence()