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
    Prioridade: DATABASE_URL > PYTHON_DB_URL > SQLite (fallback)
    """
    url = os.getenv('DATABASE_URL') or os.getenv('PYTHON_DB_URL')
    
    if not url:
        logger.warning("⚠️ DATABASE_URL não definida, usando SQLite local para testes")
        return 'sqlite:///./agro_test.db'
    
    # Normaliza postgres:// → postgresql:// para SQLAlchemy
    if url.startswith('postgres://'):
        url = url.replace('postgres://', 'postgresql://', 1)
    
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
        _engine = create_engine(
            url,
            pool_size=10,
            max_overflow=20,
            pool_pre_ping=True,
            echo=False
        )
        logger.info("✅ Database engine criado")
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
    Context manager para sessões de banco.
    Uso:
        with get_db_session() as session:
            ...
    """
    SessionLocal = get_session_factory()
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception as e:
        session.rollback()
        logger.error(f"❌ Erro na sessão: {e}")
        raise
    finally:
        session.close()

def test_connection() -> bool:
    """Testa conexão com banco"""
    try:
        engine = get_engine()
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("✅ Conexão com banco OK")
        return True
    except Exception as e:
        logger.error(f"❌ Falha na conexão: {e}")
        return False