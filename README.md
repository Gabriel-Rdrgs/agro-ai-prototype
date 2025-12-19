# 🌾 Agro-AI Prototype (AgroArbitrage IA)

**Plataforma de Inteligência Agrícola para Arbitragem, Clima, Logística e RAG em Documentos Técnicos**

Este repositório contém um sistema full-stack composto por:
- **Frontend** React (dashboard, mapas, simuladores)
- **Backend** Node.js/Express (API pública, autenticação, orquestração)
- **Serviço de IA** em Python/FastAPI (cálculos, predições, RAG)
- **Banco de dados** PostgreSQL com **PostGIS** e **pgvector**

Foco atual: **tomate de mesa** no Brasil, com base em PDFs técnicos (Embrapa, UFG, ZARC) e integrações CEASA/Agrolink.

---

## 📌 Visão Geral

O Agro-AI Prototype é um **Sistema de Suporte à Decisão (DSS)** para operações agrícolas e de arbitragem de hortifrúti, com 3 pilares principais:

### 1. Arbitragem e fluxo comercial
- Oportunidades entre origens (CEASA/produção) e destinos (centros consumidores)
- Cálculo de ROI real considerando frete, dólar, sazonalidade e risco

### 2. Inteligência climática e produtiva
- Consumo de APIs climáticas (Open-Meteo, NASA POWER)
- Análise de armazenagem com base em perdas diárias, radiação, chuva e calendário de plantio
- Simulações de produção e arbitragem interestadual

### 3. Camada de IA / RAG em PDFs
- Ingestão de documentos técnicos (PDFs agrícolas)
- Vetorização com OpenAI Embeddings (`text-embedding-3-small`)
- Busca semântica com pgvector e resposta via LLM (`gpt-4o-mini`)

---

## 🏗 Arquitetura Técnica

### Componentes

**Frontend (React)**
- SPA com mapas interativos (Leaflet), dashboards, tabelas e simuladores
- Comunicação via Axios com o backend Node
- Autenticação via Supabase Auth (JWT tokens)
- Filtros avançados com persistência em localStorage
- Componentes principais:
  - `MapView.jsx` - Mapa com oportunidades, filtros, heatmap
  - `AgronomicChat.jsx` - Chat RAG para consultas agronômicas
  - `Sidebar.jsx` - Filtros de oportunidades (ROI, estados, produtos, safras)

**Backend (Node.js + Express)**
- Autenticação via Supabase Auth (JWT)
- RBAC (Role-Based Access Control) - Admin/User
- Endpoints principais:
  - `GET /api/opportunities` – Lista oportunidades (com cache, paginação)
  - `POST /api/ai/batch` – Processamento em lote com Prophet
  - `POST /api/ai/chat/query` – Chat RAG (proxy para Python)
  - `GET /api/ceasa/*` – Dados CEASA (preços, sincronização)
  - `POST /api/admin/etl/start` – Iniciar ETL (requer admin)
  - `GET /health` – Health check básico
  - `GET /health/detailed` – Health check detalhado
- Orquestração com o serviço Python via `PYTHON_API_URL`
- Cache em memória (LRU) para performance
- Circuit breaker para proteção do banco

**AI Service (Python + FastAPI)**
- Endpoints sob `/api/v1/*`:
  - `POST /predict/storage` – Análise de armazenagem com IA
  - `POST /predict/batch` – Previsão em lote (Prophet)
  - `POST /calc/production` – Cálculo de ROI de produção
  - `POST /calc/arbitrage` – Cálculo de arbitragem interestadual
  - `POST /chat/query` – Chat RAG (consultas agronômicas)
  - `GET /health` – Health check básico
  - `GET /health/detailed` – Health check completo
  - `GET /admin/*` – Ferramentas administrativas (ETL, cache)
- Módulos de serviço:
  - `price_forecast.py` – Prophet + fallback para previsão de preços
  - `storage_advisor.py` – Análise de armazenagem
  - `market_intelligence.py` – Sazonalidade e tendências
  - `arbitrage_calculator.py` – Arbitragem interestadual
  - `rag_service.py` – RAG em documentos PDFs
  - `rag_ingestion.py` – Ingestão de PDFs no banco vetorial

**Banco de Dados (PostgreSQL)**
- **Prisma** no backend (schema em `backend/prisma/schema.prisma`)
- Extensões:
  - `postgis` – campo `geom` para oportunidades (consultas geoespaciais)
  - `vector` – campo `embedding` em `Document` para RAG
- Principais modelos:
  - `Opportunity`, `PriceHistory`
  - `User`, `RefreshToken`, `AuditLog`
  - `CeasaPrice`, `CeasaSyncLog`
  - `FuelPrice`
  - `Document` (chunks de PDFs + embeddings)

---

## 🧭 Fluxo de Dados (alto nível)

1. **Dados de mercado**
   - ETLs em `ai-service/scripts/` consultam CEASA/Agrolink periodicamente
   - Dados são gravados em `CeasaPrice` e relacionados a `Opportunity`/`PriceHistory`

2. **Dados climáticos e radiação**
   - `services/climate/intelligence.py` consulta:
     - Open-Meteo (histórico + previsão)
     - NASA POWER (radiação solar diária)
   - Resultados cacheados (LRU + TTL configurável) para redução de latência

3. **Cálculos e simulações**
   - Backend consolida dados do Prisma + respostas da IA em Python
   - Usuário interage via frontend:
     - Mapa → escolhe origem/destino
     - Formulário → preenche parâmetros de produção/armazenagem
   - Resultados voltam como JSON prontos para gráficos

4. **RAG em documentos**
   - PDFs técnicos são ingeridos via scripts usando `rag_ingestion.py`
   - Texto é quebrado em chunks, vetorizado com OpenAI Embeddings
   - Queries do usuário caem em `/api/v1/chat/ask`
   - Serviço RAG faz:
     - Busca vetorial (pgvector)
     - Montagem de contexto
     - Chamada ao LLM (`gpt-4o-mini`)
     - Resposta citando fontes (metadados dos chunks)

---

## 📦 Stack Tecnológico

| Camada        | Tecnologia principal           |
|---------------|--------------------------------|
| Frontend      | React 18, Leaflet, Chart.js   |
| Backend       | Node.js, Express, Prisma ORM  |
| IA / ML / RAG | Python 3.12, FastAPI, LangChain, OpenAI |
| Banco         | PostgreSQL + PostGIS + pgvector |
| Infra         | Vercel, Railway, Render       |

---

## 🚀 Como Rodar o Projeto Localmente

### Pré-requisitos

- Node.js 18+
- Python 3.10+
- PostgreSQL (local, Supabase ou Neon)
- Git
- Chave OpenAI (`OPENAI_API_KEY`) para a camada de RAG

### 1️⃣ Banco de Dados

Crie um banco PostgreSQL, habilitando as extensões:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS vector;
```

Configure `DATABASE_URL` para apontar para esse banco (ver seções de `.env` abaixo).

### 2️⃣ Backend (Node.js – porta 3001)

```bash
cd backend
npm install
```

Crie um `.env` (veja exemplo em `backend/.env.example`):

```env
DATABASE_URL=postgresql://user:password@localhost:5432/agro_ai
JWT_SECRET=algum_token_seguro_aqui
PYTHON_API_URL=http://localhost:8000
PORT=3001
AWESOME_API_URL=https://economia.awesomeapi.com.br
```

Rode migrations e seed:

```bash
npx prisma migrate dev --name init
node prisma/seed.js
```

Inicie o backend:

```bash
npm run dev
# http://localhost:3001
```

### 3️⃣ AI Service (Python – porta 8000)

```bash
cd ai-service
python -m venv venv

# Windows
.\venv\Scripts\activate
# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
```

Crie `.env` em `ai-service/`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/agro_ai
OPENAI_API_KEY=sk-...
ENVIRONMENT=development
PORT=8000
```

Inicie o serviço:

```bash
uvicorn main:app --reload --port 8000
# http://localhost:8000/docs
```

### 4️⃣ Frontend (React – porta 3000)

```bash
cd frontend
npm install
```

Crie `.env.local`:

```env
REACT_APP_API_URL=http://localhost:3001
REACT_APP_MAP_TOKEN=seu_token_de_mapa_aqui
```

Inicie o frontend:

```bash
npm start
# http://localhost:3000
```

---

## 🔐 Segurança

- **JWT**:
  - Usado para proteger rotas do backend e do serviço Python
  - `JWT_SECRET` **não** deve ser commitado
- **CORS**:
  - Backend Node e FastAPI usam CORS; configure origens permitidas para produção
- **Senhas**:
  - Senhas de usuário armazenadas com hash (bcrypt)
- **Auditoria**:
  - Tabela `AuditLog` prevista para rastrear ações críticas (login, criação de oportunidade, etc.)

---

## 🧠 RAG – Documentos Agrícolas

A camada de RAG permite consultar documentos técnicos agrícolas em linguagem natural.

### Arquivos Principais
- `ai-service/services/rag_service.py` - Serviço RAG (busca vetorial + LLM)
- `ai-service/services/rag_ingestion.py` - Ingestão de PDFs
- Modelo `Document` em `backend/prisma/schema.prisma` (com `embedding vector(1536)`)

### Fluxo

1. **Ingestão de PDFs**:
   ```bash
   # Dentro do container Docker
   docker exec -it agro_brain python services/rag_ingestion.py
   ```
   - Script lê PDFs, extrai texto, gera chunks (1000 chars, overlap 200)
   - Gera embeddings via OpenAI (`text-embedding-3-small`)
   - Salva em tabela `documents` com metadata rica (crop, theme, source_type)

2. **Consulta**:
   - Frontend: `POST /api/ai/chat/query` → Backend → `POST /api/v1/chat/query` (Python)
   - Gera embedding da pergunta
   - Busca vetorial no Postgres (pgvector, top 8 chunks)
   - Envia contexto + pergunta para LLM (`gpt-4o-mini`)
   - Responde em linguagem natural, citando fontes (PDF, página)

### Documentos Ingeridos
- ✅ Clima e Produção de Tomates no Brasil.pdf
- ✅ Função Custo de Armazenagem de Tomate.pdf
- ✅ Épocas de Plantio e Métricas de Decisão para Cultivo de Tomate no Brasil.pdf

---

## 🛰 Integrações Externas

- **Open-Meteo** – previsão e histórico de clima
- **NASA POWER** – radiação solar diária para análise de fotossíntese / brix
- **AwesomeAPI** – cotação do dólar em tempo real
- **CEASA / Agrolink** – dados de preços de hortifrúti (via ETL Python)
- **OpenAI** – Embeddings (`text-embedding-3-small`) e LLM (`gpt-4o-mini`) para RAG
- **Supabase** – Banco de dados PostgreSQL + Auth + PostGIS + pgvector

---

## 🏥 Health Checks e Monitoramento

### Endpoints de Health Check

**Backend Node.js:**
- `GET /health` - Health check básico (rápido, para load balancers)
- `GET /health/detailed` - Health check completo (banco, serviços, APIs, recursos)

**Python AI Service:**
- `GET /health` - Health check básico
- `GET /health/detailed` - Health check completo
- `GET /health/database` - Verifica apenas banco
- `GET /health/services` - Verifica apenas serviços
- `GET /health/external` - Verifica apenas APIs externas

Veja mais em: `docs/GUIA_HEALTH_CHECKS.md`

---

## 💾 Backup e Manutenção

### Scripts de Backup

**Backup PostgreSQL:**
```bash
# Script Bash
./scripts/backup_postgres.sh --compress --retention 7

# Script Python
python scripts/backup_postgres.py --compress --retention 7
```

**Funcionalidades:**
- Backup completo do banco (pg_dump)
- Compressão opcional (gzip) - Economiza ~70-80% de espaço
- Retenção automática (remove backups antigos)
- Logging detalhado

Veja mais em: `docs/GUIA_BACKUP_POSTGRES.md`

---

## 🧪 Testes

### Testes Automatizados

- **Python (Pytest)**: 15 testes
  - `ai-service/tests/test_prophet.py` - 8 testes (previsão Prophet)
  - `ai-service/tests/test_rag.py` - 7 testes (serviço RAG)
  - Cobertura: `price_forecast.py` (60%), `rag_service.py` (85%)
  
- **Backend Node.js (Jest)**: 41 testes
  - `backend/tests/api/` - 21 testes (endpoints críticos)
  - `backend/tests/auth/` - 20 testes (autenticação e RBAC)
  
- **CI/CD**: GitHub Actions roda todos os testes automaticamente em cada push/PR
  - Ver: `.github/workflows/test.yml`
  - Status: [![Tests](https://github.com/Gabriel-Rdrgs/agro-ai-prototype/actions/workflows/test.yml/badge.svg)](https://github.com/Gabriel-Rdrgs/agro-ai-prototype/actions)

### Como Rodar Localmente

**Python:**
```bash
cd ai-service
pytest tests/ -v
```

**Backend:**
```bash
cd backend
npm test
```

Veja mais em:
- `ai-service/tests/README.md`
- `backend/tests/README.md`

---

## 🗺 Roadmap

- [ ] Refinar camada de RAG para cobrir múltiplos PDFs de tomate (Embrapa/UFG/ZARC)
- [ ] Adicionar reranking e filtros por metadata (estado, tipo de risco, fase da cultura)
- [ ] Integrar PostGIS para queries geoespaciais avançadas (raio, rotas)
- [ ] Implementar notificações (WhatsApp / SMS) para oportunidades críticas
- [ ] Evoluir scheduler de ETL para Celery + Redis
- [ ] Multi-tenant architecture para suportar múltiplas organizações
- [ ] Mobile app com React Native + offline-first
- [ ] Integração Blockchain para rastreabilidade de lote

---

## 📚 Documentação

### Documentos Principais

- **[API Reference](docs/API_REFERENCE.md)** - Documentação completa de todos os endpoints
- **[Guia de Uso](docs/GUIA_USO_CLIENTE.md)** - Guia para usuários finais
- **[Health Checks](docs/GUIA_HEALTH_CHECKS.md)** - Guia de monitoramento e health checks
- **[Backup PostgreSQL](docs/GUIA_BACKUP_POSTGRES.md)** - Guia de backup e restauração
- **[CI/CD](docs/GUIA_CI_CD.md)** - Guia de integração contínua e deploy
- **[Schema Documents](docs/SCHEMA_DOCUMENTS_CONTRACT.md)** - Contrato de schema da tabela `documents`

### Documentação Técnica

- **[Análise Arquitetural](docs/ANALISE_ARQUITETURAL_COMPLETA.md)** - Análise completa da arquitetura
- **[Testes Automatizados](docs/RESUMO_TESTES_AUTOMATIZADOS.md)** - Resumo dos testes Python
- **[Resultados dos Testes](docs/RESULTADOS_TESTES.md)** - Métricas e cobertura de código

---

## 📄 Contribuindo

Pull requests são bem-vindas! Para mudanças maiores:

1. Faça um fork do repositório
2. Crie uma branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

---

## 📄 Licença

Licença MIT – ver arquivo `LICENSE` na raiz do projeto.

---

## 📞 Contato

- **Desenvolvedor**: Gabriel Rodrigues
- **GitHub**: [@Gabriel-Rdrgs](https://github.com/Gabriel-Rdrgs)
- **Email**: gabriel.rdrgs@example.com (opcional)

---

**Última atualização**: Dezembro de 2025
