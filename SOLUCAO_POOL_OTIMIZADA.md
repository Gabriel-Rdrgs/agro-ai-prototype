# 🔧 SOLUÇÃO OTIMIZADA: Pool de Conexões Supabase

**Problema:** Pool esgotado causando downtime de vários minutos  
**Causa Raiz:** Limite de conexões do Supabase (15-20) sendo ultrapassado

---

## 🎯 SOLUÇÕES IMEDIATAS (Implementar Agora)

### 1. **Connection Pooling Inteligente no Prisma** ✅

O Prisma precisa de configuração explícita para limitar conexões:

```javascript
// backend/server.js
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: databaseUrl + '?connection_limit=5&pool_timeout=20'
    }
  }
});
```

**Por quê?** O Prisma por padrão pode criar muitas conexões. Limitar a 5 garante que não esgote o pool.

---

### 2. **Singleton Pattern para Prisma** ✅

Evitar múltiplas instâncias do PrismaClient:

```javascript
// backend/utils/prisma.js (NOVO ARQUIVO)
const { PrismaClient } = require('@prisma/client');

let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    log: ['error'],
    datasources: {
      db: {
        url: process.env.DIRECT_URL + '?connection_limit=5&pool_timeout=20'
      }
    }
  });
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient({
      log: ['error', 'warn'],
      datasources: {
        db: {
          url: process.env.DIRECT_URL + '?connection_limit=5&pool_timeout=20'
        }
      }
    });
  }
  prisma = global.prisma;
}

module.exports = prisma;
```

**Uso:** `const prisma = require('./utils/prisma')` em vez de `new PrismaClient()`

---

### 3. **Python: Connection Pooling com PgBouncer Mode** ✅

O Supabase oferece dois modos:
- **Session Mode** (padrão): Limite de 15-20 conexões
- **Transaction Mode**: Limite maior, mas não suporta prepared statements

**Solução:** Usar Transaction Mode para Python (SQLAlchemy funciona bem):

```python
# ai-service/utils/database.py
def get_database_url() -> str:
    url = os.getenv('DATABASE_URL') or os.getenv('PYTHON_DB_URL')
    
    if not url:
        return 'sqlite:///./agro_test.db'
    
    # Força Transaction Mode (pgbouncer)
    if 'pooler.supabase.com' in url and '?pgbouncer=true' not in url:
        url += '?pgbouncer=true'
    
    if url.startswith('postgres://'):
        url = url.replace('postgres://', 'postgresql://', 1)
    
    return url

def get_engine():
    global _engine
    if _engine is None:
        url = get_database_url()
        
        # Pool ainda menor para Transaction Mode
        pool_size = 3  # Reduzido de 5 para 3
        max_overflow = 2  # Reduzido de 5 para 2 (total: 5 conexões)
        
        _engine = create_engine(
            url,
            pool_size=pool_size,
            max_overflow=max_overflow,
            pool_timeout=20,  # Timeout menor
            pool_recycle=1800,  # Recicla após 30 min (mais agressivo)
            pool_pre_ping=True,
            connect_args={
                'connect_timeout': 10,
                'application_name': 'agro_ai_python'
            }
        )
    return _engine
```

---

### 4. **Circuit Breaker Pattern** ✅

Evitar sobrecarga quando o pool está esgotado:

```javascript
// backend/utils/circuitBreaker.js (NOVO)
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.failures = 0;
    this.threshold = threshold;
    this.timeout = timeout;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.nextAttempt = Date.now();
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN. Pool may be exhausted.');
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  onFailure() {
    this.failures++;
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
    }
  }
}

module.exports = CircuitBreaker;
```

---

### 5. **Health Check com Auto-Recovery** ✅

Monitorar e recuperar automaticamente:

```javascript
// backend/utils/healthCheck.js (NOVO)
const prisma = require('./prisma');

let isHealthy = true;
let lastCheck = Date.now();

async function checkHealth() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    isHealthy = true;
    lastCheck = Date.now();
    return true;
  } catch (error) {
    isHealthy = false;
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

// Verifica a cada 30 segundos
setInterval(checkHealth, 30000);

module.exports = { checkHealth, isHealthy: () => isHealthy };
```

---

## 🚀 ALTERNATIVAS DE BANCO DE DADOS

### Opção 1: **Neon PostgreSQL** (RECOMENDADO) ⭐

**Vantagens:**
- ✅ Pool ilimitado (até 100 conexões no plano free)
- ✅ Serverless (pausa automaticamente quando não usado)
- ✅ PostGIS e pgvector incluídos
- ✅ Migração fácil do Supabase
- ✅ Preço: Free tier generoso

**Migração:**
1. Criar conta: https://neon.tech
2. Criar projeto
3. Exportar schema do Supabase
4. Importar no Neon
5. Atualizar `DATABASE_URL` e `DIRECT_URL`

**Custo:** Free até 0.5GB, depois $19/mês

---

### Opção 2: **Railway PostgreSQL** ⭐

**Vantagens:**
- ✅ Já usa Railway para deploy
- ✅ Integração nativa
- ✅ Pool de 100 conexões
- ✅ PostGIS disponível
- ✅ Preço: $5/mês (1GB) ou $20/mês (10GB)

**Migração:**
1. Criar banco no Railway Dashboard
2. Copiar `DATABASE_URL`
3. Atualizar variáveis de ambiente

---

### Opção 3: **Supabase Pro** 💰

**Vantagens:**
- ✅ Mesma infraestrutura (sem migração)
- ✅ Pool maior (até 200 conexões)
- ✅ Melhor performance

**Desvantagens:**
- ❌ Custo: $25/mês

---

### Opção 4: **Aiven PostgreSQL** ⭐

**Vantagens:**
- ✅ Pool de 25 conexões no free tier
- ✅ PostGIS incluído
- ✅ Gerenciado profissionalmente

**Custo:** Free tier limitado, depois $19/mês

---

## 📊 COMPARAÇÃO RÁPIDA

| Banco | Pool Free | PostGIS | pgvector | Custo/Mês | Migração |
|-------|-----------|----------|----------|-----------|----------|
| **Supabase** | 15-20 | ✅ | ✅ | $0 (Free) | - |
| **Neon** | 100 | ✅ | ✅ | $0-19 | Fácil |
| **Railway** | 100 | ✅ | ⚠️ | $5-20 | Muito Fácil |
| **Aiven** | 25 | ✅ | ✅ | $0-19 | Fácil |

---

## 🎯 RECOMENDAÇÃO FINAL

### Curto Prazo (Implementar Agora):
1. ✅ Aplicar otimizações de pool (código acima)
2. ✅ Implementar Circuit Breaker
3. ✅ Health checks automáticos

### Médio Prazo (1-2 semanas):
1. **Migrar para Neon** (melhor custo-benefício)
   - Pool maior
   - Serverless (economiza quando não usa)
   - Mesma stack (PostgreSQL + PostGIS + pgvector)

### Alternativa Rápida:
- **Railway PostgreSQL** (se já usa Railway)
  - Integração imediata
  - Sem mudança de stack

---

## 🔧 IMPLEMENTAÇÃO PASSO A PASSO

### Passo 1: Otimizar Prisma (5 min)

```bash
# Criar arquivo utils/prisma.js
# (código acima)
```

### Passo 2: Otimizar Python (5 min)

```bash
# Editar ai-service/utils/database.py
# (código acima)
```

### Passo 3: Testar (2 min)

```bash
# Reiniciar serviços
docker-compose restart

# Verificar logs
docker-compose logs -f backend | grep "pool\|connection"
```

### Passo 4: Monitorar (Ongoing)

- Adicionar métricas de pool usage
- Alertas quando pool > 80%

---

## 📈 MÉTRICAS PARA MONITORAR

1. **Pool Usage:** % de conexões usadas
2. **Connection Errors:** Erros de "max clients"
3. **Response Time:** Latência de queries
4. **Circuit Breaker:** Estado (CLOSED/OPEN)

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

- [ ] Criar `backend/utils/prisma.js` (Singleton)
- [ ] Atualizar `backend/server.js` para usar singleton
- [ ] Otimizar `ai-service/utils/database.py` (pool menor)
- [ ] Implementar Circuit Breaker
- [ ] Adicionar Health Checks
- [ ] Testar em produção
- [ ] Monitorar por 24h
- [ ] Decidir sobre migração (Neon/Railway)

---

## 💡 DICA EXTRA: Connection Pooling no Railway

Se migrar para Railway, pode usar **PgBouncer** como serviço separado:

```yaml
# railway.json
{
  "services": {
    "postgres": {
      "image": "postgres:15",
      "addons": ["pgbouncer"]
    }
  }
}
```

Isso aumenta ainda mais o limite de conexões!

---

**Próximo passo:** Quer que eu implemente as otimizações agora ou prefere migrar para Neon/Railway primeiro?
