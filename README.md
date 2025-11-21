# 🚀 AgroArbitrage AI (MVP v1.0)

> **Plataforma de Inteligência Estratégica para Arbitragem Agrícola.**
> Transformando dados climáticos, financeiros e logísticos em lucro líquido através de IA.

![React](https://img.shields.io/badge/React-18-blue) ![Node.js](https://img.shields.io/badge/Backend-Node.js-green) ![Python](https://img.shields.io/badge/AI-FastAPI-yellow) ![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-blue) ![Status](https://img.shields.io/badge/Status-Production_Ready-brightgreen)

---

## 📋 Visão Geral

O **AgroArbitrage AI** é um Sistema de Suporte à Decisão (DSS) Fullstack que monitora oportunidades de arbitragem no mercado agrícola brasileiro.

Diferente de planilhas estáticas, o sistema opera em tempo real, cruzando cotações internacionais (Dólar), previsões meteorológicas (Satélite) e logística rodoviária para calcular o ROI exato de cada operação.

### 🏆 Diferenciais do MVP

- **Arquitetura de Microsserviços:** Separação clara entre Aplicação (Node.js) e Inteligência (Python).
- **Dados Vivos:** Integração com APIs de Clima (OpenMeteo) e Finanças (AwesomeAPI).
- **Segurança Enterprise:** Autenticação via JWT e senhas criptografadas (Bcrypt).

---

## ✨ Funcionalidades Entregues

### 1. 🗺️ Mapa de Fluxo Comercial (Trade Flow)

- **Visualização Inteligente:** O sistema desenha automaticamente as rotas mais lucrativas (ROI > 50%) conectando origem e destino.
- **Clima em Tempo Real:** Ao clicar em uma região, o sistema consulta satélites e informa a temperatura e chuva no local exato.
- **Clustering:** Agrupamento automático de oportunidades para visualização limpa em alta escala.

### 2. 🧠 Cérebro de IA (Python Microservice)

- **Análise de Armazenagem:** Algoritmo rodando em Python que analisa a curva de preços futura vs. custos de estocagem ("Boca de Jacaré").
- **Previsão de Risco:** O sistema recomenda a melhor data de venda baseada em eventos climáticos futuros.

### 3. 🧮 Simulador Logístico & Financeiro

- **Custo Real:** Cálculo de frete baseado em distância rodoviária (Fator de Sinuosidade 1.35) e preço do diesel.
- **Multimoeda:** Conversão automática de valores para Dólar (PTAX) em tempo real.
- **Persistência:** Salve cenários de simulação para comparar estratégias posteriormente.

### 4. 📊 Dashboard & Relatórios

- **KPIs Dinâmicos:** Volume total, ROI médio e Alertas de Risco atualizados ao vivo.
- **Exportação PDF:** Geração de relatórios executivos completos com um clique (para envio via WhatsApp/E-mail).

---

## 🛠️ Arquitetura Técnica

O projeto segue uma arquitetura moderna e distribuída:

```mermaid
graph TD
    User["Cliente"] --> Frontend["React (Vercel)"]
    Frontend --> NodeAPI["Backend Node.js (Render)"]

    subgraph "Núcleo de Negócio"
    NodeAPI --> Postgres[("PostgreSQL - Supabase")]
    NodeAPI --> Auth["JWT Auth Service"]
    end

    subgraph "Inteligência & Dados"
    NodeAPI --> PythonAPI["AI Service - FastAPI (Vercel)"]
    PythonAPI --> Pandas["Processamento de Dados"]
    end

    subgraph "Mundo Externo"
    NodeAPI --> DollarAPI["AwesomeAPI (Câmbio)"]
    NodeAPI --> WeatherAPI["OpenMeteo (Clima)"]
    end
Stack Tecnológico
Frontend: React.js, Leaflet, Chart.js, CSS Modules.

Backend (Core): Node.js, Express, Prisma ORM.

Backend (AI): Python 3.12, FastAPI, Uvicorn.

Banco de Dados: PostgreSQL (Hospedado no Supabase/Neon).

Infraestrutura: Vercel (Front + AI) e Render (Node API).

🚀 Como Rodar Localmente
O projeto é composto por 3 partes que devem rodar simultaneamente.

Pré-requisitos
Node.js (v18+)

Python (v3.10+)

PostgreSQL (Connection String)

1. Configurar Backend (Node.js)
Bash

cd backend
npm install
# Crie um arquivo .env com: DATABASE_URL="sua_url_postgres" e JWT_SECRET="segredo"
npx prisma migrate dev --name init
npx prisma db seed # Popula o banco com dados iniciais
npm run dev
# Rodando em: http://localhost:3001
2. Configurar AI Service (Python)
Bash

cd ai-service
python -m venv venv
# Ative o venv (Windows: .\venv\Scripts\activate | Mac: source venv/bin/activate)
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# Rodando em: http://localhost:8000
3. Configurar Frontend (React)
Bash

cd frontend
npm install
npm start
# Rodando em: http://localhost:3000
🔑 Acesso ao Sistema (Demo)
Para acessar o ambiente de produção ou local, utilize as credenciais de sócio:

E-mail: paulo@agro.com

Senha: 123456

📅 Próximos Passos (Roadmap Fase 2)
[ ] Machine Learning: Treinar modelos com histórico de 5 anos da CONAB.

[ ] PostGIS: Implementar buscas por raio geográfico (ex: "Fazendas a 50km").

[ ] Notificações: Alertas via WhatsApp/SMS para oportunidades urgentes.

Desenvolvido por Gabriel Rodrigues.
```
