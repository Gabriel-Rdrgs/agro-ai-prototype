# ai-service/tests/conftest.py
"""
Configuração compartilhada para testes Pytest.

Fixtures e mocks reutilizáveis entre os testes.
"""

import os
import sys
import pytest
from unittest.mock import Mock, patch
from datetime import datetime, timedelta
import pandas as pd

# Adiciona path para imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

@pytest.fixture
def mock_database_url():
    """Mock da DATABASE_URL para testes (usa SQLite em memória)"""
    return "sqlite:///:memory:"

@pytest.fixture
def sample_price_data():
    """
    Gera dados sintéticos de preços para testes.
    
    Returns:
        DataFrame com colunas: ds (datetime), y (preço)
    """
    dates = pd.date_range(
        start=datetime.now() - timedelta(days=180),
        end=datetime.now(),
        freq='D'
    )
    
    # Simula preços com tendência e sazonalidade
    base_price = 4.50
    trend = 0.01  # Aumento de R$ 0,01 por dia
    seasonal = 0.1 * pd.Series(range(len(dates))).apply(lambda x: 0.5 * (1 + x % 30 / 30))
    noise = pd.Series(range(len(dates))).apply(lambda x: (x % 7 - 3) * 0.05)
    
    prices = base_price + (trend * pd.Series(range(len(dates)))) + seasonal + noise
    
    df = pd.DataFrame({
        'ds': dates,
        'y': prices
    })
    
    return df

@pytest.fixture
def mock_openai_client():
    """Mock do cliente OpenAI para testes RAG"""
    with patch('openai.OpenAI') as mock:
        yield mock

@pytest.fixture
def sample_rag_documents():
    """Documentos de exemplo para testes RAG"""
    return [
        {
            "content": "A temperatura ideal para tomate de mesa é entre 18°C e 25°C durante o dia.",
            "metadata": {
                "crop": "Tomate",
                "theme": "Clima",
                "source": "Clima e Produção de Tomates no Brasil.pdf",
                "page": 1
            }
        },
        {
            "content": "O armazenamento de tomate deve ser feito em temperatura de 10°C a 12°C.",
            "metadata": {
                "crop": "Tomate",
                "theme": "Armazenagem",
                "source": "Função Custo de Armazenagem de Tomate.pdf",
                "page": 1
            }
        }
    ]

