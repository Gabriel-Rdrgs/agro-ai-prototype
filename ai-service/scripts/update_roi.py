# ai-service/scripts/update_roi.py
import sys
import os
import logging
from sqlalchemy import text

# Adiciona o diretório raiz ao path para importar os services
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from services.arbitrage_calculator import arbitrage_calculator
from utils.database import get_engine

# Configuração de Log para ver o que está acontecendo
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def update_database_roi():
    engine = get_engine()
    logger.info("🚀 Iniciando Cálculo Massivo de ROI no Banco de Dados...")
    
    with engine.begin() as conn:
        # 1. Busca todas as oportunidades
        # Importante: Pegamos lat/lng para o cálculo de frete funcionar
        query = text('SELECT id, product, state, city, "buyPrice", lat, lng FROM "Opportunity"')
        opportunities = conn.execute(query).fetchall()
        
        logger.info(f"📦 Processando {len(opportunities)} oportunidades...")
        
        updates = 0
        errors = 0
        
        for opp in opportunities:
            try:
                # Monta o dicionário que a calculadora espera
                opp_dict = {
                    'state': opp.state,
                    'product': opp.product,
                    'buyPrice': float(opp.buyPrice),
                    'lat': float(opp.lat) if opp.lat else 0.0,
                    'lng': float(opp.lng) if opp.lng else 0.0
                }
                
                # --- O CÉREBRO TRABALHA AQUI ---
                # Usa a função que criamos para achar a melhor rota
                best = arbitrage_calculator.find_best_route(opp_dict)
                
                if best:
                    # Atualiza o registro no banco
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
                        "dest_name": best['destination_name'],
                        "sell_price": best['sell_price'],
                        "roi": best['roi'],
                        "freight": best['freight_cost'],
                        "id": opp.id
                    })
                    
                    logger.info(f"✅ ID {opp.id}: {opp.city} -> {best['destination_name']} (ROI: {best['roi']}%)")
                    updates += 1
                else:
                    logger.warning(f"⚠️ ID {opp.id}: Nenhuma rota lucrativa encontrada.")
                    
            except Exception as e:
                logger.error(f"❌ Erro no ID {opp.id}: {e}")
                errors += 1
                
    logger.info(f"\n🏁 FIM! Atualizados: {updates} | Erros: {errors}")

if __name__ == "__main__":
    update_database_roi()