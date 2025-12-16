# config/settings.py
"""
Configurações da aplicação via Pydantic Settings.
VERSÃO BLINDADA: Corrige conflito de namespace e limpa URL do banco.
"""

import os
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from dotenv import load_dotenv

# Carrega .env
load_dotenv()

class Settings(BaseSettings):
    """
    Configurações da aplicação.
    """
    
    # ========================================
    # APLICAÇÃO
    # ========================================
    app_title: str = "Agro-AI Brain"
    app_version: str = "6.0.0"
    
    env: str = "development"
    log_level: str = "INFO"
    cache_ttl_seconds: int = 1800
    
    # ========================================
    # BANCO DE DADOS
    # ========================================
    database_url: str = os.getenv('DATABASE_URL', 'sqlite:///./agro_test.db')
    
    # 👇 O TRUQUE DE MESTRE: Validador que limpa a URL para o Python
    @field_validator('database_url')
    @classmethod
    def clean_database_url(cls, v: str) -> str:
        if v:
            # O Python (SQLAlchemy) odeia o parâmetro pgbouncer, mas o Prisma precisa dele.
            # Aqui nós removemos silenciosamente apenas para o Python.
            return v.replace('?pgbouncer=true', '').replace('&pgbouncer=true', '')
        return v

    # ========================================
    # APIs
    # ========================================
    awesome_api_url: str = "https://economia.awesomeapi.com.br"
    openmeteo_api_url: str = "https://api.open-meteo.com/v1/forecast"
    ceasa_api_base: Optional[str] = None
    fuel_api_url: Optional[str] = None
    
    # ========================================
    # ML/AI
    # ========================================
    # O Pydantic reclamava deste nome começando com 'model_'
    model_retention_days: int = 180
    min_confidence: float = 0.5
    max_records: int = 10000
    
    # ========================================
    # Backend/Segurança
    # ========================================
    api_token: Optional[str] = None
    internal_api_key: Optional[str] = os.getenv('INTERNAL_API_KEY')  # Chave compartilhada Node ↔ Python
    backend_url: Optional[str] = None
    environment: str = "development"
    
    # ========================================
    # Servidor
    # ========================================
    port: int = 8000
    host: str = "0.0.0.0"
    
    # Configurações do Pydantic (Resolve o Warning)
    model_config = SettingsConfigDict(
        extra='allow',
        env_file='.env',
        # 👇 Isso silencia o aviso sobre "model_retention_days"
        protected_namespaces=('settings_',)
    )


# Singleton das configurações
_settings: Settings = None


def get_settings() -> Settings:
    """
    Retorna instância singleton das configurações.
    """
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings