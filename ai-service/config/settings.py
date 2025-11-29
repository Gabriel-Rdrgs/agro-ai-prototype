# config/settings.py
"""
Configurações da aplicação via Pydantic Settings.
VERSÃO CORRIGIDA com todas as variáveis do .env
"""

import os
from typing import Optional
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Carrega .env
load_dotenv()

class Settings(BaseSettings):
    """
    Configurações da aplicação.
    Extrai variáveis do .env com validação Pydantic.
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
    model_retention_days: int = 180
    min_confidence: float = 0.5
    max_records: int = 10000
    
    # ========================================
    # Backend/Segurança
    # ========================================
    api_token: Optional[str] = None
    backend_url: Optional[str] = None
    environment: str = "development"
    
    # ========================================
    # Servidor
    # ========================================
    port: int = 8000
    host: str = "0.0.0.0"
    
    # Configura o Pydantic para ACEITAR extras
    model_config = {
        "extra": "allow",  # ← CHAVE: permite variáveis extras
        "env_file": ".env"
    }


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
