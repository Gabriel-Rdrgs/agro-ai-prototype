# 🧪 Testes Automatizados - Agro-AI Brain

Este diretório contém testes automatizados usando **Pytest** para validar o funcionamento dos serviços de IA.

---

## 📋 Estrutura

```
tests/
├── __init__.py          # Inicialização do pacote
├── conftest.py          # Fixtures e configuração compartilhada
├── test_prophet.py      # Testes do serviço de previsão Prophet
└── test_rag.py          # Testes do serviço RAG
```

---

## 🚀 Como Rodar os Testes

### 1. Instalar Dependências

Primeiro, instale o Pytest e dependências:

```bash
# Dentro do container Docker
docker exec -it agro_brain bash
cd /app
pip install pytest pytest-asyncio pytest-cov
```

**OU** se estiver usando o requirements.txt atualizado:

```bash
pip install -r requirements.txt
```

### 2. Rodar Todos os Testes

```bash
# Dentro do container
cd /app
pytest tests/ -v
```

### 3. Rodar Testes Específicos

```bash
# Apenas testes do Prophet
pytest tests/test_prophet.py -v

# Apenas testes do RAG
pytest tests/test_rag.py -v

# Teste específico
pytest tests/test_prophet.py::TestPriceForecastService::test_forecast_with_sufficient_data -v
```

### 4. Com Cobertura de Código

```bash
pytest tests/ -v --cov=services --cov-report=html
```

Isso gera um relatório HTML em `htmlcov/index.html`.

---

## 📝 Testes Disponíveis

### Testes do Prophet (`test_prophet.py`)

- ✅ `test_forecast_with_sufficient_data`: Testa previsão com dados suficientes (≥30 registros)
- ✅ `test_forecast_with_insufficient_data_for_prophet`: Testa fallback quando dados <30 registros
- ✅ `test_forecast_with_very_few_data`: Testa erro quando dados <5 registros
- ✅ `test_prophet_cache`: Testa cache LRU do Prophet
- ✅ `test_forecast_price_validation`: Testa que preços estão dentro de limites razoáveis
- ✅ `test_forecast_different_days_ahead`: Testa diferentes valores de days_ahead (7, 14, 30)
- ✅ `test_forecast_without_region`: Testa previsão sem especificar região
- ✅ `test_forecast_error_handling`: Testa tratamento de erros

### Testes do RAG (`test_rag.py`)

- ⚠️ `test_ask_with_valid_question`: Testa consulta válida (requer OPENAI_API_KEY)
- ✅ `test_ask_with_empty_question`: Testa pergunta vazia
- ✅ `test_ask_handles_openai_rate_limit`: Testa tratamento de rate limit
- ✅ `test_ask_handles_invalid_api_key`: Testa tratamento de API key inválida
- ✅ `test_ask_with_nonexistent_topic`: Testa tópico não existente
- ⚠️ `test_ask_returns_sources`: Testa retorno de fontes (requer OPENAI_API_KEY)
- ✅ `test_ask_handles_database_error`: Testa tratamento de erro de banco

**Legenda:**
- ✅ Teste unitário (não requer dependências externas)
- ⚠️ Teste de integração (requer OPENAI_API_KEY ou banco de dados)

---

## 🔧 Configuração

### Variáveis de Ambiente

Alguns testes requerem variáveis de ambiente:

- `OPENAI_API_KEY`: Para testes de integração do RAG
- `DATABASE_URL`: Para testes que usam banco real (opcional, testes usam mocks por padrão)

### Pytest.ini

O arquivo `pytest.ini` na raiz do `ai-service/` configura:
- Diretório de testes: `tests/`
- Padrões de nomes de arquivos/classes/funções
- Marcadores customizados (`@pytest.mark.slow`, `@pytest.mark.integration`)

---

## 📊 Exemplo de Saída

```
tests/test_prophet.py::TestPriceForecastService::test_forecast_with_sufficient_data PASSED
tests/test_prophet.py::TestPriceForecastService::test_forecast_with_insufficient_data_for_prophet PASSED
tests/test_prophet.py::TestPriceForecastService::test_forecast_with_very_few_data PASSED
tests/test_prophet.py::TestPriceForecastService::test_prophet_cache PASSED
tests/test_prophet.py::TestPriceForecastService::test_forecast_price_validation PASSED
tests/test_prophet.py::TestPriceForecastService::test_forecast_different_days_ahead PASSED
tests/test_prophet.py::TestPriceForecastService::test_forecast_without_region PASSED
tests/test_prophet.py::TestPriceForecastService::test_forecast_error_handling PASSED

tests/test_rag.py::TestRAGService::test_ask_with_empty_question PASSED
tests/test_rag.py::TestRAGService::test_ask_handles_openai_rate_limit PASSED
tests/test_rag.py::TestRAGService::test_ask_handles_invalid_api_key PASSED
tests/test_rag.py::TestRAGService::test_ask_with_nonexistent_topic PASSED
tests/test_rag.py::TestRAGService::test_ask_handles_database_error PASSED

======================== 13 passed in 15.23s ========================
```

---

## 🐛 Troubleshooting

### Erro: "No module named pytest"

**Solução:**
```bash
pip install pytest pytest-asyncio pytest-cov
```

### Erro: "ModuleNotFoundError: No module named 'utils'"

**Solução:**
Certifique-se de estar rodando os testes a partir da raiz do `ai-service/`:
```bash
cd /app  # Dentro do container
pytest tests/ -v
```

### Testes do RAG falhando

**Causa:** Requer OPENAI_API_KEY configurada

**Solução:**
- Configure `OPENAI_API_KEY` no `.env`
- OU pule os testes de integração: `pytest tests/ -v -m "not integration"`

### Testes do Prophet demorando muito

**Causa:** Prophet treina modelos reais (pode demorar 5-10s por teste)

**Solução:**
- Use `-m "not slow"` para pular testes lentos
- OU use `--maxfail=1` para parar no primeiro erro

---

## 📚 Próximos Passos

- [ ] Adicionar testes de integração end-to-end
- [ ] Adicionar testes de performance
- [ ] Configurar CI/CD (GitHub Actions) para rodar testes automaticamente
- [ ] Adicionar testes de carga (stress tests)

---

**Última atualização:** Dezembro 2025

