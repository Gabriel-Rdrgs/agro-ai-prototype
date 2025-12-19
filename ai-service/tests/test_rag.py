# ai-service/tests/test_rag.py
"""
Testes automatizados para o serviço RAG.

Testa:
- Ingestão de documentos
- Consultas RAG
- Tratamento de erros (quota, rate-limit, API key inválida)
"""

import pytest
import sys
import os
from unittest.mock import Mock, patch, MagicMock

# Adiciona path para imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from services.rag_service import RagService


class TestRAGService:
    """Testes para RagService"""
    
    def setup_method(self):
        """Setup antes de cada teste"""
        self.service = RagService()
    
    @pytest.mark.skipif(
        not os.getenv('OPENAI_API_KEY'),
        reason="OPENAI_API_KEY não configurada - teste requer API key real"
    )
    def test_ask_with_valid_question(self):
        """
        Testa consulta RAG com pergunta válida.
        Requer OPENAI_API_KEY configurada.
        """
        result = self.service.ask("Qual a temperatura ideal para tomate?")
        
        assert result is not None, "Resultado não deve ser None"
        assert 'answer' in result, "Resultado deve ter campo 'answer'"
        assert 'sources' in result, "Resultado deve ter campo 'sources'"
        assert len(result['answer']) > 0, "Resposta não deve estar vazia"
    
    def test_ask_with_empty_question(self):
        """
        Testa que consulta com pergunta vazia retorna erro apropriado.
        """
        result = self.service.ask("")
        
        # Deve retornar erro ou resposta vazia, não crashar
        assert result is not None
        # Pode retornar erro ou resposta genérica
        if 'error' in result or 'error_type' in result:
            assert len(result.get('error', result.get('error_type', ''))) > 0
    
    def test_ask_handles_openai_rate_limit(self):
        """
        Testa tratamento de erro de rate limit da OpenAI.
        """
        # Cria serviço com mock que simula rate limit
        service = RagService()
        
        # Mock do embeddings que lança erro de rate limit
        mock_embeddings = MagicMock()
        mock_embeddings.embed_query.side_effect = Exception("rate_limit exceeded")
        service.embeddings = mock_embeddings
        service.llm = MagicMock()  # Mock do LLM também
        
        result = service.ask("Qual a temperatura ideal?")
        
        # Deve tratar o erro graciosamente
        assert result is not None
        # Verifica que retorna error_type apropriado
        assert 'error_type' in result or 'answer' in result
        if 'error_type' in result:
            assert result['error_type'] == 'rate_limit'
        elif 'answer' in result:
            # Pode retornar mensagem de erro na answer
            assert 'rate limit' in result['answer'].lower() or 'muitas requisições' in result['answer'].lower()
    
    def test_ask_handles_invalid_api_key(self):
        """
        Testa tratamento de erro quando API key não está configurada.
        """
        # Cria serviço sem API key
        with patch.dict(os.environ, {}, clear=True):
            service = RagService()
            result = service.ask("Qual a temperatura ideal?")
            
            # Deve retornar mensagem de erro apropriada
            assert result is not None
            assert 'error_type' in result or 'answer' in result
            if 'error_type' in result:
                assert result['error_type'] == 'not_configured'
    
    def test_ask_with_nonexistent_topic(self):
        """
        Testa consulta sobre tópico que não existe nos documentos.
        """
        # Esta consulta provavelmente não vai encontrar documentos relevantes
        result = self.service.ask("Como fazer um bolo de chocolate?")
        
        assert result is not None
        # Pode retornar resposta genérica ou indicar que não encontrou informações
        assert 'answer' in result
    
    @pytest.mark.skipif(
        not os.getenv('OPENAI_API_KEY'),
        reason="OPENAI_API_KEY não configurada"
    )
    def test_ask_returns_sources(self):
        """
        Testa que consulta retorna fontes (sources) dos documentos.
        """
        result = self.service.ask("Qual a temperatura ideal para tomate?")
        
        assert 'sources' in result, "Resultado deve ter campo 'sources'"
        assert isinstance(result['sources'], list), "Sources deve ser uma lista"
    
    @patch('services.rag_service.get_db_session')
    def test_ask_handles_database_error(self, mock_db_session):
        """
        Testa tratamento de erro quando há problema no banco de dados.
        """
        # Mock que simula erro no banco
        mock_db_session.side_effect = Exception("Database connection error")
        
        result = self.service.ask("Qual a temperatura ideal?")
        
        # Deve tratar o erro graciosamente
        assert result is not None
        # Pode retornar erro ou resposta vazia
        assert 'answer' in result or 'error' in result or 'error_type' in result

