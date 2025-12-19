# ai-service/utils/database.py
import os
import logging
from contextlib import contextmanager
from dotenv import load_dotenv

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

logger = logging.getLogger(__name__)

# Carrega .env
load_dotenv()

# 1. Definição da Base para Models (NOVO)
# Todos os modelos (tabelas) devem herdar desta classe
Base = declarative_base()

def get_database_url() -> str:
    """
    Retorna URL do banco normalizada.
    Prioridade: DIRECT_URL > DATABASE_URL > PYTHON_DB_URL > SQLite (fallback)
    
    Para Python/SQLAlchemy:
    - Usa DIRECT_URL se disponível (porta 5432, sem pgbouncer)
    - Se usar DATABASE_URL com pgbouncer (porta 6543), converte para porta direta (5432)
    - Remove parâmetros pgbouncer (Python não precisa deles)
    """
    # Prioriza DIRECT_URL (porta direta, sem pgbouncer)
    url = os.getenv('DIRECT_URL') or os.getenv('DATABASE_URL') or os.getenv('PYTHON_DB_URL')
    
    if not url:
        logger.warning("⚠️ DATABASE_URL não definida, usando SQLite local para testes")
        return 'sqlite:///./agro_test.db'
    
    # Normaliza postgres:// → postgresql:// para SQLAlchemy
    if url.startswith('postgres://'):
        url = url.replace('postgres://', 'postgresql://', 1)
    
    # ✅ CORREÇÃO CRÍTICA: Converte porta 6543 (pgbouncer) para 5432 (direta)
    # O pgbouncer exige formato especial de usuário que causa erro de autenticação
    # Python/SQLAlchemy gerencia pooling nativamente, então pode usar porta direta
    if ':6543/' in url or ':6543?' in url:
        logger.info("🔄 Convertendo URL de pgbouncer (6543) para conexão direta (5432)")
        url = url.replace(':6543/', ':5432/').replace(':6543?', ':5432?')
    
    # Remove parâmetros de pooling que o SQLAlchemy gerencia nativamente
    url = url.replace('?pgbouncer=true', '').replace('&pgbouncer=true', '')
    return url

# Singleton do engine e session factory
_engine = None
_SessionLocal = None

def get_engine():
    """Retorna engine SQLAlchemy (singleton)"""
    global _engine
    if _engine is None:
        url = get_database_url()
        
        # ✅ OTIMIZAÇÃO CRÍTICA: Pool reduzido para evitar esgotamento
        # Supabase Session mode tem limite de 15-20 conexões totais
        # Python: 3+2 = 5 conexões máximas
        # Node.js: 5 conexões (via Prisma)
        # Total: ~10 conexões (dentro do limite seguro)
        pool_size = 3  # Reduzido de 5 para 3 (mais conservador)
        max_overflow = 2  # Reduzido de 5 para 2 (total máximo: 5 conexões)
        pool_timeout = 20  # Timeout menor (20s em vez de 30s)
        pool_recycle = 1800  # Recicla após 30 min (mais agressivo - evita conexões stale)
        
        _engine = create_engine(
            url,
            pool_size=pool_size,
            max_overflow=max_overflow,
            pool_timeout=pool_timeout,
            pool_recycle=pool_recycle,
            pool_pre_ping=True,  # Testa conexão antes de usar
            connect_args={
                'connect_timeout': 10,  # Timeout de conexão inicial
                'application_name': 'agro_ai_python'  # Identifica no Supabase
            },
            echo=False
        )
        logger.info(f"✅ Database engine criado (pool_size={pool_size}, max_overflow={max_overflow})")
    return _engine

def get_session_factory():
    """Retorna factory de sessões"""
    global _SessionLocal
    if _SessionLocal is None:
        engine = get_engine()
        _SessionLocal = sessionmaker(
            autocommit=False,
            autoflush=False,
            bind=engine
        )
    return _SessionLocal

@contextmanager
def get_db_session():
    """
    Context manager para sessões de banco (com retry para pool esgotado).
    Uso:
        with get_db_session() as session:
            ...
    """
    import time
    max_retries = 3
    retry_delay = 1  # segundos
    
    SessionLocal = get_session_factory()
    session = None
    
    for attempt in range(max_retries):
        try:
            session = SessionLocal()
            yield session
            session.commit()
            return  # Sucesso, sai do loop
        except Exception as e:
            error_str = str(e).lower()
            
            # Fecha sessão em caso de erro
            if session:
                try:
                    session.rollback()
                    session.close()
                except:
                    pass
                session = None
            
            # Detecta pool esgotado e tenta novamente
            if ("maxclients" in error_str or "max clients" in error_str or "pool" in error_str) and attempt < max_retries - 1:
                wait_time = retry_delay * (attempt + 1)
                logger.warning(f"⚠️ Pool esgotado ao obter sessão (tentativa {attempt + 1}/{max_retries}). Aguardando {wait_time}s...")
                time.sleep(wait_time)
                continue
            else:
                logger.error(f"❌ Erro na sessão: {e}")
                raise
        finally:
            # Garante que a sessão seja fechada
            if session:
                try:
                    session.close()
                except:
                    pass

def test_connection() -> bool:
    """Testa conexão com banco (com retry para pool esgotado)"""
    import time
    max_retries = 3
    retry_delay = 2  # segundos
    
    for attempt in range(max_retries):
        try:
            engine = get_engine()
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info("✅ Conexão com banco OK")
            return True
        except Exception as e:
            error_str = str(e).lower()
            
            # Detecta pool esgotado
            if "maxclients" in error_str or "max clients" in error_str or "pool" in error_str:
                if attempt < max_retries - 1:
                    wait_time = retry_delay * (attempt + 1)
                    logger.warning(f"⚠️ Pool esgotado (tentativa {attempt + 1}/{max_retries}). Aguardando {wait_time}s...")
                    time.sleep(wait_time)
                    continue
                else:
                    logger.error(f"❌ Pool de conexões esgotado após {max_retries} tentativas")
                    logger.error("   💡 Solução: Aguarde alguns minutos ou aumente pool_size no Supabase")
                    return False
            else:
                logger.error(f"❌ Falha na conexão: {e}")
                return False
    
    return False