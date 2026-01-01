# 🔔 Guia de Migração - Sistema de Alertas (B2)

## Problema
O Prisma está tendo problemas com o shadow database ao tentar criar a migração automaticamente.

## Solução: Aplicar SQL Manualmente

### Passo 1: Acessar Supabase SQL Editor
1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Crie uma nova query

### Passo 2: Executar o SQL
Copie e execute o seguinte SQL:

```sql
-- ✅ FASE B - B2: Adicionar campos de alertas ao User e Alert

-- AlterTable: Adicionar campos de alertas ao User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "alertsEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "telegramChatId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "preferredAlertChannel" TEXT NOT NULL DEFAULT 'email';

-- AlterTable: Adicionar campos específicos ao Alert
ALTER TABLE "Alert" ADD COLUMN IF NOT EXISTS "product" TEXT;
ALTER TABLE "Alert" ADD COLUMN IF NOT EXISTS "minRoi" DOUBLE PRECISION;
ALTER TABLE "Alert" ADD COLUMN IF NOT EXISTS "minProfit" DOUBLE PRECISION;
ALTER TABLE "Alert" ADD COLUMN IF NOT EXISTS "regions" TEXT;

-- AlterTable: Atualizar campos do Alert
ALTER TABLE "Alert" ALTER COLUMN "type" SET DEFAULT 'opportunity';
ALTER TABLE "Alert" ALTER COLUMN "channels" SET DEFAULT '["email"]';

-- CreateIndex: Índice composto para queries frequentes
CREATE INDEX IF NOT EXISTS "Alert_userId_isActive_idx" ON "Alert"("userId", "isActive");

-- CreateIndex: Índice para product (se não existir)
CREATE INDEX IF NOT EXISTS "Alert_product_idx" ON "Alert"("product");
```

### Passo 3: Marcar Migração como Aplicada
Após executar o SQL, marque a migração como aplicada:

```bash
cd backend
npx prisma migrate resolve --applied 20250101190000_add_alert_user_fields
```

### Passo 4: Gerar Prisma Client
```bash
cd backend
npx prisma generate
```

## Verificação
Após aplicar, verifique se as colunas foram criadas:

```sql
-- Verificar colunas do User
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'User' 
AND column_name IN ('alertsEnabled', 'telegramChatId', 'phone', 'preferredAlertChannel');

-- Verificar colunas do Alert
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'Alert' 
AND column_name IN ('product', 'minRoi', 'minProfit', 'regions');
```

## Alternativa: Usar Prisma Studio
Se preferir, você pode usar o Prisma Studio para verificar as mudanças:

```bash
cd backend
npx prisma studio
```

