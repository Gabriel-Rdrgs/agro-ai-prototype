<div align="center">

# 🌾 Agro-AI Prototype

**Plataforma de Inteligência Agrícola com IA para Arbitragem, Clima e Consultas Agronômicas**

[![Python](https://img.shields.io/badge/Python-3.12-blue.svg)](https://www.python.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19.2-blue.svg)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-teal.svg)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue.svg)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[🚀 Funcionalidades](#-funcionalidades-principais) • [📋 Pré-requisitos](#-pré-requisitos) • [⚙️ Instalação](#️-como-instalar-e-rodar) • [🏗️ Arquitetura](#️-arquitetura-do-sistema) • [📚 Documentação](#-documentação)

</div>

---

## 📖 O Que É Este Projeto?

O **Agro-AI Prototype** é um sistema completo de inteligência artificial para o agronegócio brasileiro. Ele ajuda produtores rurais, comerciantes e investidores a tomar decisões mais inteligentes sobre quando e onde comprar/vender produtos agrícolas, considerando:

- 💰 **Preços de mercado** (CEASA, Agrolink, CONAB)
- 🌤️ **Condições climáticas** (chuva, temperatura, radiação solar)
- 📊 **Previsões de preços** (usando IA - Prophet)
- 📚 **Conhecimento técnico** (consultas em documentos científicos via chat IA)
- 🗺️ **Oportunidades de arbitragem** (comprar em um estado e vender em outro)

### 🎯 Para Quem É Este Sistema?

| Público | Como Usa |
|--------|----------|
| **Produtores Rurais** | Descobrem a melhor época de plantio, analisam condições climáticas e consultam documentos técnicos |
| **Comerciantes/Atacadistas** | Encontram oportunidades de compra/venda entre diferentes regiões do Brasil |
| **Investidores** | Analisam ROI (retorno sobre investimento) de operações agrícolas |
| **Agrônomos** | Consultam rapidamente documentos técnicos (Embrapa, UFG, ZARC) via chat IA |

---

## ✨ Funcionalidades Principais

### 1. 🗺️ Mapa Interativo de Oportunidades

Visualize no mapa do Brasil todas as oportunidades de compra/venda de produtos agrícolas:

- **Marcadores coloridos** por ROI (verde = alto, vermelho = baixo)
- **Filtros avançados**: por produto, estado, ROI mínimo, época de plantio
- **Heatmap** de regiões com maior concentração de oportunidades
- **Badges de eventos extremos**: granizo, ondas de calor/frio, tempestades
- **Modal detalhado** com 4 abas:
  - 💰 **Financeiro**: ROI, preços, frete, lucro projetado
  - 🌡️ **Clima**: previsão de chuva, temperatura, eventos extremos
  - 📊 **Qualidade**: shelf-life, perdas estimadas, condições de armazenagem
  - 🤖 **IA**: recomendação automática (COMPRAR / NÃO COMPRAR / AGUARDAR)

### 2. 📊 Dashboard de Análises

- **Gráficos de tendências** de preços (últimos 90 dias)
- **Melhores oportunidades** do momento (ordenadas por ROI)
- **Favoritos**: salve oportunidades para acompanhar
- **Análise de mercado**: médias móveis, sazonalidade

### 3. 🤖 Chat Agronômico com IA (RAG)

Faça perguntas em linguagem natural sobre cultivos agrícolas:

**Exemplos de perguntas:**
- "Qual a época ideal de plantio de tomate em Goiás?"
- "Quais as temperaturas ideais para soja na fase de floração?"
- "Como calcular o custo de armazenagem de milho?"

**Como funciona:**
1. Você faz uma pergunta
2. O sistema busca nos documentos técnicos (PDFs da Embrapa, UFG, ZARC)
3. A IA responde citando as fontes (qual PDF, qual página)

**Documentos disponíveis:**
- ✅ Clima e Produção de Tomates no Brasil
- ✅ Função Custo de Armazenagem de Tomate
- ✅ Épocas de Plantio e Métricas de Decisão para Cultivo de Tomate
- 🔄 Soja e Milho (em implementação)

### 4. 💰 Calculadoras de ROI

#### **Calculadora de Produção**
Calcule o retorno sobre investimento de uma produção agrícola:
- Área plantada (hectares)
- Custo por hectare
- Produtividade esperada
- Preço de venda projetado
- **Resultado**: ROI, lucro líquido, análise de risco

#### **Calculadora de Arbitragem**
Encontre oportunidades de comprar em um estado e vender em outro:
- Origem e destino (estados/cidades)
- Produto e volume
- **Resultado**: ROI considerando frete, dólar, perdas, comissões

### 5. 🌤️ Análise Climática Inteligente

- **Previsão de 16 dias** (Open-Meteo)
- **Radiação solar** (NASA POWER) - importante para fotossíntese
- **Eventos extremos**: granizo, ondas de calor/frio, tempestades tropicais
- **Comparação histórica**: chuva atual vs. mesmo período do ano anterior
- **Análise de risco climático**: impacto na produtividade

### 6. 📈 Previsão de Preços com IA (Prophet)

O sistema usa **Prophet** (Facebook) para prever preços futuros:
- **7 dias à frente**: preço projetado
- **30 dias à frente**: tendência de longo prazo
- **Sazonalidade**: considera padrões históricos (ex: preços altos no inverno)
- **Fallback inteligente**: se não houver dados suficientes, usa modelos alternativos

### 7. 🏪 Integração com Mercados (ETL Automatizado)

Dados coletados automaticamente de:
- **CEASA** (SP, PR, MG, RJ, RS, GO, BA, PE)
- **Agrolink** (portal de preços agrícolas)
- **CONAB** (Companhia Nacional de Abastecimento)
- **IBGE SIDRA** (dados de produção agrícola)
- **ZARC** (Zoneamento Agrícola de Risco Climático - MAPA)

---

## 🏗️ Arquitetura do Sistema

### 📐 Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                    👤 USUÁRIO (Navegador)                    │
│              React App (Dashboard, Mapa, Chat)             │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS (JWT Token)
                       │
┌──────────────────────▼──────────────────────────────────────┐
│            🔵 BACKEND NODE.JS (Porta 3001)                  │
│  • Express.js (API REST)                                    │
│  • Autenticação (Supabase Auth)                             │
│  • Cache em memória (LRU)                                   │
│  • Jobs assíncronos (ETL)                                   │
└──────┬───────────────────────────────┬──────────────────────┘
       │                               │
       │ Prisma ORM                    │ HTTP + API Key
       │                               │
       ↓                               ↓
┌──────────────────────┐    ┌──────────────────────────────────┐
│  🗄️ POSTGRESQL        │    │  🐍 AI SERVICE PYTHON (8000)     │
│  (Supabase)          │    │  • FastAPI                        │
│  • PostGIS           │    │  • Prophet (ML)                   │
│  • pgvector          │    │  • RAG (OpenAI)                    │
│  • Dados de negócio  │    │  • Cálculos complexos              │
└──────────────────────┘    └──────┬────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ↓               ↓               ↓
        ┌──────────────────┐  ┌──────────┐  ┌──────────────┐
        │  🗄️ POSTGRESQL    │  │  🤖 OPENAI│  │  🌐 APIs      │
        │  (Vetores RAG)   │  │  • Embed │  │  • Open-Meteo │
        │                  │  │  • LLM   │  │  • NASA POWER │
        └──────────────────┘  └──────────┘  │  • CEASA      │
                                             │  • Agrolink   │
                                             │  • IBGE       │
                                             └──────────────┘
```

### 🔄 Fluxo de Dados: Exemplo Prático

**Cenário:** Usuário pergunta "Qual a época ideal de plantio de tomate em Goiás?"

```
1. 👤 Usuário digita pergunta no chat
   ↓
2. 📱 Frontend (React) → POST /api/ai/chat/query
   ↓
3. 🔵 Backend (Node.js) → Valida JWT → Proxy para Python
   ↓
4. 🐍 AI Service (Python) → RAG Service
   ├─→ Gera embedding da pergunta (OpenAI)
   ├─→ Busca no banco vetorial (pgvector) → Top 8 chunks similares
   ├─→ Monta contexto + pergunta
   └─→ Chama LLM (gpt-4o-mini) → Resposta + fontes
   ↓
5. 📱 Frontend exibe resposta com citações (PDF, página)
```

### 📦 Stack Tecnológico Completo

| Camada | Tecnologias | Versão | Para Que Serve |
|--------|-------------|--------|----------------|
| **Frontend** | React, Leaflet, Chart.js, Axios | React 19.2 | Interface do usuário (mapas, gráficos, chat) |
| **Backend** | Node.js, Express, Prisma, Supabase Auth | Node 18+ | API REST, autenticação, orquestração |
| **IA/ML** | Python, FastAPI, Prophet, LangChain, OpenAI | Python 3.12 | Previsões, RAG, cálculos complexos |
| **Banco** | PostgreSQL, PostGIS, pgvector | PostgreSQL 15+ | Dados de negócio + vetores para RAG |
| **Infra** | Railway, Vercel, Docker | - | Hospedagem e containers |
| **Observabilidade** | Sentry, Winston | - | Monitoramento de erros e logs |

---

## 📋 Pré-requisitos

### Para Usuários Finais (Apenas Usar o Sistema)

✅ **Nenhum pré-requisito técnico!**  
O sistema roda na nuvem. Basta acessar via navegador.

### Para Desenvolvedores (Rodar Localmente)

| Requisito | Versão Mínima | Como Verificar |
|-----------|---------------|----------------|
| **Node.js** | 18+ | `node --version` |
| **Python** | 3.10+ | `python --version` |
| **PostgreSQL** | 12+ | `psql --version` |
| **Git** | Qualquer | `git --version` |
| **Docker** (opcional) | 20+ | `docker --version` |

### Chaves de API Necessárias

| API | Obrigatória? | Como Obter | Para Que Serve |
|-----|--------------|------------|----------------|
| **OpenAI** | ✅ Sim | [platform.openai.com](https://platform.openai.com) | RAG (chat agronômico) |
| **Supabase** | ✅ Sim | [supabase.com](https://supabase.com) | Banco de dados + Auth |
| **Google Maps** | ⚠️ Opcional | [console.cloud.google.com](https://console.cloud.google.com) | Cálculo preciso de distâncias (fallback: Haversine) |

---

## ⚙️ Como Instalar e Rodar

### 🐳 Opção 1: Docker Compose (Recomendado - Mais Fácil)

```bash
# 1. Clone o repositório
git clone https://github.com/Gabriel-Rdrgs/agro-ai-prototype.git
cd agro-ai-prototype

# 2. Configure as variáveis de ambiente
# Copie e edite os arquivos .env (veja seção "Configuração" abaixo)

# 3. Inicie todos os serviços
docker-compose up -d

# 4. Acesse:
# - Frontend: http://localhost:3000
# - Backend: http://localhost:3001
# - AI Service: http://localhost:8000/docs
```

### 💻 Opção 2: Instalação Manual (Passo a Passo)

#### **Passo 1: Banco de Dados**

```bash
# Crie um banco PostgreSQL (local ou Supabase)
# Habilite as extensões necessárias:

psql -U seu_usuario -d agro_ai << EOF
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS vector;
EOF
```

#### **Passo 2: Backend (Node.js)**

```bash
cd backend

# Instale dependências
npm install

# Configure variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais

# Rode migrations do banco
npx prisma migrate dev --name init

# Popule dados iniciais (opcional)
node prisma/seed.js

# Inicie o servidor
npm run dev
# ✅ Backend rodando em http://localhost:3001
```

#### **Passo 3: AI Service (Python)**

```bash
cd ai-service

# Crie ambiente virtual
python -m venv venv

# Ative o ambiente virtual
# Windows:
.\venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Instale dependências
pip install -r requirements.txt

# Configure variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais

# Inicie o servidor
uvicorn main:app --reload --port 8000
# ✅ AI Service rodando em http://localhost:8000/docs
```

#### **Passo 4: Frontend (React)**

```bash
cd frontend

# Instale dependências
npm install

# Configure variáveis de ambiente
cp .env.local.example .env.local
# Edite .env.local com a URL do backend

# Inicie o servidor de desenvolvimento
npm start
# ✅ Frontend rodando em http://localhost:3000
```

### ⚙️ Configuração de Variáveis de Ambiente

#### **Backend (`backend/.env`)**

```env
# Banco de Dados
DATABASE_URL=postgresql://usuario:senha@localhost:5432/agro_ai
DIRECT_URL=postgresql://usuario:senha@localhost:5432/agro_ai

# Autenticação
JWT_SECRET=seu_jwt_secret_super_seguro_aqui
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua_chave_anon_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role_aqui

# Serviços
PYTHON_API_URL=http://localhost:8000
INTERNAL_API_KEY=chave_compartilhada_entre_node_e_python
PORT=3001

# APIs Externas
AWESOME_API_URL=https://economia.awesomeapi.com.br

# Observabilidade (Opcional)
SENTRY_DSN=sua_dsn_do_sentry_aqui
```

#### **AI Service (`ai-service/.env`)**

```env
# Banco de Dados
DATABASE_URL=postgresql://usuario:senha@localhost:5432/agro_ai

# OpenAI (Obrigatório para RAG)
OPENAI_API_KEY=sk-...

# Google Maps (Opcional)
GOOGLE_MAPS_API_KEY=sua_chave_aqui

# Autenticação Interna
INTERNAL_API_KEY=chave_compartilhada_entre_node_e_python

# Ambiente
ENVIRONMENT=development
PORT=8000
```

#### **Frontend (`frontend/.env.local`)**

```env
REACT_APP_API_URL=http://localhost:3001
REACT_APP_MAP_TOKEN=seu_token_do_leaflet_aqui
```

---

## 🎯 Como Usar o Sistema

### 🗺️ Visualizando Oportunidades no Mapa

1. **Acesse o mapa** (aba "Mapa" no menu)
2. **Use os filtros** na lateral:
   - Produto (Tomate, Soja, Milho)
   - Estado de origem
   - ROI mínimo desejado
   - Época de plantio
3. **Clique em um marcador** para ver detalhes completos
4. **Analise as 4 abas**:
   - 💰 Financeiro: ROI, preços, lucro
   - 🌡️ Clima: previsão, eventos extremos
   - 📊 Qualidade: shelf-life, perdas
   - 🤖 IA: recomendação automática

### 🤖 Fazendo Perguntas ao Chat Agronômico

1. **Acesse o chat** (aba "Chat Agronômico")
2. **Digite sua pergunta** em linguagem natural:
   - "Qual a temperatura ideal para tomate?"
   - "Como calcular custo de armazenagem?"
   - "Qual época de plantio em Goiás?"
3. **Aguarde a resposta** (pode levar alguns segundos)
4. **Veja as fontes** citadas (qual PDF, qual página)

### 💰 Calculando ROI de Produção

1. **Acesse a calculadora** (aba "Simulador")
2. **Preencha os dados**:
   - Produto
   - Estado
   - Área (hectares)
   - Custo por hectare
   - Produtividade esperada
   - Preço de venda
3. **Clique em "Calcular"**
4. **Veja o resultado**: ROI, lucro líquido, análise de risco

### 📊 Analisando Tendências de Mercado

1. **Acesse o dashboard** (aba "Dashboard")
2. **Veja gráficos** de tendências de preços
3. **Explore as melhores oportunidades** do momento
4. **Salve favoritos** para acompanhar

---

## 🏗️ Estrutura do Projeto

```
agro-ai-prototype/
│
├── 📱 frontend/                 # Aplicação React
│   ├── src/
│   │   ├── components/          # Componentes React
│   │   │   ├── Map/            # Mapa interativo
│   │   │   ├── Chat/           # Chat RAG
│   │   │   ├── Dashboard/      # Dashboard
│   │   │   └── ...
│   │   ├── services/            # Serviços de API
│   │   └── utils/              # Utilitários
│   └── package.json
│
├── 🔵 backend/                  # API Node.js
│   ├── server.js               # Servidor principal
│   ├── routes/                 # Rotas da API
│   ├── utils/                  # Utilitários (cache, jobs)
│   ├── prisma/
│   │   └── schema.prisma       # Schema do banco
│   └── package.json
│
├── 🐍 ai-service/               # Serviço de IA (Python)
│   ├── main.py                 # FastAPI app
│   ├── routers/                # Endpoints da API
│   ├── services/                # Lógica de negócio
│   │   ├── rag_service.py      # RAG (chat IA)
│   │   ├── price_forecast.py   # Prophet (previsões)
│   │   ├── storage_advisor.py  # Análise de armazenagem
│   │   └── ...
│   ├── config/                 # Configurações
│   │   ├── crops.py            # Especificações de culturas
│   │   ├── calendar.py         # Calendário de plantio
│   │   └── ...
│   ├── models/                 # Modelos de dados
│   ├── scripts/                # Scripts ETL
│   └── requirements.txt
│
├── 📚 docs/                     # Documentação
│   ├── ANALISE_EXAUSTIVA_ARQUITETURA.md
│   ├── API_REFERENCE.md
│   └── ...
│
└── 🐳 docker-compose.yml        # Orquestração Docker
```

---

## 🔐 Segurança

### ✅ Medidas Implementadas

| Recurso | Descrição |
|---------|-----------|
| **Autenticação JWT** | Tokens seguros via Supabase Auth |
| **RBAC** | Controle de acesso por roles (admin/analyst) |
| **API Key Interna** | Comunicação segura entre Node.js e Python |
| **CORS** | Proteção contra requisições não autorizadas |
| **Hash de Senhas** | Bcrypt para armazenamento seguro |
| **Audit Logs** | Rastreamento de ações críticas |
| **Circuit Breaker** | Proteção contra sobrecarga do banco |

### ⚠️ Boas Práticas

- ❌ **NUNCA** commite arquivos `.env` no Git
- ✅ Use variáveis de ambiente para secrets
- ✅ Configure CORS adequadamente em produção
- ✅ Use HTTPS em produção
- ✅ Mantenha dependências atualizadas

---

## 🧪 Testes

### Rodar Testes

```bash
# Testes Python (AI Service)
cd ai-service
pytest tests/ -v

# Testes Backend (Node.js)
cd backend
npm test
```

### Cobertura Atual

| Componente | Cobertura | Status |
|------------|-----------|--------|
| **Python (Pytest)** | ~60-85% | ✅ Bom |
| **Backend (Jest)** | 41 testes | ✅ Bom |
| **Frontend** | Em desenvolvimento | ⚠️ Pendente |

---

## 🚀 Deploy em Produção

### Opções de Hospedagem

| Serviço | Para O Que Serve | Custo Estimado |
|---------|------------------|----------------|
| **Railway** | Backend + AI Service | ~$20-50/mês |
| **Vercel** | Frontend (React) | Grátis (hobby) |
| **Supabase** | Banco PostgreSQL | Grátis (até 500MB) |

### Passos para Deploy

1. **Configure variáveis de ambiente** nos serviços de hospedagem
2. **Rode migrations** do banco (`npx prisma migrate deploy`)
3. **Ingira PDFs no RAG** (execute `rag_ingestion.py`)
4. **Configure ETL** (scheduler worker ou cron job)
5. **Monitore** via Sentry e health checks

Veja guias detalhados em:
- 📖 [Guia Railway](docs/GUIA_RAILWAY.md)
- 📖 [Guia CI/CD](docs/GUIA_CI_CD.md)

---

## 📊 Status do Projeto

### ✅ Funcionalidades Implementadas

- [x] Mapa interativo com oportunidades
- [x] Chat agronômico com RAG
- [x] Previsão de preços (Prophet)
- [x] Calculadoras de ROI
- [x] Análise climática
- [x] Integração com CEASA/Agrolink
- [x] Dashboard de tendências
- [x] Sistema de favoritos
- [x] Autenticação e autorização
- [x] Health checks

### 🔄 Em Desenvolvimento

- [ ] Ingestão de PDFs de Soja e Milho no RAG
- [ ] Notificações push
- [ ] App mobile (React Native)
- [ ] API pública limitada

### 📈 Roadmap Futuro

- [ ] Reranking no RAG (melhor precisão)
- [ ] Busca híbrida (vetorial + BM25)
- [ ] Prophet com regressores exógenos
- [ ] Integração com ERPs agrícolas
- [ ] Análise de sentimento de mercado

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Siga estes passos:

1. **Fork** o repositório
2. **Crie uma branch** (`git checkout -b feature/MinhaFeature`)
3. **Commit** suas mudanças (`git commit -m 'Adiciona MinhaFeature'`)
4. **Push** para a branch (`git push origin feature/MinhaFeature`)
5. **Abra um Pull Request**

### 📝 Padrões de Código

- **Python**: Siga PEP 8
- **JavaScript**: Use ESLint configurado
- **Commits**: Mensagens descritivas em português
- **Testes**: Adicione testes para novas features

---

## 📚 Documentação Adicional

### 📖 Documentos Principais

| Documento | Descrição |
|-----------|-----------|
| [📊 Análise Arquitetural Exaustiva](docs/ANALISE_EXAUSTIVA_ARQUITETURA.md) | Análise completa da arquitetura, fluxos e débitos técnicos |
| [📋 API Reference](docs/API_REFERENCE.md) | Documentação completa de todos os endpoints |
| [👤 Guia de Uso](docs/GUIA_USO_CLIENTE.md) | Guia para usuários finais |
| [🏥 Health Checks](docs/GUIA_HEALTH_CHECKS.md) | Monitoramento e health checks |
| [💾 Backup PostgreSQL](docs/GUIA_BACKUP_POSTGRES.md) | Como fazer backup e restaurar |
| [🚀 CI/CD](docs/GUIA_CI_CD.md) | Integração contínua e deploy |

### 🔬 Documentação Técnica

- [📐 Análise Arquitetural Completa](docs/ANALISE_ARQUITETURAL_COMPLETA.md)
- [🧪 Resumo de Testes](docs/RESUMO_TESTES_AUTOMATIZADOS.md)
- [📈 Resultados dos Testes](docs/RESULTADOS_TESTES.md)
- [📅 Planejamento Completo](PLANEJAMENTO_COMPLETO.md)

---

## 🐛 Troubleshooting

### Problemas Comuns

#### ❌ "Erro ao conectar ao banco de dados"
- Verifique se o PostgreSQL está rodando
- Confirme `DATABASE_URL` no `.env`
- Teste conexão: `psql $DATABASE_URL`

#### ❌ "OpenAI API key inválida"
- Verifique `OPENAI_API_KEY` no `.env` do ai-service
- Confirme que a chave está ativa em [platform.openai.com](https://platform.openai.com)

#### ❌ "CORS bloqueado"
- Configure `ALLOWED_ORIGINS` no backend
- Em desenvolvimento, use `*` (não recomendado em produção)

#### ❌ "Prophet não funciona"
- Instale dependências: `pip install prophet cmdstanpy`
- Execute: `python -c 'from cmdstanpy import install_cmdstan; install_cmdstan()'`

---

## 📞 Suporte e Contato

- **Desenvolvedor**: Gabriel Rodrigues
- **GitHub**: [@Gabriel-Rdrgs](https://github.com/Gabriel-Rdrgs)
- **Issues**: [GitHub Issues](https://github.com/Gabriel-Rdrgs/agro-ai-prototype/issues)

---

## 📄 Licença

Este projeto está sob a licença **MIT**. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

## 🙏 Agradecimentos

- **Embrapa, UFG, ZARC** - Documentos técnicos que alimentam o RAG
- **OpenAI** - Embeddings e LLM para o chat agronômico
- **Comunidade Open Source** - Todas as bibliotecas incríveis usadas

---

<div align="center">

**Feito com ❤️ para o agronegócio brasileiro**

⭐ **Se este projeto foi útil, considere dar uma estrela!** ⭐

</div>
