import requests
import pandas as pd
from datetime import datetime, timedelta
from sqlalchemy import create_engine, text

# --- CONFIGURAÇÃO ---
# Conexão direta (sem pgbouncer) para o Python não reclamar
DATABASE_URL="postgresql://postgres.jiyqrxgyopytqvctdvir:ZC9BPp3AhUxtth1R@aws-0-us-west-2.pooler.supabase.com:6543/postgres"
engine = create_engine(DATABASE_URL)

def get_advanced_agrometeo(lat, lng):
    """
    Busca dados complexos: Radiação Solar, Umidade do Solo, Evapotranspiração.
    """
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lng,
        "daily": ["temperature_2m_max", "precipitation_sum", "shortwave_radiation_sum"],
        "hourly": "relative_humidity_2m",
        "timezone": "America/Sao_Paulo",
        "past_days": 7
    }
    
    try:
        response = requests.get(url, params=params)
        data = response.json()
        
        daily = data.get('daily', {})
        hourly = data.get('hourly', {})
        
        avg_radiation = sum(daily['shortwave_radiation_sum']) / len(daily['shortwave_radiation_sum'])
        total_rain = sum(daily['precipitation_sum'])
        avg_humidity = sum(hourly['relative_humidity_2m']) / len(hourly['relative_humidity_2m'])
        
        return {
            "radiation_mj": round(avg_radiation, 2),
            "rain_mm": round(total_rain, 2),
            "humidity_pct": round(avg_humidity, 1)
        }
    except Exception as e:
        print(f"⚠️ Erro na API Climática: {e}")
        return None

def calculate_tomato_risk(meteo_data):
    """
    Regras de Risco Agronômico para Tomate
    """
    risk_score = 0
    reasons = []

    # 1. Excesso de Chuva (Apodrecimento)
    if meteo_data['rain_mm'] > 80:
        risk_score += 0.4
        reasons.append("Excesso de Chuva (>80mm)")
    elif meteo_data['rain_mm'] > 50:
        risk_score += 0.2
        reasons.append("Chuva Moderada")

    # 2. Alta Umidade (Fungos)
    if meteo_data['humidity_pct'] > 85:
        risk_score += 0.3
        reasons.append("Umidade Alta (Risco Fúngico)")

    # 3. Baixa Radiação (Maturação)
    if meteo_data['radiation_mj'] < 15: 
        risk_score += 0.2
        reasons.append("Baixa Insolação")

    return min(risk_score, 1.0), ", ".join(reasons)

def update_market_prices():
    print("🍅 INICIANDO INTELIGÊNCIA DE TOMATE (COM FAXINA AUTOMÁTICA)...")
    
    with engine.connect() as connection:
        print("📡 Buscando cidades monitoradas no Banco de Dados...")
        locations_query = text('SELECT id, city, state, lat, lng, "buyPrice", "sellPrice" FROM "Opportunity" WHERE product = \'Tomate\'')
        result_locations = connection.execute(locations_query)
        
        cities_to_scan = result_locations.fetchall()
        print(f"🗺️ Encontrados {len(cities_to_scan)} polos produtores.\n")

        try:
            for row in cities_to_scan:
                city = row.city
                state = row.state
                lat = row.lat
                lng = row.lng
                current_buy = float(row.buyPrice)
                current_sell = float(row.sellPrice)
                opp_id = row.id 

                current_margin = current_sell / current_buy if current_buy > 0 else 1.35
                
                print(f"📍 Analisando: {city} ({state})...")
                
                data = get_advanced_agrometeo(lat, lng)
                
                if data:
                    risk, reasons = calculate_tomato_risk(data)
                    
                    base_ref_price = 4.00 
                    scarcity_multiplier = 1 + risk 
                    
                    new_buy_price = round(base_ref_price * scarcity_multiplier, 2)
                    new_sell_price = round(new_buy_price * current_margin, 2)
                    
                    risk_level = 1
                    if risk > 0.2: risk_level = 2
                    if risk > 0.5: risk_level = 3

                    status_icon = "🟢" if risk == 0 else "🔴" if risk > 0.4 else "🟡"
                    print(f"   {status_icon} Clima: {data['rain_mm']}mm chuva | {data['radiation_mj']}MJ sol")
                    if reasons: print(f"   ⚠️ Alerta: {reasons}")
                    print(f"   💰 Preço: R$ {new_buy_price} -> Venda: R$ {new_sell_price}")

                    # 1. ATUALIZA OPORTUNIDADE
                    update_query = text("""
                        UPDATE "Opportunity"
                        SET "buyPrice" = :buy, 
                            "sellPrice" = :sell,
                            "riskLevel" = :risk_lvl,
                            "climate" = :climate_desc,
                            "description" = :desc
                        WHERE id = :id
                    """)
                    
                    connection.execute(update_query, {
                        "buy": new_buy_price,
                        "sell": new_sell_price,
                        "risk_lvl": risk_level,
                        "climate_desc": f"Chuva: {data['rain_mm']}mm",
                        "desc": f"Risco Climático: {reasons}" if reasons else "Condições Favoráveis",
                        "id": opp_id
                    })

                    # 2. GRAVA HISTÓRICO (Hoje)
                    history_query = text("""
                        INSERT INTO "PriceHistory" ("opportunityId", "price", "createdAt")
                        VALUES (:opp_id, :price, NOW())
                    """)
                    
                    connection.execute(history_query, {
                        "opp_id": opp_id,
                        "price": new_buy_price
                    })
            
            # --- 3. O FAXINEIRO (RETENTION POLICY) ---
            # Remove tudo que for mais velho que 6 meses (180 dias)
            print("\n🧹 Executando limpeza de dados antigos...")
            cleanup_query = text("""
                DELETE FROM "PriceHistory" 
                WHERE "createdAt" < NOW() - INTERVAL '180 days'
            """)
            result_clean = connection.execute(cleanup_query)
            print(f"🗑️ Registros expirados removidos: {result_clean.rowcount}")

            connection.commit()
            print("\n✅ CICLO COMPLETO: Atualização + Histórico + Limpeza!")
            
        except Exception as e:
            connection.rollback()
            print(f"❌ Erro crítico: {e}")

if __name__ == "__main__":
    update_market_prices()