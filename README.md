# 🚀 AgroArbitrage AI (MVP v1.0)

**Plataforma de Inteligência Estratégica para Arbitragem Agrícola**

Transformando dados climáticos, financeiros e logísticos em lucro líquido através de IA.

![React](https://img.shields.io/badge/React-18-blue)
![Backend](https://img.shields.io/badge/Node.js-green)
![Python](https://img.shields.io/badge/Python-3.12-yellow)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Latest-blue)
![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)

## 📋 Visão Geral

O **AgroArbitrage AI** é um Sistema de Suporte à Decisão (DSS) Full-stack que monitora oportunidades de arbitragem no mercado agrícola brasileiro.

Diferente de planilhas estáticas, o sistema opera em **tempo real**, cruzando:

- 💱 Cotações internacionais (Dólar)
- 🛰️ Previsões meteorológicas (Satélite)
- 🚛 Logística rodoviária

Para calcular o **ROI exato** de cada operação.

## 🎯 Diferenciais do MVP

### ✨ Visualização Inteligente

O sistema desenha automaticamente as rotas mais lucrativas (ROI 50%) conectando origem e destino.

### 🌡️ Clima em Tempo Real

Ao clicar em uma região, o sistema consulta satélites e informa a temperatura e chuva no local exato.

### 📊 Clustering Automático

Agrupamento automático de oportunidades para visualização limpa em alta escala.

## 🏗️ Arquitetura Técnica

### Arquitetura de Microsserviços

- ✅ Separação clara entre Aplicação Node.js e Inteligência Python
- ✅ Dados vivos com integração de APIs
- ✅ Segurança Enterprise (JWT + Bcrypt + Variáveis de Ambiente)

## 📦 Stack Tecnológico

| Camada             | Tecnologia                   | Detalhes                                |
| ------------------ | ---------------------------- | --------------------------------------- |
| **Frontend**       | React.js, Leaflet, Chart.js  | Responsivo, Visualizações em tempo real |
| **Backend**        | Node.js, Express, Prisma ORM | APIs RESTful escaláveis com dotenv      |
| **IA/ML**          | Python 3.12, FastAPI         | Processamento de dados e algoritmos     |
| **Banco de Dados** | PostgreSQL (Supabase/Neon)   | Dados estruturados e persistentes       |
| **Infraestrutura** | Vercel, Render               | Deploy automático, escalabilidade       |

## 🎁 Funcionalidades Entregues

### 1️⃣ Mapa de Fluxo Comercial (Trade Flow)

**Análise de Armazenagem**

- Algoritmo rodando em Python que analisa a curva de preços futura vs. custos de estocagem
- Localidade: Boca de Jacaré

**Previsão de Risco**

- O sistema recomenda a melhor data de venda baseada em eventos climáticos futuros

### 2️⃣ Cérebro de IA (Python Microservice)

**Custo Real de Logística**

- Cálculo de frete baseado em:
  - Distância rodoviária
  - Fator de Sinuosidade: 1.35
  - Preço do diesel em tempo real

**Multimoeda**

- Conversão automática de valores para Dólar (PTAX) em tempo real

**Persistência**

- Salve cenários de simulação para comparar estratégias posteriormente

### 3️⃣ Simulador Logístico-Financeiro

**Simulações Avançadas**

- Teste múltiplos cenários com um clique
- Análise de sensibilidade para riscos
- Exportação de resultados em tempo real

### 4️⃣ Dashboard & Relatórios

**KPIs Dinâmicos**

- Volume total em movimentação
- ROI médio das operações
- Alertas de Risco atualizados ao vivo

**Exportação PDF**

- Geração de relatórios executivos completos
- Pronto para envio via WhatsApp/Email

## 🚀 Como Rodar Localmente

O projeto é composto por **3 partes** que devem rodar **simultaneamente**.

### 📋 Pré-requisitos

- ✓ Node.js v18+
- ✓ Python v3.10+
- ✓ PostgreSQL (ou usar Supabase)
- ✓ Git

### 1️⃣ Backend Node.js (porta 3001)

```bash
cd backend
npm install
```

Crie um arquivo `.env` na pasta `backend/`:

```env
# Base de dados
DATABASE_URL=postgresql://user:password@localhost:5432/agro-ai

# JWT para autenticação (gerar com: openssl rand -base64 32)
JWT_SECRET=seu_segredo_jwt_muito_seguro_aqui_32_caracteres_minimo

# URLs dos microsserviços
PYTHON_API_URL=http://localhost:8000
PORT=3001
```

**Executar migrations:**

```bash
npx prisma migrate dev --name init
npx prisma db seed  # Popula dados iniciais
```

**Iniciar servidor:**

```bash
npm run dev
# Rodando em http://localhost:3001
```

### 2️⃣ AI Service Python (porta 8000)

```bash
cd ai-service
python -m venv venv
```

Ativar virtual environment:

```bash
# Windows
.\venv\Scripts\activate

# Mac/Linux
source venv/bin/activate
```

Instalar dependências:

```bash
pip install -r requirements.txt
```

Crie um arquivo `.env` na pasta `ai-service/`:

```env
# Banco de dados
DATABASE_URL=postgresql://user:password@localhost:5432/agro-ai

# URLs dos APIs
CLIMATE_API_URL=https://api.openweathermap.org/data/2.5
CONAB_API_URL=https://www.conab.gov.br/api

# Chaves de API (manter seguro)
CLIMATE_API_KEY=seu_openweathermap_key_aqui

# Configurações
ENVIRONMENT=development
PORT=8000
```

**Iniciar servidor:**

```bash
uvicorn main:app --reload --port 8000
# Rodando em http://localhost:8000
```

### 3️⃣ Frontend React (porta 3000)

```bash
cd frontend
npm install
```

Crie um arquivo `.env.local` na pasta `frontend/`:

```env
# URL do Backend (sem /api no final - rotas adicionam automaticamente)
REACT_APP_API_URL=http://localhost:3001

# URLs dos maps
REACT_APP_MAP_TOKEN=seu_token_mapbox_ou_leaflet
```

**Iniciar aplicação:**

```bash
npm start
# Rodando em http://localhost:3000
```

## 🔐 Segurança & Variáveis de Ambiente

### ⚠️ IMPORTANTE: Proteção de Secrets

**NUNCA commitar arquivos `.env` no git!** O arquivo `.gitignore` já protege isso.

### Geração de JWT_SECRET

Execute este comando uma única vez e guarde o resultado:

```bash
# Linux/Mac
openssl rand -base64 32

# Windows (usando Git Bash ou PowerShell)
Certutil -randfile 32 dummy.bin && certutil -encode dummy.bin dummy.txt && type dummy.txt
```

Coloque o resultado no `.env` do backend.

### .env vs .env.example

- **`.env`** - CONTÉM secrets reais, nunca committed (protegido no .gitignore)
- **`.env.example`** - EXEMPLO com placeholders, serve como template para desenvolvedores

Crie um arquivo `.env.example` em cada pasta:

**backend/.env.example:**

```env
DATABASE_URL=postgresql://user:password@localhost:5432/agro-ai-dev
JWT_SECRET=XXXXXXXXXXXXXXXXXXXXXXXXXXXXX
PYTHON_API_URL=http://localhost:8000
PORT=3001
```

**ai-service/.env.example:**

```env
DATABASE_URL=postgresql://user:password@localhost:5432/agro-ai-dev
CLIMATE_API_URL=https://api.openweathermap.org/data/2.5
CONAB_API_URL=https://www.conab.gov.br/api
CLIMATE_API_KEY=XXXXXXXXXXXXXXXXXXXXXXX
ENVIRONMENT=development
PORT=8000
```

**frontend/.env.example:**

```env
REACT_APP_API_URL=http://localhost:3001
REACT_APP_MAP_TOKEN=XXXXXXXXXXXXXXXXX
```

### Como as Variáveis Funcionam

**Backend (Node.js):**

```javascript
require("dotenv").config();
const port = process.env.PORT || 3001;
const jwtSecret = process.env.JWT_SECRET;
```

**AI Service (Python):**

```python
from dotenv import load_dotenv
import os

load_dotenv()
db_url = os.getenv('DATABASE_URL')
```

**Frontend (React):**

```javascript
const apiUrl = process.env.REACT_APP_API_URL;
```

⚠️ **Regra de Ouro:** Frontend NUNCA recebe secrets! Apenas URLs públicas com `REACT_APP_` prefix.

## 🔐 Credenciais de Acesso (Demo)

Para acessar o ambiente de teste:

```
Email: paulo@agro.com
Senha: 123456
```

## 🛰️ Integrações e APIs

O sistema utiliza uma arquitetura híbrida de dados para garantir precisão e disponibilidade:

| Serviço                  | Função                                                                  | Fallback / Segurança                      |
| :----------------------- | :---------------------------------------------------------------------- | :---------------------------------------- |
| **OpenMeteo Forecast**   | Previsão do tempo (16 dias) para tomada de decisão tática.              | Se falhar, IA usa médias históricas.      |
| **OpenMeteo Historical** | Histórico real de chuvas (5 anos) da fazenda específica.                | Cache LRU + Fallback para média estadual. |
| **NASA POWER**           | Radiação Solar (MJ/m²) para análise de qualidade (Brix) e fotossíntese. | Cache LRU + Fallback para média nacional. |
| **AwesomeAPI**           | Cotação do Dólar em tempo real para commodities.                        | Valor fixo seguro em caso de erro.        |

### 🛡️ Robustez e Segurança

- **Validação de Coordenadas:** Proteção contra inputs geográficos inválidos.
- **Cache Inteligente (LRU):** Minimiza chamadas de API, reduzindo latência e evitando rate-limits.
- **Timeouts Configuráveis:** Nenhuma chamada externa trava o sistema por mais de 5 segundos.

## 🗺️ Roadmap - Próximos Passos (Fase 2)

- [ ] **Machine Learning Avançado**

  - Treinar modelos com histórico de 5 anos da CONAB
  - Previsões com 90%+ de acurácia

- [ ] **PostGIS Integration**

  - Implementar buscas por raio geográfico
  - Exemplo: Fazendas a 50km de um ponto
  - Otimização de rotas com A\*

- [ ] **Sistema de Notificações**

  - Alertas via WhatsApp/SMS para oportunidades urgentes
  - Notificações push em tempo real
  - Webhooks customizáveis

- [ ] **Mobile App**
  - Versão React Native para iOS/Android
  - Acesso offline com sincronização

## 📚 Documentação

Para documentação completa:

- 📖 [Docs](./docs) - Guias e tutoriais
- 🔌 [API Reference](./docs/API.md) - Endpoints disponíveis
- 🐍 [AI Service Docs](./docs/AI_SERVICE.md) - Modelos e algoritmos
- 🔐 [Guia de Segurança](./docs/SECURITY.md) - Boas práticas de segurança

## 📄 Licença

Este projeto está sob licença MIT. Veja o arquivo [LICENSE](./LICENSE) para mais detalhes.

## 👨‍💻 Desenvolvedor

Desenvolvido por **Gabriel Rodrigues**

- 🔗 GitHub: [@Gabriel-Rdrgs](https://github.com/Gabriel-Rdrgs)
- 💼 LinkedIn: [Gabriel Rodrigues](https://www.linkedin.com/in/gabriel-soares-rodrigues-030121231/)
- 🌐 Portfolio: [gabriel-dev.com](https://gabriel-dev.com/)

## 📞 Suporte

Tem dúvidas? Abra uma [Issue](https://github.com/Gabriel-Rdrgs/agro-ai-prototype/issues) ou entre em contato!

**⭐ Se este projeto foi útil, deixe uma star!**
