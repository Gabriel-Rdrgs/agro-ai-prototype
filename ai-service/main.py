# main.py
"""
Agro-AI Brain - API Principal (v6.0 - Modular)

Aplicação modular com separação de responsabilidades:
- Routers: Endpoints organizados por funcionalidade
- Services: Lógica de negócio e inteligência
- Config: Configurações e especificações
- Utils: Utilitários compartilhados

Correções aplicadas (baseadas em PDFs científicos):
✅ CROPS_SPECS: Perdas 0,2%/dia, radiação 8.4 MJ
✅ PLANTING_CALENDAR: GO/BA corrigidos
✅ Sazonalidade: Sul 1.20, Sudeste 0.92
✅ Normalização automática Caixa→Kg
"""

import sys
import os
import logging
# Importação do ETL removida do nível superior para evitar erros no deploy
# O ETL será importado apenas quando necessário (lazy import)
from datetime import datetime
from contextlib import asynccontextmanager
from routers import chat as chat_router
from routers import weather
from routers import soil  # ✅ FASE 0 - Semana 4: SoilGrids
from routers import zarc  # ✅ FASE 0 - Semana 4: ZARC
from routers import production  # ✅ FASE 0 - Semana 4: IBGE SIDRA

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Imports locais
from config.settings import get_settings
from routers import predictions_router, calculations_router, admin_router
from routers import projections as projections_router
from routers import health as health_router
from utils.database import test_connection
from utils.auth_middleware import verify_internal_api_key



# ========================================
# CONFIGURAÇÃO DE LOGGING
# ========================================
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('agro_ai.log', encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

# Carrega variáveis de ambiente
load_dotenv()
settings = get_settings()

# ========================================
# LIFESPAN (Startup/Shutdown Events)
# ========================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Gerencia ciclo de vida da aplicação.
    Executa na inicialização e shutdown.
    """
    # ========================================
    # STARTUP
    # ========================================
    logger.info("="*60)
    logger.info("🚀 INICIANDO AGRO-AI BRAIN v6.0 (Modular)")
    logger.info("="*60)
    
    # Testa conexão com banco
    logger.info("🔌 Testando conexão com banco de dados...")
    if test_connection():
        logger.info("✅ Banco de dados conectado")
    else:
        logger.error("❌ FALHA: Banco de dados não acessível")
        logger.warning("⚠️ Aplicação iniciará, mas funcionalidades serão limitadas")
    
    # Informações do sistema
    logger.info(f"📦 Versão: {settings.app_version}")
    logger.info(f"🌐 Ambiente: {settings.log_level}")
    logger.info(f"💾 Cache TTL: {settings.cache_ttl_seconds}s")
    
    # Carrega serviços
    # Carrega serviços (SEM try/except para mostrar o erro real no console)
    logger.info("🧠 Carregando serviços de inteligência...")
    
    # Se houver erro aqui, o container vai parar e mostrar a linha exata do problema
    from services.market_intelligence import market_intelligence
    from services.storage_advisor import storage_advisor
    from services.climate.intelligence import climate_api
    from services.fuel_pricing import fuel_api
        
    logger.info("✅ Todos os serviços carregados com sucesso!")
    
    logger.info("="*60)
    logger.info("✅ APLICAÇÃO PRONTA PARA RECEBER REQUISIÇÕES")
    logger.info("="*60)
    
    # ✅ SCHEDULER EXTRAÍDO: Jobs agendados agora rodam em worker separado
    # Para executar jobs agendados, rode: python scripts/scheduler_worker.py
    # Isso evita execução duplicada em múltiplas réplicas do FastAPI
    
    yield  # Aplicação roda aqui
    
    # ========================================
    # SHUTDOWN
    # ========================================
    logger.info("="*60)
    logger.info("🛑 ENCERRANDO AGRO-AI BRAIN")
    logger.info("="*60)
    
    # Limpeza de recursos (se necessário)
    logger.info("🧹 Limpando recursos...")
    
    from utils.cache import global_cache
    logger.info(f"📊 Cache: {global_cache.size()} itens em memória")
    
    logger.info("✅ Aplicação encerrada com sucesso")


# ========================================
# INICIALIZAÇÃO DO FASTAPI
# ========================================
app = FastAPI(
    title=settings.app_title,
    version=settings.app_version,
    description="""
    ## 🧠 Agro-AI Brain - API de Inteligência Agrícola
    
    Sistema modular de análise e predição para agricultura.
    
    ### 📚 Funcionalidades
    
    **🔮 Predições**
    - Análise de viabilidade de armazenagem (IA)
    - Simulação de 30 dias com clima e mercado
    
    **💰 Calculadoras**
    - ROI de produção local
    - Arbitragem interestadual
    
    **🛠️ Administrativo**
    - ETL de preços de mercado
    - Gestão de cache
    - Ferramentas de banco de dados
    
    ### 📄 Documentação Científica
    
    Baseado em:
    - Embrapa (Clima e Produção de Tomates no Brasil)
    - UFG (Análise Climática)
    - ZARC (Zoneamento Agrícola de Risco Climático)
    
    ### 🔗 Links Úteis
    
    - [Documentação Interativa](/docs)
    - [Esquema OpenAPI](/openapi.json)
    - [Health Check](/health)
    """,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)


# ========================================
# MIDDLEWARE - CORS
# ========================================
# Lê origens permitidas de variável de ambiente (separadas por vírgula)
# Exemplo: ALLOWED_ORIGINS=http://localhost:3000,https://your-app.vercel.app
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "*")
allowed_origins = allowed_origins_env.split(",") if allowed_origins_env != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*", "X-Internal-API-Key"],  # Permite header de autenticação
)


# ========================================
# MIDDLEWARE - AUTENTICAÇÃO INTERNA
# ========================================
@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    """
    Middleware de autenticação: valida X-Internal-API-Key para endpoints internos.
    """
    return await verify_internal_api_key(request, call_next)


# ========================================
# MIDDLEWARE - REQUEST LOGGING
# ========================================
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """
    Middleware para logar todas as requisições.
    """
    start_time = datetime.now()
    
    # Log da requisição
    logger.info(f"→ {request.method} {request.url.path}")
    
    try:
        response = await call_next(request)
    except Exception as e:
        logger.error(
            f"✗ Erro na requisição {request.method} {request.url.path}: {str(e)}",
            exc_info=True
        )
        raise
    
    # Log da resposta
    duration = (datetime.now() - start_time).total_seconds()
    logger.info(
        f"← {request.method} {request.url.path} | "
        f"Status: {response.status_code} | "
        f"Tempo: {duration:.3f}s"
    )
    
    return response


# ========================================
# ROUTERS - INCLUSÃO DOS ENDPOINTS
# ========================================
app.include_router(
    predictions_router,
    prefix="/api/v1/predict", 
    tags=["🔮 Predições (IA)"]
)

app.include_router(
    calculations_router,
    prefix="/api/v1/calc", 
    tags=["💰 Calculadoras"]
)

app.include_router(
    projections_router.router,
    tags=["📊 Validação de Projeções"]
)

app.include_router(
    admin_router,
    prefix="/api/v1/admin",
    tags=["🛠️ Administrativo"]
)

app.include_router(
    health_router,
    tags=["🏥 Health"]
)

app.include_router(
    chat_router.router, 
    prefix="/api/v1/chat", 
    tags=["AI Chat"]
)

app.include_router(
    weather.router,
    prefix="/api/v1/weather",
    tags=["Climate Intelligence"]
)

app.include_router(
    soil.router,
    prefix="/api/v1/soil",
    tags=["🌱 Soil Data (SoilGrids)"]  # ✅ FASE 0 - Semana 4
)

app.include_router(
    zarc.router,
    prefix="/api/v1/zarc",
    tags=["📅 ZARC (Zoneamento Agrícola)"]  # ✅ FASE 0 - Semana 4
)

app.include_router(
    production.router,
    prefix="/api/v1/production",
    tags=["📊 Production Data (IBGE SIDRA)"]  # ✅ FASE 0 - Semana 4
)

app.include_router(
    health_router.router,
    tags=["🏥 Health"]
)

# ========================================
# ROTAS RAIZ
# ========================================
@app.get("/", tags=["🏠 Root"])
def read_root():
    """
    🏠 Endpoint raiz - Informações da API.
    """
    return {
        "name": settings.app_title,
        "version": settings.app_version,
        "status": "online",
        "description": "API de Inteligência Agrícola com IA",
        "features": {
            "storage_prediction": "/predict/storage",
            "production_roi": "/calc/production",
            "arbitrage": "/calc/arbitrage",
            "admin_tools": "/admin/*"
        },
        "documentation": {
            "swagger": "/docs",
            "redoc": "/redoc",
            "openapi": "/openapi.json"
        },
        "corrections_applied": {
            "crops_specs": "Perdas 0.2%/dia (PDF), Radiação 8.4 MJ",
            "calendar": "GO/BA plantio corrigido",
            "seasonality": "Sul 1.20, Sudeste 0.92",
            "units": "Normalização automática Caixa→Kg"
        },
        "timestamp": datetime.now().isoformat()
    }


@app.get("/health", tags=["🏥 Health"])
def health_check():
    """
    🏥 Health check completo da aplicação.
    """
    # Testa banco
    db_status = "connected" if test_connection() else "disconnected"
    
    # Status dos serviços
    services_status = {}
    
    try:
        from services.market_intelligence import market_intelligence
        services_status['market_intelligence'] = 'online'
    except:
        services_status['market_intelligence'] = 'offline'
    
    try:
        from services.storage_advisor import storage_advisor
        services_status['storage_advisor'] = 'online'
    except:
        services_status['storage_advisor'] = 'offline'
    
    try:
        from services.climate.intelligence import climate_api
        services_status['climate_api'] = 'online'
    except:
        services_status['climate_api'] = 'offline'
    
    try:
        from services.fuel_pricing import fuel_api
        services_status['fuel_pricing'] = 'online'
    except:
        services_status['fuel_pricing'] = 'offline'
    
    # Status geral
    all_healthy = db_status == "connected" and all(
        s == 'online' for s in services_status.values()
    )
    
    return {
        "status": "healthy" if all_healthy else "degraded",
        "database": db_status,
        "services": services_status,
        "timestamp": datetime.now().isoformat()
    }


@app.get("/version", tags=["ℹ️ Info"])
def get_version():
    """
    ℹ️ Informações de versão e correções.
    """
    return {
        "version": settings.app_version,
        "name": settings.app_title,
        "architecture": "modular",
        "corrections_applied": [
            {
                "file": "config/crops.py",
                "correction": "Perdas armazenagem: 0.2%/dia (document-1.pdf)",
                "was": "1.5%/dia",
                "now": "0.002 (0.2%)"
            },
            {
                "file": "config/crops.py",
                "correction": "Radiação solar mínima: 8.4 MJ/m²/dia (document.pdf)",
                "was": "15 MJ",
                "now": "8.4 MJ"
            },
            {
                "file": "config/calendar.py",
                "correction": "GO plantio: Mar-Ago (document-2.pdf)",
                "was": "[3,4,5,6]",
                "now": "[3,4,5,6,7,8]"
            },
            {
                "file": "config/calendar.py",
                "correction": "BA plantio: Mar-Ago (document-2.pdf)",
                "was": "[5,6,7,8]",
                "now": "[3,4,5,6,7,8]"
            },
            {
                "file": "services/market_intelligence.py",
                "correction": "Sazonalidade Sul inverno: 1.20",
                "was": "1.45 (muito alto)",
                "now": "1.20"
            },
            {
                "file": "services/market_intelligence.py",
                "correction": "Sazonalidade Sudeste inverno: 0.92",
                "was": "0.85 (muito baixo)",
                "now": "0.92"
            },
            {
                "file": "services/climate/intelligence.py",
                "correction": "Conversão kWh→MJ: sempre multiplica por 3.6",
                "was": "Condicional (errado)",
                "now": "Sempre converte"
            },
            {
                "file": "scripts/backfill_history.py",
                "correction": "Soja/Milho: preços em kg",
                "was": "R$ 130/saca, R$ 60/saca",
                "now": "R$ 2.17/kg, R$ 1.00/kg"
            }
        ],
        "timestamp": datetime.now().isoformat()
    }


# ========================================
# EXCEPTION HANDLERS
# ========================================
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Handler global para exceções não tratadas.
    """
    logger.error(
        f"❌ Exceção não tratada em {request.method} {request.url.path}: {str(exc)}",
        exc_info=True
    )
    
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "message": str(exc),
            "path": str(request.url.path),
            "timestamp": datetime.now().isoformat()
        }
    )


# ========================================
# EXECUÇÃO DIRETA (para desenvolvimento)
# ========================================
if __name__ == "__main__":
    import uvicorn
    
    logger.info("🚀 Iniciando servidor de desenvolvimento...")
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # Auto-reload em desenvolvimento
        log_level="info"
    )
