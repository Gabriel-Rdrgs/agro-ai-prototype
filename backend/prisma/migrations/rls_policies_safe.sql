-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES - VERSÃO SEGURA
-- FASE 0 - Semana 1: Ativar RLS no Supabase
-- ============================================
-- Esta versão verifica se as tabelas existem antes de aplicar RLS
-- Execute este arquivo no Supabase SQL Editor

-- ============================================
-- 1. OPPORTUNITY (Oportunidades de Arbitragem)
-- ============================================
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Opportunity') THEN
    ALTER TABLE "Opportunity" ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Authenticated users can view all opportunities" ON "Opportunity";
    DROP POLICY IF EXISTS "Only admins can manage opportunities" ON "Opportunity";
    
    CREATE POLICY "Authenticated users can view all opportunities" 
      ON "Opportunity"
      FOR SELECT
      USING (auth.role() = 'authenticated');

    CREATE POLICY "Only admins can manage opportunities" 
      ON "Opportunity"
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM auth.users
          WHERE auth.users.id = auth.uid()
          AND (auth.users.raw_user_meta_data->>'role' = 'admin' OR auth.users.raw_user_meta_data->>'role' = 'super_admin')
        )
      );
  END IF;
END $$;

-- ============================================
-- 2. PRICE HISTORY (Histórico de Preços)
-- ============================================
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'PriceHistory') THEN
    ALTER TABLE "PriceHistory" ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Authenticated users can view price history" ON "PriceHistory";
    
    CREATE POLICY "Authenticated users can view price history" 
      ON "PriceHistory"
      FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- ============================================
-- 3. USER (Dados de Usuários - Tabela Prisma)
-- ============================================
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'User') THEN
    ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can view own data" ON "User";
    DROP POLICY IF EXISTS "Only admins can manage users" ON "User";
    
    CREATE POLICY "Users can view own data" 
      ON "User"
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM auth.users
          WHERE auth.users.id::text = "User".id::text
          AND auth.users.id = auth.uid()
        )
      );

    CREATE POLICY "Only admins can manage users" 
      ON "User"
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM auth.users
          WHERE auth.users.id = auth.uid()
          AND (auth.users.raw_user_meta_data->>'role' = 'admin' OR auth.users.raw_user_meta_data->>'role' = 'super_admin')
        )
      );
  END IF;
END $$;

-- ============================================
-- 4. REFRESH TOKEN (Tokens de Refresh)
-- ============================================
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'RefreshToken') THEN
    ALTER TABLE "RefreshToken" ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can view own refresh tokens" ON "RefreshToken";
    
    CREATE POLICY "Users can view own refresh tokens" 
      ON "RefreshToken"
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM auth.users
          WHERE auth.users.id::text = "RefreshToken"."userId"::text
          AND auth.users.id = auth.uid()
        )
      );
  END IF;
END $$;

-- ============================================
-- 5. AUDIT LOG (Logs de Auditoria)
-- ============================================
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'AuditLog') THEN
    ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Only admins can view audit logs" ON "AuditLog";
    
    CREATE POLICY "Only admins can view audit logs" 
      ON "AuditLog"
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM auth.users
          WHERE auth.users.id = auth.uid()
          AND (auth.users.raw_user_meta_data->>'role' = 'admin' OR auth.users.raw_user_meta_data->>'role' = 'super_admin')
        )
      );
  END IF;
END $$;

-- ============================================
-- 6. DOCUMENTS (Documentos RAG)
-- ============================================
-- NOTA: A tabela no banco se chama "documents" (minúsculo, plural)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'documents') THEN
    ALTER TABLE "documents" ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Authenticated users can view documents" ON "documents";
    DROP POLICY IF EXISTS "Only admins can manage documents" ON "documents";
    
    CREATE POLICY "Authenticated users can view documents" 
      ON "documents"
      FOR SELECT
      USING (auth.role() = 'authenticated');

    CREATE POLICY "Only admins can manage documents" 
      ON "documents"
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM auth.users
          WHERE auth.users.id = auth.uid()
          AND (auth.users.raw_user_meta_data->>'role' = 'admin' OR auth.users.raw_user_meta_data->>'role' = 'super_admin')
        )
      );
  END IF;
END $$;

-- ============================================
-- 7. CEASA PRICE (Dados Públicos de Preços)
-- ============================================
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'CeasaPrice') THEN
    ALTER TABLE "CeasaPrice" ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Anyone can view CEASA prices" ON "CeasaPrice";
    
    CREATE POLICY "Anyone can view CEASA prices" 
      ON "CeasaPrice"
      FOR SELECT
      USING (true);
  END IF;
END $$;

-- ============================================
-- 8. FUEL PRICE (Dados Públicos de Combustível)
-- ============================================
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fuel_prices') THEN
    ALTER TABLE "fuel_prices" ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Anyone can view fuel prices" ON "fuel_prices";
    
    CREATE POLICY "Anyone can view fuel prices" 
      ON "fuel_prices"
      FOR SELECT
      USING (true);
  END IF;
END $$;

-- ============================================
-- 9. IBGE PRODUCTION (Dados Públicos IBGE)
-- ============================================
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'IBGEProduction') THEN
    ALTER TABLE "IBGEProduction" ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Anyone can view IBGE production data" ON "IBGEProduction";
    
    CREATE POLICY "Anyone can view IBGE production data" 
      ON "IBGEProduction"
      FOR SELECT
      USING (true);
  END IF;
END $$;

-- ============================================
-- 10. MARKET PRICES (Dados Públicos de Mercado)
-- ============================================
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'market_prices') THEN
    ALTER TABLE "market_prices" ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Anyone can view market prices" ON "market_prices";
    
    CREATE POLICY "Anyone can view market prices" 
      ON "market_prices"
      FOR SELECT
      USING (true);
  END IF;
END $$;

-- ============================================
-- 11. CEASA SYNC LOG (Logs de Sincronização)
-- ============================================
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'CeasaSyncLog') THEN
    ALTER TABLE "CeasaSyncLog" ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Only admins can view sync logs" ON "CeasaSyncLog";
    
    CREATE POLICY "Only admins can view sync logs" 
      ON "CeasaSyncLog"
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM auth.users
          WHERE auth.users.id = auth.uid()
          AND (auth.users.raw_user_meta_data->>'role' = 'admin' OR auth.users.raw_user_meta_data->>'role' = 'super_admin')
        )
      );
  END IF;
END $$;

-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================
-- Execute esta query para ver todas as políticas criadas:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;

