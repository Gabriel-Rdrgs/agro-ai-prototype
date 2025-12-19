# 📚 Referência de APIs

Documentação completa dos endpoints principais do sistema.

---

## 🔐 Autenticação

Todos os endpoints (exceto `/health` e `/`) requerem autenticação via JWT.

**Header:**
```
Authorization: Bearer <token>
```

**Obter Token:**
```bash
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}
```

---

## 📊 Backend Node.js (Express)

### Oportunidades

#### `GET /api/opportunities`
Lista oportunidades de arbitragem.

**Query Parameters:**
- `limit` (opcional): Número de registros (padrão: 500, máximo: 1000)
- `skip` (opcional): Paginação (padrão: 0)

**Resposta:**
```json
{
  "opportunities": [
    {
      "id": 1,
      "product": "Tomate",
      "city": "São Paulo",
      "state": "SP",
      "buyPrice": 2.5,
      "sellPrice": 4.0,
      "roi": 60,
      "riskLevel": "medium",
      "season": "summer"
    }
  ],
  "dollarRate": 5.0,
  "count": 100
}
```

**Cache:** 5 minutos (TTL)

---

### Processamento em Lote (IA)

#### `POST /api/ai/batch`
Processa múltiplas oportunidades em lote usando Prophet para previsão de preços.

**Body:**
```json
{
  "items": [
    {
      "id": 1,
      "product": "Tomate",
      "origin": { "state": "SP" },
      "coords": { "lat": -23.5505, "lng": -46.6333 },
      "financials": {
        "buyPrice": 2.5,
        "sellPrice": 4.0
      }
    }
  ]
}
```

**Resposta:**
```json
{
  "results": [
    {
      "id": 1,
      "forecast_7d": { "price": 4.2, "confidence": 0.8 },
      "forecast_30d": { "price": 4.5, "confidence": 0.75 },
      "meta": {
        "price_source_7d": "prophet",
        "price_source_30d": "prophet"
      }
    }
  ]
}
```

**Timeout:** 60 segundos

---

### Chat RAG (Assistente Agronômico)

#### `POST /api/ai/chat/query`
Consulta o assistente agronômico baseado em documentos técnicos.

**Body:**
```json
{
  "question": "Qual a temperatura ideal para cultivo de tomate?"
}
```

**Resposta:**
```json
{
  "answer": "A temperatura ideal para cultivo de tomate é entre 18°C e 25°C...",
  "sources": [
    "Clima e Produção de Tomates no Brasil.pdf (página 5)"
  ]
}
```

**Timeout:** 60 segundos

---

### CEASA

#### `GET /api/ceasa/latest`
Lista preços mais recentes do CEASA.

**Query Parameters:**
- `limit` (opcional): Número de registros (padrão: 100, máximo: 500)
- `skip` (opcional): Paginação

**Resposta:**
```json
{
  "success": true,
  "count": 50,
  "data": [
    {
      "ceasa_region": "SP",
      "product_name": "Tomate",
      "price_avg": 4.5,
      "price_date": "2025-12-19"
    }
  ]
}
```

---

### Health Checks

#### `GET /health`
Health check básico (rápido).

**Resposta:**
```json
{
  "status": "ok",
  "database": "connected",
  "circuit_breaker": "closed",
  "timestamp": "2025-12-19T10:00:00"
}
```

#### `GET /health/detailed`
Health check completo com verificações detalhadas.

**Resposta:**
```json
{
  "status": "healthy",
  "service": "agro-ai-backend",
  "version": "1.0.0",
  "timestamp": "2025-12-19T10:00:00",
  "checks": {
    "database": {
      "status": "ok",
      "connected": true,
      "circuit_breaker": "closed"
    },
    "services": {
      "status": "ok",
      "services": {
        "cache": "online",
        "jobQueue": "online"
      }
    },
    "external": {
      "status": "ok",
      "apis": {
        "python": { "configured": true, "status": "ok" },
        "supabase": { "configured": true, "status": "ok" }
      }
    },
    "resources": {
      "status": "ok",
      "memory": {
        "heap_used_mb": 45,
        "heap_total_mb": 128
      },
      "uptime_seconds": 3600
    }
  }
}
```

---

## 🐍 Python AI Service (FastAPI)

### Previsões

#### `POST /api/v1/predict/storage`
Análise de viabilidade de armazenagem com IA.

**Body:**
```json
{
  "product": "Tomate",
  "current_price": 4.5,
  "buy_price": 2.5,
  "lat": -23.5505,
  "lng": -46.6333,
  "storage_cost_per_day": 0.03,
  "planting_date": "2025-01-15"
}
```

**Resposta:**
```json
{
  "viable": true,
  "optimal_days": 30,
  "total_cost": 45.0,
  "expected_revenue": 135.0,
  "roi": 200.0,
  "risk_factors": ["chuva", "temperatura"]
}
```

---

#### `POST /api/v1/predict/batch`
Previsão de preços em lote usando Prophet.

**Body:**
```json
{
  "items": [
    {
      "id": 1,
      "product": "Tomate",
      "state": "SP",
      "lat": -23.5505,
      "lng": -46.6333,
      "current_price": 4.5,
      "buy_price": 2.5
    }
  ]
}
```

**Resposta:**
```json
{
  "results": [
    {
      "id": 1,
      "forecast_7d": {
        "price": 4.2,
        "lower": 3.8,
        "upper": 4.6,
        "confidence": 0.8
      },
      "forecast_30d": {
        "price": 4.5,
        "lower": 4.0,
        "upper": 5.0,
        "confidence": 0.75
      },
      "forecast_model": "prophet",
      "metrics": {
        "data_points": 150,
        "forecast_days": 30
      }
    }
  ]
}
```

**Modelos:**
- `prophet` - Prophet (quando há ≥30 registros históricos)
- `simple_trend_fallback` - Fallback rápido (quando há <30 registros)

---

### Cálculos

#### `POST /api/v1/calc/production`
Calcula ROI de produção local.

**Body:**
```json
{
  "product": "Tomate",
  "area_ha": 10,
  "state": "SP",
  "planting_month": 3
}
```

**Resposta:**
```json
{
  "roi": 45.5,
  "total_cost": 50000,
  "expected_revenue": 72750,
  "profit": 22750
}
```

---

#### `POST /api/v1/calc/arbitrage`
Calcula ROI de arbitragem interestadual.

**Body:**
```json
{
  "product": "Tomate",
  "origin_state": "SP",
  "destination_state": "RJ",
  "area_ha": 10,
  "planting_month": 3
}
```

**Resposta:**
```json
{
  "roi": 60.2,
  "freight_cost": 5000,
  "total_cost": 55000,
  "expected_revenue": 88000,
  "profit": 33000
}
```

---

### Chat RAG

#### `POST /api/v1/chat/query`
Consulta o assistente agronômico.

**Body:**
```json
{
  "question": "Qual a melhor época de plantio para tomate em São Paulo?",
  "user_id": "user-123"
}
```

**Resposta:**
```json
{
  "answer": "A melhor época de plantio para tomate em São Paulo é de fevereiro a maio...",
  "sources": [
    {
      "source": "Épocas de Plantio e Métricas de Decisão para Cultivo de Tomate no Brasil.pdf",
      "page": 12,
      "crop": "Tomate",
      "theme": "PlantioDecisao"
    }
  ]
}
```

---

### Health Checks

#### `GET /health`
Health check básico.

**Resposta:**
```json
{
  "status": "ok",
  "service": "agro-ai-brain",
  "version": "6.0.0",
  "timestamp": "2025-12-19T10:00:00"
}
```

#### `GET /health/detailed`
Health check completo.

**Resposta:**
```json
{
  "status": "healthy",
  "service": "agro-ai-brain",
  "version": "6.0.0",
  "timestamp": "2025-12-19T10:00:00",
  "checks": {
    "database": {
      "status": "ok",
      "connected": true,
      "provider": "supabase",
      "version": "PostgreSQL 15.x"
    },
    "services": {
      "status": "ok",
      "services": {
        "market_intelligence": "online",
        "storage_advisor": "online",
        "climate_api": "online",
        "fuel_pricing": "online",
        "price_forecast": "online",
        "rag_service": "online"
      }
    },
    "external": {
      "status": "ok",
      "apis": {
        "openai": {
          "configured": true,
          "status": "ok"
        }
      }
    },
    "resources": {
      "status": "ok",
      "memory": {
        "total_gb": 4.0,
        "available_gb": 2.5,
        "percent_used": 37.5
      },
      "cache": {
        "items": 42
      }
    }
  }
}
```

---

## 🔒 Rotas Administrativas (Requerem Role: Admin)

### ETL

#### `POST /api/admin/etl/start`
Inicia ETL em background.

**Body:**
```json
{
  "type": "all",
  "skipIbge": false
}
```

**Resposta:**
```json
{
  "success": true,
  "jobId": "job-123",
  "message": "ETL iniciado em background",
  "statusUrl": "/api/admin/etl/status/job-123"
}
```

#### `GET /api/admin/etl/status/:jobId`
Verifica status do job de ETL.

**Resposta:**
```json
{
  "jobId": "job-123",
  "status": "completed",
  "progress": 100,
  "message": "ETL concluído com sucesso"
}
```

---

### Registro de Usuários

#### `POST /api/auth/register`
Registra novo usuário (apenas admin).

**Body:**
```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "role": "user"
}
```

**Resposta:**
```json
{
  "success": true,
  "user": {
    "id": "user-123",
    "email": "newuser@example.com",
    "role": "user"
  }
}
```

---

## 📝 Códigos de Status HTTP

- **200 OK** - Sucesso
- **400 Bad Request** - Dados inválidos
- **401 Unauthorized** - Token ausente ou inválido
- **403 Forbidden** - Sem permissão (role insuficiente)
- **404 Not Found** - Recurso não encontrado
- **500 Internal Server Error** - Erro no servidor
- **503 Service Unavailable** - Serviço degradado (ex: banco offline)

---

## 🔗 Documentação Interativa

### Swagger/OpenAPI

**Python AI Service:**
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- OpenAPI JSON: `http://localhost:8000/openapi.json`

**Backend Node.js:**
- Documentação: Ver código-fonte ou testes em `backend/tests/`

---

## 📚 Guias Relacionados

- `docs/GUIA_HEALTH_CHECKS.md` - Guia de health checks
- `docs/GUIA_BACKUP_POSTGRES.md` - Guia de backup
- `docs/GUIA_CI_CD.md` - Guia de CI/CD
- `backend/tests/README.md` - Guia de testes do backend
- `ai-service/tests/README.md` - Guia de testes do Python

---

**Última atualização:** Dezembro 2025

