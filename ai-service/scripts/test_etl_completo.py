#!/usr/bin/env python3
"""
Script de teste completo do ETL de preços de mercado.

Testa todas as fontes:
- CEASA-PR
- Agrolink
- Outras CEASAs (SP, MG, RJ, RS)
- CONAB

Uso:
    python scripts/test_etl_completo.py
"""

import os
import sys
from datetime import datetime

# Adiciona path para imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from services.data_sync.market_scraper import market_scraper

def test_etl():
    """Executa ETL completo e exibe resultados"""
    
    print("\n" + "="*70)
    print("🧪 TESTE COMPLETO DO ETL DE PREÇOS DE MERCADO")
    print("="*70)
    print(f"⏰ Iniciado em: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    try:
        # Executa ETL completo
        result = market_scraper.run_etl()
        
        print("\n" + "-"*70)
        print("📊 RESULTADOS")
        print("-"*70)
        
        if result['success']:
            print(f"✅ Status: SUCESSO")
            print(f"📦 Registros coletados: {result['records']}")
            print(f"💾 Registros salvos: {result.get('saved', 'N/A')}")
            print(f"📡 Fontes: {', '.join(result['sources'])}")
            print(f"🕐 Timestamp: {result['timestamp']}")
            
            # Análise por fonte
            print("\n" + "-"*70)
            print("📈 ANÁLISE POR FONTE")
            print("-"*70)
            
            sources = result.get('sources', [])
            if 'CEASA-PR' in sources:
                print("✅ CEASA-PR: Dados coletados")
            else:
                print("⚠️ CEASA-PR: Nenhum dado coletado")
            
            if 'Agrolink' in sources:
                print("✅ Agrolink: Dados coletados")
            else:
                print("⚠️ Agrolink: Nenhum dado coletado")
            
            if 'Outras-CEASAs' in sources:
                print("✅ Outras CEASAs: Dados coletados")
            else:
                print("ℹ️ Outras CEASAs: Nenhum dado (normal se portais mudaram)")
            
            if 'CONAB' in sources:
                print("✅ CONAB: Dados coletados")
            else:
                print("⚠️ CONAB: Nenhum dado coletado (portal pode ter mudado)")
            
            print("\n" + "="*70)
            print("✅ TESTE CONCLUÍDO COM SUCESSO!")
            print("="*70 + "\n")
            
        else:
            print(f"❌ Status: FALHA")
            print(f"⚠️ Erro: {result.get('error', 'Desconhecido')}")
            print("\n" + "="*70)
            print("❌ TESTE FALHOU")
            print("="*70 + "\n")
        
        return result
    
    except Exception as e:
        print(f"\n❌ ERRO CRÍTICO: {e}")
        import traceback
        traceback.print_exc()
        return {'success': False, 'error': str(e)}


if __name__ == "__main__":
    test_etl()

