# ai-service/scripts/update_routes.py
import sys
import os
import time
from sqlalchemy import text

# Adiciona o diretório raiz ao path para importar os services
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from services.arbitrage_calculator import arbitrage_calculator
from utils.database import get_engine

def update_all_routes():
    engine = get_engine()
    print("🚀 Iniciando Otimização de Rotas (AI Routing)...")
    
    with engine.begin() as conn:
        # 1. Busca todas as oportunidades
        # Note que pegamos lat/lng como float para o Python não reclamar
        query = text('SELECT id, product, state, city, "buyPrice", lat, lng FROM "Opportunity"')
        opportunities = conn.execute(query).fetchall()
        
        print(f"📦 Processando {len(opportunities)} cargas...")
        
        updates = 0
        for opp in opportunities:
            try:
                # Monta o dicionário que o calculator espera
                opp_dict = {
                    'state': opp.state,
                    'product': opp.product,
                    'buyPrice': float(opp.buyPrice),
                    'lat': float(opp.lat),
                    'lng': float(opp.lng)
                }
                
                # --- A MÁGICA ACONTECE AQUI ---
                # A IA decide o melhor destino
                best_scenario = arbitrage_calculator.find_best_route(opp_dict)
                
                if best_scenario:
                    # Atualiza o banco com a decisão da IA
                    update_query = text("""
                        UPDATE "Opportunity"
                        SET "sellLocation" = :dest_name,
                            "sellPrice" = :sell_price,
                            "roi" = :roi,
                            "freight" = :freight,
                            "bestRoute" = true
                        WHERE id = :id
                    """)
                    
                    conn.execute(update_query, {
                        "dest_name": best_scenario['destination_name'],
                        "sell_price": best_scenario['sell_price'],
                        "roi": best_scenario['roi'],
                        "freight": best_scenario['freight_cost'],
                        "id": opp.id
                    })
                    
                    print(f"✅ ID {opp.id} ({opp.product}): {opp.city} -> {best_scenario['destination_name']} (ROI: {best_scenario['roi']}%)")
                    updates += 1
                    
            except Exception as e:
                print(f"❌ Erro no ID {opp.id}: {e}")
                
    print(f"\n🏁 Concluído! {updates} rotas otimizadas e gravadas.")

if __name__ == "__main__":
    update_all_routes()