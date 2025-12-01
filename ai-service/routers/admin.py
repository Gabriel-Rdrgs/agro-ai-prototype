# routers/admin.py
"""
Rotas administrativas e utilitárias.
Endpoints: /admin/*
"""

from fastapi import APIRouter, HTTPException, Query
from datetime import datetime
from typing import Optional
import logging

from services.climate.risk_analyzer import market_price_updater
from services.data_sync.market_scraper import market_scraper
from utils.cache import global_cache
from utils.database import test_connection, get_engine
from sqlalchemy import text
import pandas as pd

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post('/cache/clear')
def clear_cache():
    """
    🧹 Limpa cache em memória.
    """
    try:
        size_before = global_cache.size()
        global_cache.clear()
        
        logger.info(f"🧹 Cache limpo ({size_before} itens removidos)")
        
        return {
            'status': 'success',
            'items_cleared': size_before,
            'timestamp': datetime.now().isoformat()
        }
    
    except Exception as e:
        logger.error(f"❌ Erro ao limpar cache: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get('/cache/stats')
def get_cache_stats():
    """
    📊 Estatísticas do cache.
    """
    return {
        'size': global_cache.size(),
        'ttl_seconds': global_cache.ttl.total_seconds(),
        'timestamp': datetime.now().isoformat()
    }


@router.post('/etl/market-prices')
def run_market_etl():
    """
    🚜 Executa ETL de preços de mercado (CEASA + Agrolink).
    """
    try:
        logger.info("🚜 Iniciando ETL de mercado...")
        
        result = market_scraper.run_etl()
        
        if result['success']:
            return {
                'status': 'success',
                'message': 'ETL concluído com sucesso',
                'records': result['records'],
                'sources': result['sources'],
                'timestamp': result['timestamp']
            }
        else:
            return {
                'status': 'warning',
                'message': 'ETL concluído com avisos',
                'error': result.get('error'),
                'timestamp': datetime.now().isoformat()
            }
    
    except Exception as e:
        logger.error(f"❌ Erro no ETL: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post('/etl/update-tomato-prices')
def update_tomato_prices():
    """
    🍅 Atualiza preços de tomate baseado em clima (Robô IA).
    """
    try:
        logger.info("🍅 Iniciando atualização climática de preços...")
        
        result = market_price_updater.update_tomato_prices()
        
        if 'error' in result:
            raise HTTPException(status_code=500, detail=result['error'])
        
        return {
            'status': 'success',
            'message': 'Preços de tomate atualizados',
            'locations_updated': result['locations_updated'],
            'average_risk': result['average_risk'],
            'timestamp': result['timestamp']
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erro na atualização: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post('/seed-history')
def seed_history_data(
    days: int = Query(default=180, ge=30, le=730, description="Dias de histórico")
):
    """
    🌱 Gera histórico sintético de preços.
    
    **Atenção:** Apaga dados existentes!
    """
    try:
        logger.info(f"🌱 Gerando histórico de {days} dias...")
        
        # Chama o script de backfill (via import)
        from scripts.backfill_history import generate_price_history
        
        generate_price_history(days_back=days)
        
        return {
            'status': 'success',
            'message': f'Histórico de {days} dias gerado',
            'timestamp': datetime.now().isoformat()
        }
    
    except Exception as e:
        logger.error(f"❌ Erro ao gerar histórico: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get('/database/test')
def test_database():
    """
    🔌 Testa conexão com banco de dados.
    """
    is_connected = test_connection()
    
    if is_connected:
        return {
            'status': 'connected',
            'message': 'Conexão com banco de dados OK',
            'timestamp': datetime.now().isoformat()
        }
    else:
        raise HTTPException(
            status_code=503,
            detail='Falha na conexão com banco de dados'
        )


@router.get('/database/stats')
def get_database_stats():
    """
    📊 Estatísticas do banco de dados.
    """
    try:
        engine = get_engine()
        
        with engine.connect() as conn:
            # Conta registros
            opps_count = conn.execute(text('SELECT COUNT(*) FROM "Opportunity"')).scalar()
            history_count = conn.execute(text('SELECT COUNT(*) FROM "PriceHistory"')).scalar()
            ceasa_count = conn.execute(text('SELECT COUNT(*) FROM "CeasaPrice"')).scalar()
            
            # Última atualização
            last_update = conn.execute(
                text('SELECT MAX("createdAt") FROM "PriceHistory"')
            ).scalar()
        
        return {
            'opportunities': opps_count,
            'price_history': history_count,
            'ceasa_prices': ceasa_count,
            'last_update': last_update.isoformat() if last_update else None,
            'timestamp': datetime.now().isoformat()
        }
    
    except Exception as e:
        logger.error(f"❌ Erro ao buscar stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get('/system/info')
def get_system_info():
    """
    💻 Informações do sistema.
    """
    try:
        import platform
        import psutil
        
        return {
            'system': {
                'platform': platform.system(),
                'python_version': platform.python_version(),
                'node': platform.node()
            },
            'resources': {
                'cpu_percent': psutil.cpu_percent(interval=1),
                'memory_percent': psutil.virtual_memory().percent,
                'disk_percent': psutil.disk_usage('/').percent
            },
            'application': {
                'version': '6.0.0',
                'name': 'Agro-AI Brain - Modular',
                'timestamp': datetime.now().isoformat()
            }
        }
    
    except ImportError:
        return {
            'error': 'psutil não instalado',
            'install': 'pip install psutil'
        }
    except Exception as e:
        logger.error(f"❌ Erro ao buscar info: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get('/logs/recent')
def get_recent_logs(lines: int = Query(default=50, ge=10, le=500)):
    """
    📜 Últimas linhas do log.
    """
    try:
        with open('agro_ai.log', 'r', encoding='utf-8') as f:
            log_lines = f.readlines()[-lines:]
        
        return {
            'status': 'success',
            'total_lines': len(log_lines),
            'logs': log_lines,
            'timestamp': datetime.now().isoformat()
        }
    
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail='Arquivo de log não encontrado')
    except Exception as e:
        logger.error(f"❌ Erro ao ler logs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get('/health')
def health_check():
    """
    🏥 Health check do módulo administrativo.
    """
    return {
        'module': 'admin',
        'status': 'healthy',
        'features': {
            'cache_management': 'online',
            'etl_triggers': 'online',
            'database_tools': 'online'
        },
        'timestamp': datetime.now().isoformat()
    }
# Adicione isso no final do arquivo routers/admin.py

@router.post('/fix-market-data')
def fix_market_data():
    """
    🔧 Rota de correção solicitada pelo Dashboard.
    Redireciona para o ETL de preços.
    """
    try:
        logger.info("🔧 Correção de dados solicitada. Rodando ETL...")
        # Reutiliza a lógica do ETL
        from services.data_sync.market_scraper import market_scraper
        result = market_scraper.run_etl()
        
        return {
            "status": "success", 
            "message": "Correção aplicada (ETL rodado)",
            "details": result
        }
    except Exception as e:
        logger.error(f"❌ Erro na correção: {e}")
        raise HTTPException(status_code=500, detail=str(e))