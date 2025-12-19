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
- SPA com mapas, dashboards, tabelas e simuladores
- Comunicação via Axios com o backend Node
- Usa tokens JWT para proteger as rotas autenticadas

**Backend (Node.js + Express)**
- Autenticação (login, registro, refresh token) com JWT
- Exposição de endpoints de negócio:
  - `/api/opportunities` – oportunidades de arbitragem
  - `/api/weather` – clima consolidado por coordenada
  - `/api/analytics/trend` – histórico de preços
  - `/api/ai/storage`, `/api/ai/batch` – ponte para IA em Python
  - `/calc/production`, `/calc/arbitrage` – simuladores
  - `/api/ceasa/*` – dados CEASA
- Orquestração com o serviço Python via `PYTHON_API_URL`

**AI Service (Python + FastAPI)**
- Endpoints sob `/api/v1/*`:
  - `/predict/storage`, `/predict/batch`, `/predict/market/scan`
  - `/calc/production`, `/calc/arbitrage`
  - `/admin/*` (ETL, correções de dados)
  - `/chat/*` (RAG)
  - `/weather/*` (inteligência climática)
- Módulos de serviço:
  - `storage_advisor.py` – análise de armazenagem
  - `market_intelligence.py` – sazonalidade e tendências
  - `arbitrage_calculator.py` – arbitragem interestadual
  - `fuel_pricing.py` – preços de combustível por estado
  - `rag_service.py` / `rag_ingestion.py` – RAG em PDFs

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

A camada de RAG fica em:

- `ai-service/services/rag_service.py`
- `ai-service/services/rag_ingestion.py`
- Modelo `Document` em `backend/prisma/schema.prisma`

### Fluxo

1. **Ingestão de PDFs**:
   - Script lê PDFs, extrai texto, gera chunks e embeddings
   - Salva em tabela `documents` com coluna `embedding (vector(1536))`

2. **Consulta**:
   - Endpoint `POST /api/v1/chat/ask` recebe `{"question": "..."}`
   - Gera embedding da pergunta
   - Faz busca vetorial no Postgres
   - Envia contexto + pergunta para LLM
   - Responde em linguagem natural, citando fontes (nome do PDF, página, etc.)

---

## 🛰 Integrações Externas

- **Open-Meteo** – previsão e histórico de clima
- **NASA POWER** – radiação solar diária para análise de fotossíntese / brix
- **AwesomeAPI** – cotação do dólar em tempo real
- **CEASA / Agrolink** – dados de preços de hortifrúti (via ETL Python)

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
