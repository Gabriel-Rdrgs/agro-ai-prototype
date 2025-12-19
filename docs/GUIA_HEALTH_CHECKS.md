# 🏥 Guia de Health Checks

Este guia explica os endpoints de health check disponíveis para monitoramento do sistema.

---

## 📋 Endpoints Disponíveis

### Python AI Service (FastAPI)

#### 1. Health Check Básico
**GET** `/health`

Health check rápido, ideal para load balancers e verificações frequentes.

**Resposta:**
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2025-12-19T10:00:00"
}
```

#### 2. Health Check Detalhado
**GET** `/health/detailed`

Health check completo com verificações de:
- Banco de dados (Supabase)
- Serviços internos
- APIs externas (OpenAI)
- Recursos do sistema (memória, cache)

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

#### 3. Health Checks Específicos

**GET** `/health/database` - Verifica apenas banco de dados
**GET** `/health/services` - Verifica apenas serviços internos
**GET** `/health/external` - Verifica apenas APIs externas

---

### Backend Node.js (Express)

#### 1. Health Check Básico
**GET** `/health`

Health check rápido com verificação de banco e circuit breaker.

**Resposta:**
```json
{
  "status": "ok",
  "database": "connected",
  "circuit_breaker": "closed",
  "timestamp": "2025-12-19T10:00:00"
}
```

#### 2. Health Check Detalhado
**GET** `/health/detailed`

Health check completo com verificações de:
- Banco de dados (Supabase)
- Serviços internos (cache, jobQueue, logger)
- APIs externas (Python, Supabase)
- Recursos do sistema (memória, uptime)

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
      "circuit_breaker": "closed",
      "version": "PostgreSQL 15.x"
    },
    "services": {
      "status": "ok",
      "services": {
        "cache": "online",
        "jobQueue": "online",
        "logger": "online"
      }
    },
    "external": {
      "status": "ok",
      "apis": {
        "python": {
          "configured": true,
          "url": "http://ai-service:8000",
          "status": "ok"
        },
        "supabase": {
          "configured": true,
          "status": "ok"
        }
      }
    },
    "resources": {
      "status": "ok",
      "memory": {
        "heap_used_mb": 45,
        "heap_total_mb": 128,
        "rss_mb": 180
      },
      "uptime_seconds": 3600
    }
  }
}
```

---

## 🔍 Status Codes

- **200 OK**: Sistema saudável
- **503 Service Unavailable**: Sistema degradado (algum componente falhou)

---

## 📊 Interpretação dos Status

### Status Geral

- **`healthy`**: Todos os componentes funcionando
- **`degraded`**: Algum componente com problema, mas sistema ainda operacional
- **`error`**: Componente crítico falhou

### Status de Componentes

- **`ok`**: Componente funcionando normalmente
- **`warning`**: Componente com problema não crítico
- **`error`**: Componente com falha
- **`not_configured`**: Componente não configurado (pode ser normal)

---

## 🚀 Uso em Monitoramento

### Railway

Railway verifica automaticamente o endpoint `/health` para determinar se o serviço está saudável.

### Load Balancers

Configure para verificar `/health` a cada 30 segundos:
```
GET /health
Expected: 200 OK
Timeout: 5s
```

### Alertas

Configure alertas baseados em:
- Status code 503
- `status: "degraded"` ou `status: "error"`
- Componentes específicos com `status: "error"`

### Exemplo: Uptime Robot

```
Monitor Type: HTTP(s)
URL: https://seu-backend.railway.app/health
Expected Status: 200
Check Interval: 5 minutes
```

---

## 🔧 Troubleshooting

### Health Check Retorna 503

**Possíveis causas:**
1. Banco de dados desconectado
2. Circuit breaker aberto
3. Serviço crítico offline

**Solução:**
1. Verifique logs do serviço
2. Verifique conexão com Supabase
3. Verifique variáveis de ambiente

### Health Check Detalhado Lento

**Causa:** Verificações externas podem demorar

**Solução:**
- Use `/health` básico para verificações frequentes
- Use `/health/detailed` apenas para diagnóstico

### Componente Mostra "not_configured"

**Causa:** Variável de ambiente não configurada

**Solução:**
- Verifique se variável está no `.env`
- Verifique se variável está exportada no ambiente de produção

---

## 📈 Métricas Recomendadas

Monitore:
- **Uptime**: % de tempo com status "healthy"
- **Response Time**: Tempo de resposta do `/health`
- **Database Status**: % de tempo com banco conectado
- **Service Availability**: % de serviços online

---

## 🔐 Segurança

- Health checks são **públicos** (não requerem autenticação)
- Não expõem informações sensíveis (senhas, tokens)
- Use apenas para monitoramento, não para diagnóstico detalhado em produção

---

**Última atualização:** Dezembro 2025

