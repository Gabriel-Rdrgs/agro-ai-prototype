# 🚀 PLANO DE EVOLUÇÃO - AGRO-AI PROTOTYPE
## Arquitetura de IA e Nuvem para AgTech

**Data:** Dezembro 2025  
**Versão:** 1.0  
**Autor:** Arquitetura de Soluções IA/Nuvem

---

## 1. VISÃO GERAL DA EVOLUÇÃO

O **agro-ai-prototype** pode evoluir de um MVP funcional para uma **plataforma de decisão agrícola inteligente** que combina **RAG em documentos técnicos**, **previsões de séries temporais** (Prophet/ARIMA), **análise de risco climático** e **recomendações de manejo baseadas em dados multi-fonte**. Com integração de APIs de clima (Open-Meteo, NASA POWER), dados de solo (Embrapa Solos), imagens de satélite (Sentinel-2 via Google Earth Engine) e preços de mercado (CONAB, IBGE), o sistema se torna um **DSS (Decision Support System) completo** que auxilia produtores a otimizar plantio, colheita, armazenagem e comercialização. A arquitetura em nuvem (AWS recomendada) permite escalabilidade sob demanda, processamento de ML em batch/streaming e custos controlados via serverless (Lambda) para funções de IA leves e ECS/Fargate para serviços Python pesados.

---

## 2. MÓDULOS DE MACHINE LEARNING RECOMENDADOS

### 2.1. Análise Semântica de Documentos Agronômicos (RAG Avançado)

**Status Atual:** ✅ Básico implementado (OpenAI Embeddings + pgvector + gpt-4o-mini)

**Evolução Proposta:**

- **Nome:** "RAG Multi-Modal com Reranking e Filtros Contextuais"
- **Objetivo:** Permitir que produtores consultem manuais técnicos (Embrapa, UFG, ZARC) em linguagem natural e recebam respostas precisas com citações, considerando contexto regional (estado, tipo de solo, época do ano).
- **Tipo de Modelo/Algoritmo:**
  - **Embeddings:** `text-embedding-3-large` (OpenAI) ou `bge-large-pt-v1.5` (HuggingFace) para melhor qualidade em PT-BR
  - **Reranking:** `cross-encoder/ms-marco-MiniLM-L-6-v2` (Sentence Transformers) para reranking dos top-K chunks
  - **LLM:** `gpt-4o-mini` (atual) ou `claude-3-haiku` (Anthropic) para respostas mais baratas
  - **Chunking:** `RecursiveCharacterTextSplitter` (LangChain) com overlap de 200 chars e tamanho variável por seção (tabelas = chunks maiores)
- **Features de Entrada:**
  - Pergunta do usuário (texto livre)
  - Metadados contextuais: `estado`, `cultura`, `fase_ciclo` (plantio/colheita/armazenagem), `tipo_solo`
  - Histórico de perguntas anteriores (sessão) para contexto conversacional
- **Libs/Frameworks:**
  - `langchain==0.3.7` (atual) → atualizar para `0.3.9`
  - `sentence-transformers==2.3.1` (novo, para reranking)
  - `pgvector==0.3.6` (atual, manter)
  - `openai==1.55.0` (atual)

**Implementação:**
```python
# Novo serviço: ai-service/services/rag_advanced.py
class AdvancedRagService:
    def __init__(self):
        self.embeddings = OpenAIEmbeddings(model="text-embedding-3-large")
        self.reranker = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')
        self.llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
    
    def ask_with_context(self, question: str, metadata_filters: dict) -> dict:
        # 1. Busca vetorial inicial (k=20)
        candidates = self._vector_search(question, k=20, filters=metadata_filters)
        # 2. Reranking com cross-encoder (top 5)
        top_chunks = self._rerank(question, candidates, top_k=5)
        # 3. Geração com contexto filtrado
        return self._generate_answer(question, top_chunks)
```

---

### 2.2. Previsão de Preços com Séries Temporais (Prophet/ARIMA)

**Status Atual:** ⚠️ Regressão polinomial básica (scikit-learn)

**Evolução Proposta:**

- **Nome:** "Forecast de Preços Agrícolas com Prophet + Features Exógenas"
- **Objetivo:** Prever preços futuros (7, 15, 30 dias) de tomate/soja/milho por região, incorporando sazonalidade, tendências e eventos climáticos (chuva extrema, geada) como regressores externos.
- **Tipo de Modelo/Algoritmo:**
  - **Primário:** `Prophet` (Facebook) para séries temporais com sazonalidade múltipla (diária, semanal, mensal, anual)
  - **Alternativa:** `ARIMA` (statsmodels) ou `SARIMA` para produtos com menos dados históricos (< 1 ano)
  - **Ensemble:** Combinação ponderada Prophet + ARIMA quando ambos têm boa performance
  - **Regressores Exógenos:** Chuva acumulada (7 dias), temperatura média, dólar (USD-BRL), índice de produção (IBGE)
- **Features de Entrada:**
  - **Série temporal:** `price_avg` por `product_name`, `ceasa_region`, `price_date` (histórico mínimo: 90 dias)
  - **Regressores climáticos:** `rainfall_7d`, `temp_avg`, `temp_min` (Open-Meteo)
  - **Regressores econômicos:** `usd_brl_rate` (AwesomeAPI), `fuel_price_diesel` (ANP)
  - **Regressores sazonais:** `month`, `week_of_year`, `is_holiday` (Páscoa, Natal)
- **Libs/Frameworks:**
  - `prophet==1.1.5` (já no requirements, mas não usado)
  - `statsmodels==0.14.2` (novo, para ARIMA)
  - `pmdarima==2.0.4` (novo, auto-ARIMA)
  - `pandas==2.2.3` (atual)

**Implementação:**
```python
# Novo serviço: ai-service/services/price_forecast.py
from prophet import Prophet
import pandas as pd

class PriceForecastService:
    def train_prophet_model(self, product: str, region: str, df_history: pd.DataFrame):
        model = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=True,
            daily_seasonality=False,
            seasonality_mode='multiplicative'
        )
        # Adiciona regressores externos
        model.add_regressor('rainfall_7d')
        model.add_regressor('usd_brl')
        model.fit(df_history)
        return model
    
    def forecast(self, model: Prophet, days_ahead: int = 30) -> pd.DataFrame:
        future = model.make_future_dataframe(periods=days_ahead)
        # Preenche regressores futuros com previsão climática
        future['rainfall_7d'] = self._get_forecasted_rainfall()
        future['usd_brl'] = self._get_forecasted_dollar()
        forecast = model.predict(future)
        return forecast[['ds', 'yhat', 'yhat_lower', 'yhat_upper']]
```

---

### 2.3. Recomendação de Práticas de Manejo (Classificação Multi-Label)

**Status Atual:** ❌ Não implementado

**Evolução Proposta:**

- **Nome:** "Sistema de Recomendação Agronômica Baseado em Regras + ML"
- **Objetivo:** Recomendar práticas de plantio, irrigação, adubação e colheita baseado em: condições climáticas atuais, tipo de solo, fase do ciclo, histórico de produtividade da região.
- **Tipo de Modelo/Algoritmo:**
  - **Abordagem Híbrida:**
    - **Regras baseadas em conhecimento:** IF-THEN rules extraídas de PDFs técnicos (ex: "Se chuva > 50mm e solo argiloso → adiar plantio 3 dias")
    - **ML Classificador:** `RandomForestClassifier` (scikit-learn) ou `XGBoost` para recomendar múltiplas práticas simultaneamente (multi-label)
    - **Features de embedding:** Vetores de documentos RAG relevantes como features adicionais
- **Features de Entrada:**
  - **Climáticas:** `temp_avg`, `rainfall_7d`, `humidity`, `solar_radiation`
  - **Solo:** `soil_type` (argiloso/arenoso), `ph`, `organic_matter` (se disponível via API Embrapa Solos)
  - **Cultura:** `crop_variety`, `planting_date`, `days_since_planting`
  - **Contextuais:** `region`, `season`, `historical_yield_avg` (IBGE)
- **Libs/Frameworks:**
  - `scikit-learn==1.5.2` (atual)
  - `xgboost==2.1.0` (novo)
  - `imbalanced-learn==0.12.0` (novo, se classes desbalanceadas)

**Implementação:**
```python
# Novo serviço: ai-service/services/agronomic_recommender.py
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import MultiLabelBinarizer

class AgronomicRecommender:
    def __init__(self):
        self.model = RandomForestClassifier(n_estimators=100, max_depth=10)
        self.mlb = MultiLabelBinarizer()
    
    def recommend(self, context: dict) -> list:
        # 1. Aplica regras hard-coded primeiro
        rule_based = self._apply_rules(context)
        # 2. Se regras não cobrirem, usa ML
        if not rule_based:
            ml_recommendations = self.model.predict([self._extract_features(context)])
            return self._format_recommendations(ml_recommendations)
        return rule_based
```

---

### 2.4. Previsão de Produtividade e Perdas Pós-Colheita (Regressão)

**Status Atual:** ⚠️ Cálculo básico em `production_calculator.py`

**Evolução Proposta:**

- **Nome:** "Modelo de Produtividade com Features Climáticas e de Solo"
- **Objetivo:** Prever produtividade (ton/ha) e perdas pós-colheita (%) baseado em: histórico de clima durante o ciclo, tipo de solo, práticas de manejo, variedade.
- **Tipo de Modelo/Algoritmo:**
  - **Regressão:** `XGBoostRegressor` ou `LightGBM` para produtividade (target contínuo)
  - **Features de agregação temporal:** Média/máx/mín de temperatura, chuva acumulada por fase (plantio, floração, frutificação, colheita)
  - **Features de interação:** `temp_avg * rainfall` (estresse hídrico), `solar_radiation * days_since_planting` (acúmulo fotossintético)
- **Features de Entrada:**
  - **Climáticas agregadas:** `temp_avg_planting_phase`, `rainfall_total_cycle`, `solar_radiation_sum`
  - **Solo:** `soil_type`, `ph`, `drainage` (bom/regular/ruim)
  - **Manejo:** `irrigation_type` (gotejamento/aspersão), `fertilizer_applied` (kg/ha)
  - **Variedade:** `crop_variety`, `genetic_potential_yield` (ton/ha teórico)
- **Libs/Frameworks:**
  - `xgboost==2.1.0` (novo)
  - `lightgbm==4.3.0` (alternativa mais rápida)
  - `shap==0.44.0` (novo, para interpretabilidade)

**Implementação:**
```python
# Evolução: ai-service/services/production_calculator.py
import xgboost as xgb

class ProductionPredictor:
    def __init__(self):
        self.model = xgb.XGBRegressor(
            n_estimators=200,
            max_depth=6,
            learning_rate=0.1
        )
    
    def predict_yield(self, features: dict) -> float:
        # Converte dict para array
        X = self._extract_features(features)
        yield_ton_ha = self.model.predict([X])[0]
        # Aplica perdas pós-colheita
        postharvest_loss = self._estimate_losses(features)
        return yield_ton_ha * (1 - postharvest_loss)
```

---

### 2.5. Análise de Risco Climático (Classificação Binária)

**Status Atual:** ✅ Básico em `climate/risk_analyzer.py`

**Evolução Proposta:**

- **Nome:** "Classificador de Risco Climático com Thresholds Dinâmicos"
- **Objetivo:** Classificar risco (Baixo/Médio/Alto/Crítico) de perda de safra por eventos extremos (geada, chuva excessiva, seca prolongada) considerando fase do ciclo e tolerância da variedade.
- **Tipo de Modelo/Algoritmo:**
  - **Abordagem:** Regras baseadas em thresholds + ML para casos ambíguos
  - **Classificador:** `GradientBoostingClassifier` (scikit-learn) para risco binário (seguro/perigoso)
  - **Features de risco:** `frost_risk_score`, `flood_risk_score`, `drought_risk_score` (calculados separadamente)
- **Features de Entrada:**
  - **Climáticas:** `temp_min` (geada se < 5°C), `rainfall_7d`, `rainfall_30d`, `humidity`
  - **Fase do ciclo:** `days_since_planting`, `growth_stage` (vegetativo/floração/frutificação)
  - **Tolerância da cultura:** `frost_tolerance_temp`, `drought_tolerance_days` (de CROPS_SPECS)
- **Libs/Frameworks:**
  - `scikit-learn==1.5.2` (atual)

**Implementação:**
```python
# Evolução: ai-service/services/climate/risk_analyzer.py
from sklearn.ensemble import GradientBoostingClassifier

class EnhancedRiskAnalyzer:
    def calculate_risk(self, climate_data: dict, crop_specs: dict) -> str:
        # 1. Calcula scores de risco por tipo
        frost_score = self._frost_risk(climate_data, crop_specs)
        flood_score = self._flood_risk(climate_data)
        drought_score = self._drought_risk(climate_data, crop_specs)
        # 2. Combina scores
        total_risk = max(frost_score, flood_score, drought_score)
        # 3. Classifica
        if total_risk > 0.8: return "CRÍTICO"
        elif total_risk > 0.6: return "ALTO"
        elif total_risk > 0.4: return "MÉDIO"
        return "BAIXO"
```

---

## 3. APIs EXTERNAS E FONTES DE DADOS

| Tipo de Dado | Uso na Aplicação | Exemplo de API/Provedor | Observações |
|--------------|------------------|------------------------|-------------|
| **Clima - Previsão/Histórico** | Previsão de preços (regressor), análise de risco, recomendação de plantio | **Open-Meteo** (já integrado), **NASA POWER** (radiação solar), **INMET** (dados históricos oficiais BR) | Open-Meteo: gratuito, 7 dias previsão. NASA POWER: histórico longo, radiação diária. INMET: dados oficiais BR, requer cadastro. |
| **Clima - Dados de Solo** | Recomendação de irrigação, previsão de produtividade | **Embrapa Solos API** (se disponível), **World Soil Database** (fallback global) | Embrapa: dados regionais BR (melhor). World Soil: global, menos preciso. |
| **Imagens de Satélite** | Monitoramento de safra, NDVI (índice de vegetação), detecção de estresse hídrico | **Google Earth Engine** (Sentinel-2, Landsat), **Planet Labs API** (alta resolução, pago) | GEE: gratuito via Python API, Sentinel-2 (10m resolução). Planet: 3m resolução, pago. |
| **Preços de Mercado** | Treinamento de modelos de previsão, análise de tendências | **CONAB** (já mockado, precisa scraper real), **IBGE SIDRA** (preços agrícolas), **CEASA APIs** (várias regiões) | CONAB: dados oficiais, scraping necessário. IBGE SIDRA: API REST, dados agregados. |
| **Dados de Produção/Safra** | Contexto para previsões, análise de oferta/demanda | **IBGE PAM** (Produção Agrícola Municipal), **CONAB** (estimativas de safra) | IBGE PAM: dados históricos por município. CONAB: estimativas futuras. |
| **Dados Econômicos** | Regressores para previsão de preços | **AwesomeAPI** (já integrado - dólar), **BCB API** (taxa Selic, IPCA) | AwesomeAPI: simples, gratuito. BCB: dados oficiais, API REST. |
| **Dados de Logística** | Cálculo de frete, otimização de rotas | **Google Maps Distance Matrix API**, **OpenRouteService** (gratuito, OpenStreetMap) | Google: preciso, pago após quota. OpenRouteService: gratuito, menos preciso. |
| **Dados de Combustível** | Cálculo de custo de transporte | **ANP** (Agência Nacional do Petróleo) - scraping ou API não oficial | ANP: dados oficiais, scraping necessário. |

### Integração no Fluxo Atual:

1. **Clima → Previsão de Preços:**
   - Open-Meteo fornece `rainfall_7d` e `temp_avg` como regressores no Prophet
   - NASA POWER fornece `solar_radiation` para cálculo de brix/qualidade

2. **Clima + Solo → Recomendação de Manejo:**
   - Combina dados de Open-Meteo (chuva prevista) + Embrapa Solos (tipo de solo) para recomendar "adubação foliar" ou "irrigação suplementar"

3. **Satélite → Monitoramento:**
   - Google Earth Engine calcula NDVI semanal por talhão (se coordenadas disponíveis)
   - NDVI baixo (< 0.3) → alerta de estresse hídrico

4. **Preços CONAB/IBGE → Treinamento:**
   - Dados históricos de preços alimentam o modelo Prophet
   - Dados de produção (IBGE PAM) ajudam a explicar variações de oferta

---

## 4. PLATAFORMA EM NUVEM E ARQUITETURA ALVO

### Comparação Rápida: AWS vs Azure vs GCP

| Aspecto | AWS | Azure | GCP |
|--------|-----|-------|-----|
| **Custo para MVP** | Médio (free tier generoso) | Baixo (créditos iniciais) | Baixo (free tier) |
| **Suporte a IA/LLM** | ✅ Bedrock (Claude, Llama), SageMaker | ✅ Azure OpenAI (GPT-4), Cognitive Services | ✅ Vertex AI (Gemini), AutoML |
| **PostgreSQL Gerenciado** | ✅ RDS PostgreSQL (PostGIS via extensão) | ✅ Azure Database for PostgreSQL (PostGIS) | ✅ Cloud SQL PostgreSQL (PostGIS) |
| **Container Orchestration** | ✅ ECS/Fargate (simples), EKS (K8s) | ✅ Container Instances, AKS | ✅ Cloud Run (serverless), GKE |
| **Armazenamento de Objetos** | ✅ S3 (padrão de mercado) | ✅ Blob Storage | ✅ Cloud Storage |
| **Cache/Redis** | ✅ ElastiCache | ✅ Azure Cache for Redis | ✅ Memorystore |
| **Observabilidade** | ✅ CloudWatch (integrado) | ✅ Application Insights | ✅ Cloud Monitoring |
| **Custo Estimado MVP** | ~$50-100/mês | ~$40-80/mês | ~$30-70/mês |

### Recomendação Principal: **AWS**

**Justificativa:**
- **PostGIS nativo:** RDS PostgreSQL suporta PostGIS via extensão (já usado no projeto)
- **Bedrock para LLM:** Alternativa barata ao OpenAI direto (Claude Haiku ~$0.25/1M tokens vs GPT-4o-mini ~$0.15/1M tokens, mas sem rate limits rígidos)
- **ECS/Fargate:** Simples para deploy de containers Python (FastAPI) e Node.js sem gerenciar servidores
- **S3:** Padrão para armazenar PDFs e modelos treinados
- **CloudWatch:** Logs e métricas integrados, fácil debug
- **Custo controlável:** Free tier (12 meses) + uso sob demanda, fácil escalar depois

### Arquitetura Alvo (AWS)

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                          │
│  - Vercel/Netlify (grátis) ou S3 + CloudFront (AWS)        │
│  - PWA com Service Worker                                   │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              BACKEND NODE.JS (Express)                       │
│  - ECS Fargate (1 task, 0.5 vCPU, 1GB RAM)                  │
│  - Porta 3001, Auto-scaling (1-3 tasks)                     │
│  - RDS PostgreSQL (db.t3.micro, PostGIS + pgvector)        │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼
┌──────────────────┐        ┌──────────────────────┐
│  AI SERVICE      │        │   S3 BUCKET         │
│  (FastAPI)       │        │  - PDFs técnicos    │
│  - ECS Fargate   │        │  - Modelos ML       │
│  - 1 vCPU, 2GB   │        │  - Cache de dados   │
│  - Python 3.12   │        └──────────────────────┘
└──────────────────┘
        │
        ├──► ElastiCache Redis (cache de previsões)
        ├──► Bedrock (Claude Haiku para RAG, opcional)
        └──► External APIs (Open-Meteo, NASA POWER, etc.)

┌─────────────────────────────────────────────────────────────┐
│              SERVIÇOS AUXILIARES                            │
│  - Lambda: ETL agendado (CONAB/IBGE scraping)              │
│  - EventBridge: Cron jobs (ETL diário, treino semanal)     │
│  - CloudWatch: Logs, métricas, alertas                     │
└─────────────────────────────────────────────────────────────┘
```

**Componentes Detalhados:**

1. **Frontend:**
   - **Hospedagem:** Vercel (grátis para projetos open-source) ou S3 + CloudFront (AWS, ~$1/mês)
   - **Build:** `npm run build` → arquivos estáticos
   - **PWA:** Service Worker para cache offline de mapas e dados recentes

2. **Backend Node.js:**
   - **ECS Fargate:** Container Docker, auto-scaling baseado em CPU (70% threshold)
   - **RDS PostgreSQL:** `db.t3.micro` (1 vCPU, 1GB RAM, ~$15/mês) com PostGIS e pgvector
   - **Secrets Manager:** JWT_SECRET, DATABASE_URL (não hardcoded)

3. **AI Service Python:**
   - **ECS Fargate:** Container Python, 1 vCPU, 2GB RAM (~$30/mês)
   - **Modelos ML:** Treinados localmente, salvos em S3, carregados em memória no startup
   - **Cache:** ElastiCache Redis `cache.t3.micro` (~$15/mês) para previsões Prophet (TTL 6h)

4. **Armazenamento:**
   - **S3:** Bucket `agro-ai-documents` (PDFs), `agro-ai-models` (modelos pickle/joblib)
   - **Lifecycle Policy:** PDFs → Glacier após 90 dias (economia)

5. **ETL e Jobs:**
   - **Lambda:** Função Python para scraping CONAB/IBGE (executa diário via EventBridge)
   - **EventBridge:** Cron `0 2 * * ? *` (2h da manhã) para ETL
   - **SQS:** Fila para processamento assíncrono de documentos PDF (ingestão RAG)

---

## 5. EXTENSÕES, FERRAMENTAS E BOAS PRÁTICAS

### Extensões VS Code Recomendadas

| Extensão | Uso |
|----------|-----|
| **Python** (Microsoft) | IntelliSense, debug, linting |
| **Pylance** | Type checking avançado |
| **Prisma** | Autocomplete para schema.prisma |
| **Docker** | Gerenciar containers localmente |
| **REST Client** | Testar APIs (substitui Postman) |
| **GitLens** | Histórico de commits, blame |
| **Error Lens** | Erros inline no editor |
| **Thunder Client** | Testar endpoints FastAPI/Express |

### Ferramentas de Observabilidade

1. **Sentry** (Recomendado para MVP):
   - **Uso:** Error tracking em produção (Python + Node.js)
   - **Custo:** Free tier (5k eventos/mês)
   - **Setup:** `sentry-sdk` no Python, `@sentry/node` no Express

2. **OpenTelemetry** (Opcional, avançado):
   - **Uso:** Tracing distribuído (requisição Frontend → Backend → AI Service)
   - **Custo:** Gratuito (dados enviados para CloudWatch ou Jaeger self-hosted)

3. **CloudWatch Logs Insights** (AWS nativo):
   - **Uso:** Query logs estruturados (ex: "erros de Prophet nos últimos 7 dias")
   - **Custo:** Incluído no uso de ECS/RDS

### Boas Práticas

#### Versionamento (Git)

- **Branches:**
  - `main`: Produção
  - `develop`: Desenvolvimento
  - `feature/*`: Features novas (ex: `feature/prophet-forecast`)
  - `hotfix/*`: Correções urgentes

- **Commits:**
  - Formato: `tipo(escopo): mensagem` (ex: `feat(ml): adiciona Prophet para previsão de preços`)
  - Tipos: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

#### CI/CD (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy to AWS
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Docker images
        run: docker build -t agro-ai-backend ./backend
      - name: Push to ECR
        run: aws ecr get-login-password | docker login --username AWS --password-stdin ${{ secrets.AWS_ECR_URL }}
      - name: Deploy to ECS
        run: aws ecs update-service --cluster agro-ai --service backend --force-new-deployment
```

#### Ambientes

- **Dev:** Local (Docker Compose)
- **Staging:** AWS (réplica menor, para testes)
- **Prod:** AWS (RDS, ECS, S3)

#### Variáveis de Ambiente

- **Gerenciamento:** AWS Secrets Manager ou `.env` (dev) + variáveis no ECS Task Definition (prod)
- **Rotação:** Secrets Manager rotaciona automaticamente (ex: JWT_SECRET a cada 90 dias)

---

## 6. ROADMAP DE PRÓXIMOS PASSOS (1-3 MESES)

### FASE 1: Infra Básica + Refino de Arquitetura (Semanas 1-2)

**Objetivo:** Preparar ambiente AWS e migrar do local para nuvem.

**Tarefas:**

- [ ] **1.1. Setup AWS:**
  - Criar conta AWS (free tier)
  - Configurar IAM user com permissões mínimas (ECS, RDS, S3, ElastiCache)
  - Criar RDS PostgreSQL (db.t3.micro) com PostGIS e pgvector habilitados
  - Criar S3 buckets (`agro-ai-documents`, `agro-ai-models`)

- [ ] **1.2. Containerização:**
  - Criar Dockerfile otimizado para Backend (multi-stage build)
  - Criar Dockerfile otimizado para AI Service (inclui Prophet, XGBoost)
  - Testar localmente com `docker-compose.yml` apontando para RDS AWS

- [ ] **1.3. Deploy Inicial:**
  - Criar ECR (Elastic Container Registry) para imagens Docker
  - Fazer push das imagens
  - Criar ECS Cluster + Services (Backend e AI Service)
  - Configurar Application Load Balancer (ALB) para roteamento

- [ ] **1.4. Migração de Dados:**
  - Exportar dados do PostgreSQL local (`pg_dump`)
  - Importar no RDS AWS
  - Validar integridade (contagem de registros, extensões PostGIS)

- [ ] **1.5. Variáveis de Ambiente:**
  - Mover secrets para AWS Secrets Manager
  - Atualizar ECS Task Definitions para ler secrets
  - Testar conexão Backend → RDS, AI Service → RDS

**Entregável:** Sistema rodando na AWS (staging), acessível via ALB.

---

### FASE 2: Integração de 1º Módulo de ML + 1 API Externa (Semanas 3-4)

**Objetivo:** Implementar Prophet para previsão de preços e integrar dados reais de CONAB.

**Tarefas:**

- [ ] **2.1. Implementar Prophet:**
  - Criar `ai-service/services/price_forecast.py`
  - Treinar modelo Prophet com dados históricos de `CeasaPrice` (últimos 180 dias)
  - Adicionar regressores: `rainfall_7d` (Open-Meteo), `usd_brl` (AwesomeAPI)
  - Implementar função `forecast(days_ahead=30)` que retorna previsão com intervalos de confiança

- [ ] **2.2. Endpoint FastAPI:**
  - Criar rota `POST /api/v1/predict/price-forecast`
  - Input: `{product: "Tomate", region: "SP", days_ahead: 30}`
  - Output: `{forecast: [{date, price, lower, upper}], model_metrics: {mae, rmse}}`

- [ ] **2.3. Integração Backend:**
  - Criar rota Node.js `GET /api/forecast/price` que chama Python
  - Adicionar cache Redis (ElastiCache) com TTL 6h
  - Frontend: Exibir gráfico de previsão no Dashboard

- [ ] **2.4. ETL CONAB Real:**
  - Pesquisar estrutura HTML/API da CONAB (https://www.conab.gov.br)
  - Criar scraper Python (`ai-service/scripts/scrape_conab.py`)
  - Extrair preços de tomate/soja/milho por região
  - Salvar em `CeasaPrice` (upsert por `ceasa_region + product_name + price_date`)

- [ ] **2.5. Lambda + EventBridge:**
  - Criar função Lambda Python para executar scraper CONAB
  - Configurar EventBridge rule (diário, 2h da manhã)
  - Testar execução manual via AWS Console

- [ ] **2.6. Validação:**
  - Comparar previsões Prophet vs regressão polinomial atual
  - Calcular métricas (MAE, RMSE) em dados de teste (últimos 30 dias)
  - Documentar resultados

**Entregável:** Previsão de preços com Prophet funcionando, dados CONAB sendo coletados automaticamente.

---

### FASE 3: Melhorias de UX, Monitoramento, Otimizações (Semanas 5-8)

**Objetivo:** Adicionar RAG avançado, recomendações de manejo e observabilidade.

**Tarefas:**

- [ ] **3.1. RAG Avançado:**
  - Migrar de `text-embedding-3-small` para `text-embedding-3-large`
  - Implementar reranking com `cross-encoder/ms-marco-MiniLM-L-6-v2`
  - Adicionar filtros por metadata (`estado`, `cultura`) na busca vetorial
  - Testar qualidade: perguntas de validação (ex: "Qual a temperatura ideal para tomate?")

- [ ] **3.2. Recomendação de Manejo:**
  - Criar `ai-service/services/agronomic_recommender.py`
  - Implementar regras baseadas em conhecimento (IF-THEN) extraídas de PDFs
  - Treinar `RandomForestClassifier` com dados sintéticos (se dados reais escassos)
  - Endpoint: `POST /api/v1/recommend/practices` (input: clima + solo + cultura)

- [ ] **3.3. Integração Google Earth Engine:**
  - Criar conta GEE (gratuito)
  - Implementar função para calcular NDVI por coordenada (Sentinel-2)
  - Endpoint: `GET /api/v1/satellite/ndvi?lat=-23.5&lng=-46.6`
  - Frontend: Exibir NDVI no mapa (camada de calor)

- [ ] **3.4. Sentry:**
  - Instalar `sentry-sdk` no Python e `@sentry/node` no Express
  - Configurar DSN e ambiente (staging/prod)
  - Testar: forçar erro e verificar no dashboard Sentry

- [ ] **3.5. PWA:**
  - Criar `service-worker.js` no frontend
  - Cache de mapas (Leaflet tiles) e dados recentes (localStorage)
  - Adicionar `manifest.json` com ícones
  - Testar offline: desabilitar rede, verificar se mapa carrega

- [ ] **3.6. Otimizações:**
  - Adicionar índices no PostgreSQL (ex: `CREATE INDEX idx_ceasa_price_date ON "CeasaPrice"(price_date)`)
  - Otimizar queries RAG (usar `LIMIT` antes de reranking)
  - Compressão de respostas API (gzip no ALB)

**Entregável:** Sistema com RAG melhorado, recomendações funcionando, monitoramento ativo, PWA básico.

---

### FASE 4: Testes, Documentação, Deploy Final (Semanas 9-12)

**Objetivo:** Garantir qualidade e preparar para produção.

**Tarefas:**

- [ ] **4.1. Testes Unitários:**
  - Backend: Jest (`npm test`) - testar rotas de autenticação, cálculo de ROI
  - Python: Pytest (`pytest`) - testar `PriceForecastService`, `AgronomicRecommender`
  - Cobertura mínima: 60% (crítico: funções de cálculo financeiro)

- [ ] **4.2. Testes de Integração:**
  - Testar fluxo completo: Frontend → Backend → AI Service → RDS
  - Mockar APIs externas (Open-Meteo, CONAB) para testes determinísticos

- [ ] **4.3. Testes de Carga:**
  - Usar Artillery ou k6
  - Simular 50 usuários simultâneos acessando Dashboard
  - Verificar: latência p95 < 2s, taxa de erro < 1%

- [ ] **4.4. Security Scan:**
  - `npm audit` no backend (corrigir vulnerabilidades)
  - `safety check` no Python (verificar dependências)
  - `bandit` no código Python (análise estática de segurança)

- [ ] **4.5. Documentação:**
  - README atualizado com instruções de deploy AWS
  - Documentação de APIs (Swagger/OpenAPI já existe no FastAPI)
  - Guia de contribuição (como adicionar novo modelo ML)

- [ ] **4.6. Backup Automático:**
  - Configurar RDS Automated Backups (retention 7 dias)
  - Testar restore em ambiente de staging

- [ ] **4.7. Deploy Produção:**
  - Criar ambiente prod separado (RDS maior: `db.t3.small`)
  - Configurar domínio (ex: `agro-ai.example.com`) com SSL (ACM)
  - Migrar dados finais
  - Go-live!

**Entregável:** Sistema em produção, testado, documentado, com backup automático.

---

## 7. RISCOS E PONTOS DE ATENÇÃO

### Limitações de Dados

- **Quantidade:** Dados históricos de preços podem ser escassos (< 1 ano) para alguns produtos/regiões, limitando qualidade do Prophet. **Mitigação:** Usar dados agregados (média nacional) como fallback, complementar com dados sintéticos baseados em sazonalidade conhecida.

- **Qualidade:** Dados de CEASA podem ter inconsistências (unidades mistas: caixa vs kg). **Mitigação:** Manter lógica de normalização robusta (já implementada), validação de outliers (preços > 3x desvio padrão são sinalizados).

- **Regionalização:** Modelos treinados com dados do Sudeste podem não generalizar para Nordeste (clima/solo diferentes). **Mitigação:** Treinar modelos por região (ex: `prophet_model_SP.pkl`, `prophet_model_BA.pkl`) ou adicionar features regionais (latitude, altitude).

### Custos de Nuvem/IA

- **RDS PostgreSQL:** `db.t3.micro` (~$15/mês) pode ficar lento com muitos dados. **Mitigação:** Monitorar CPU/RAM no CloudWatch, escalar para `db.t3.small` (~$30/mês) se necessário.

- **OpenAI API:** RAG com `gpt-4o-mini` custa ~$0.15/1M tokens input. Com 100 perguntas/dia (média 500 tokens cada) = ~$2.25/mês. **Mitigação:** Cache de respostas frequentes, considerar `claude-3-haiku` (mais barato) ou AWS Bedrock.

- **ECS Fargate:** 2 tasks (Backend + AI Service) = ~$50/mês. **Mitigação:** Usar Spot Instances (50% desconto, mas pode ser interrompido) ou reduzir recursos (0.25 vCPU se CPU < 50%).

- **ElastiCache Redis:** `cache.t3.micro` (~$15/mês). **Mitigação:** Se cache hit rate < 60%, considerar remover (não vale o custo).

**Estimativa Total MVP:** ~$100-150/mês (AWS) + $2-5/mês (OpenAI) = **~$105-155/mês**

### Questões de Privacidade e Segurança

- **LGPD:** Dados de usuários (email, nome) devem ser tratados conforme LGPD. **Mitigação:** Política de privacidade clara, consentimento explícito no cadastro, direito ao esquecimento (deletar conta).

- **Dados Agrícolas Sensíveis:** Coordenadas de propriedades podem identificar produtores. **Mitigação:** Anonimizar coordenadas (arredondar para ~1km de precisão) ou solicitar consentimento para dados precisos.

- **Segurança de APIs:** Tokens JWT devem ter expiração curta (15min) + refresh tokens. **Mitigação:** Já implementado, mas validar que `JWT_SECRET` está em Secrets Manager (não hardcoded).

- **Vulnerabilidades de Dependências:** `npm audit` e `safety check` devem rodar no CI/CD. **Mitigação:** Automatizar no GitHub Actions, bloquear merge se vulnerabilidades críticas.

---

## 8. CONCLUSÃO

Este plano de evolução transforma o **agro-ai-prototype** de um MVP funcional em uma **plataforma de decisão agrícola robusta** com:

- ✅ **ML avançado:** Prophet para previsões, RAG melhorado, recomendações de manejo
- ✅ **Dados reais:** Integração CONAB, IBGE, Google Earth Engine
- ✅ **Arquitetura escalável:** AWS com ECS, RDS, S3, ElastiCache
- ✅ **Observabilidade:** Sentry, CloudWatch, testes automatizados
- ✅ **Custo controlado:** ~$100-150/mês para MVP

**Próximo passo imediato:** Escolher entre começar pela **Fase 1 (Infra AWS)** ou **Fase 2 (Prophet + CONAB)** dependendo da prioridade (infraestrutura vs funcionalidades).

---

**Documento criado em:** Dezembro 2025  
**Última atualização:** Dezembro 2025  
**Versão:** 1.0

