# ai-service/routers/health.py
"""
Health check endpoints melhorados para monitoramento
"""

from fastapi import APIRouter, HTTPException
from datetime import datetime
import os
import logging
from typing import Dict, Any

from sqlalchemy import text
from utils.database import get_engine, get_database_url
from config.settings import get_settings

settings = get_settings()

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/health", tags=["🏥 Health"])


@router.get("/")
def health_check_basic():
    """
    Health check básico (rápido, sem verificações externas).
    Útil para load balancers e verificações frequentes.
    """
    return {
        "status": "ok",
        "service": "agro-ai-brain",
        "version": settings.app_version,
        "timestamp": datetime.now().isoformat()
    }


@router.get("/detailed")
async def health_check_detailed():
    """
    Health check detalhado com verificações de:
    - Banco de dados (Supabase)
    - Serviços internos
    - APIs externas (OpenAI)
    - Recursos do sistema
    """
    checks: Dict[str, Any] = {
        "status": "healthy",
        "service": "agro-ai-brain",
        "version": settings.app_version,
        "timestamp": datetime.now().isoformat(),
        "checks": {}
    }
    
    # 1. Verificação de Banco de Dados
    db_check = await check_database()
    checks["checks"]["database"] = db_check
    
    # 2. Verificação de Serviços Internos
    services_check = check_internal_services()
    checks["checks"]["services"] = services_check
    
    # 3. Verificação de APIs Externas
    external_check = check_external_apis()
    checks["checks"]["external"] = external_check
    
    # 4. Verificação de Recursos
    resources_check = check_resources()
    checks["checks"]["resources"] = resources_check
    
    # Status geral
    all_healthy = (
        db_check["status"] == "ok" and
        services_check["status"] == "ok" and
        external_check["status"] in ["ok", "warning"] and  # Warning é aceitável para APIs externas
        resources_check["status"] == "ok"
    )
    
    checks["status"] = "healthy" if all_healthy else "degraded"
    
    return checks


@router.get("/database")
async def health_check_database():
    """
    Health check específico do banco de dados.
    """
    return await check_database()


@router.get("/services")
def health_check_services():
    """
    Health check específico dos serviços internos.
    """
    return check_internal_services()


@router.get("/external")
def health_check_external():
    """
    Health check específico das APIs externas.
    """
    return check_external_apis()


async def check_database() -> Dict[str, Any]:
    """
    Verifica conexão e saúde do banco de dados.
    """
    try:
        engine = get_engine()
        
        # Testa conexão com query simples
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1 as test, version() as version"))
            row = result.fetchone()
            
            # Extrai versão do PostgreSQL
            pg_version = row[1] if row else "unknown"
            
            # Verifica se é Supabase (contém "supabase" na URL ou versão)
            db_url = get_database_url()
            is_supabase = "supabase" in db_url.lower() or "supabase" in pg_version.lower()
            
            return {
                "status": "ok",
                "connected": True,
                "provider": "supabase" if is_supabase else "postgresql",
                "version": pg_version[:50],  # Limita tamanho
                "url_configured": bool(db_url),
                "timestamp": datetime.now().isoformat()
            }
    except Exception as e:
        logger.error(f"❌ Erro ao verificar banco: {e}")
        return {
            "status": "error",
            "connected": False,
            "error": str(e)[:200],  # Limita tamanho
            "timestamp": datetime.now().isoformat()
        }


def check_internal_services() -> Dict[str, Any]:
    """
    Verifica se serviços internos estão carregados.
    """
    services_status = {}
    
    # Lista de serviços para verificar
    services_to_check = [
        ("market_intelligence", "services.market_intelligence"),
        ("storage_advisor", "services.storage_advisor"),
        ("climate_api", "services.climate.intelligence"),
        ("fuel_pricing", "services.fuel_pricing"),
        ("price_forecast", "services.price_forecast"),
        ("rag_service", "services.rag_service")
    ]
    
    for service_name, module_path in services_to_check:
        try:
            __import__(module_path)
            services_status[service_name] = "online"
        except Exception as e:
            logger.warning(f"⚠️ Serviço {service_name} não disponível: {e}")
            services_status[service_name] = "offline"
    
    all_online = all(s == "online" for s in services_status.values())
    
    return {
        "status": "ok" if all_online else "degraded",
        "services": services_status,
        "timestamp": datetime.now().isoformat()
    }


def check_external_apis() -> Dict[str, Any]:
    """
    Verifica configuração de APIs externas (não faz chamadas reais).
    """
    apis_status = {}
    
    # OpenAI
    openai_key = os.getenv("OPENAI_API_KEY")
    apis_status["openai"] = {
        "configured": bool(openai_key),
        "status": "ok" if openai_key else "not_configured"
    }
    
    # Outras APIs podem ser adicionadas aqui
    # Ex: Open-Meteo, CEASA, etc.
    
    all_ok = all(
        api.get("status") == "ok" or api.get("status") == "not_configured"
        for api in apis_status.values()
    )
    
    return {
        "status": "ok" if all_ok else "warning",
        "apis": apis_status,
        "timestamp": datetime.now().isoformat()
    }


def check_resources() -> Dict[str, Any]:
    """
    Verifica recursos do sistema (memória, cache, etc.).
    """
    try:
        import psutil
        
        # Memória
        memory = psutil.virtual_memory()
        
        # Cache (se disponível)
        from utils.cache import global_cache
        cache_size = global_cache.size() if hasattr(global_cache, 'size') else 0
        
        return {
            "status": "ok",
            "memory": {
                "total_gb": round(memory.total / (1024**3), 2),
                "available_gb": round(memory.available / (1024**3), 2),
                "percent_used": memory.percent
            },
            "cache": {
                "items": cache_size
            },
            "timestamp": datetime.now().isoformat()
        }
    except ImportError:
        # psutil não disponível, retorna básico
        return {
            "status": "ok",
            "message": "Resource monitoring not available (psutil not installed)",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.warning(f"⚠️ Erro ao verificar recursos: {e}")
        return {
            "status": "warning",
            "error": str(e)[:200],
            "timestamp": datetime.now().isoformat()
        }

