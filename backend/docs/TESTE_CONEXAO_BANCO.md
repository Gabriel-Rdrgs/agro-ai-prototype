# 🔍 TESTE DE CONEXÃO COM BANCO

## Verificar se o banco está acessível

### 1. Teste direto via psql (se tiver instalado)
```bash
psql "postgresql://postgres.jiyqrxgyopytqvctdvir:JwD0InfEpjRy4nR1@aws-0-us-west-2.pooler.supabase.com:5432/postgres"
```

### 2. Teste dentro do container Node.js
```bash
docker exec -it agro_backend sh
node -e "const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); p.\$connect().then(() => console.log('✅ Conectado')).catch(e => console.error('❌ Erro:', e.message));"
```

### 3. Verificar variáveis de ambiente
```bash
docker exec agro_backend printenv | grep DATABASE
```

### 4. Verificar status do Supabase
Acesse: https://supabase.com/dashboard → Seu projeto → Database → Connection Pooling

## Possíveis Problemas

### A. Pool Esgotado
**Sintoma:** `MaxClientsInSessionMode: max clients reached`
**Solução:** Aguardar 2-5 minutos ou aumentar pool no Supabase

### B. Banco Offline
**Sintoma:** `Can't reach database server`
**Solução:** 
1. Verificar status do Supabase: https://status.supabase.com
2. Verificar se a URL está correta
3. Verificar firewall/rede

### C. URL Incorreta
**Sintoma:** `authentication failed` ou `connection refused`
**Solução:** Verificar credenciais no `.env`

## Configurações Aplicadas

✅ `connection_limit = 5` no schema.prisma
✅ `connect_timeout = 30` no schema.prisma  
✅ `pool_timeout = 30` no schema.prisma
✅ Retry logic no authController.js
✅ Pool reduzido no Python (pool_size=5)






