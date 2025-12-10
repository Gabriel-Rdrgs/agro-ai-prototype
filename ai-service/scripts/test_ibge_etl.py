# ai-service/scripts/test_ibge_etl.py
"""
Script para testar ETL IBGE (dados de produção agrícola).
"""

import sys
import os
from datetime import datetime

# Adiciona path para imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from services.data_sync.ibge_scraper import ibge_scraper
import logging

logging.basicConfig(level=logging.INFO)


def test_ibge_etl():
    """Testa ETL IBGE completo."""
    print("\n" + "="*60)
    print("🧪 TESTE ETL IBGE (PRODUÇÃO AGRÍCOLA)")
    print("="*60)
    print(f"⏰ Iniciado em: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    try:
        # Testa busca de um produto específico
        print("📊 Testando busca de Tomate (2024)...")
        tomate_data = ibge_scraper.fetch_production_data('Tomate', year=2024)
        print(f"   ✅ Tomate: {len(tomate_data)} registros coletados")
        
        if tomate_data:
            print(f"   📋 Exemplo: {tomate_data[0]}")
        
        print("\n📊 Testando busca de Soja (2024)...")
        soja_data = ibge_scraper.fetch_production_data('Soja', year=2024)
        print(f"   ✅ Soja: {len(soja_data)} registros coletados")
        
        print("\n📊 Testando busca de Milho (2024)...")
        milho_data = ibge_scraper.fetch_production_data('Milho', year=2024)
        print(f"   ✅ Milho: {len(milho_data)} registros coletados")
        
        # Testa ETL completo
        print("\n" + "-"*60)
        print("🚀 Executando ETL completo (último ano)...")
        print("-"*60)
        
        result = ibge_scraper.run_etl(years_back=1)
        
        print("\n" + "-"*60)
        print("📊 RESULTADOS")
        print("-"*60)
        print(f"✅ Status: {'SUCESSO' if result['success'] else 'ERRO'}")
        print(f"📦 Registros coletados: {result['records']}")
        print(f"💾 Registros salvos: {result['saved']}")
        print(f"📡 Fonte: {result['source']}")
        print(f"🕐 Timestamp: {result.get('timestamp', 'N/A')}")
        
        if not result['success']:
            print(f"❌ Erro: {result.get('error', 'Unknown')}")
        
        print("\n" + "="*60)
        print("✅ TESTE CONCLUÍDO!")
        print("="*60 + "\n")
        
        return result
        
    except Exception as e:
        print(f"\n❌ ERRO CRÍTICO: {e}")
        import traceback
        traceback.print_exc()
        return {'success': False, 'error': str(e)}


if __name__ == "__main__":
    test_ibge_etl()
