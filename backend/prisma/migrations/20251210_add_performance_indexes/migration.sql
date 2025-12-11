-- Migration: Adiciona índices para performance
-- Data: 2025-12-10
-- Objetivo: Otimizar queries frequentes

-- Índice para busca por produto (muito usado)
CREATE INDEX IF NOT EXISTS "Opportunity_product_idx" ON "Opportunity"("product");

-- Índice para busca por estado (muito usado)
CREATE INDEX IF NOT EXISTS "Opportunity_state_idx" ON "Opportunity"("state");

-- Índice composto para busca por produto + estado (otimiza queries comuns)
CREATE INDEX IF NOT EXISTS "Opportunity_product_state_idx" ON "Opportunity"("product", "state");

-- Índice para ordenação por data (já existe, mas garantindo)
-- CREATE INDEX IF NOT EXISTS "Opportunity_createdAt_idx" ON "Opportunity"("createdAt");

-- Índice para busca por ROI (para filtros)
CREATE INDEX IF NOT EXISTS "Opportunity_roi_idx" ON "Opportunity"("roi") WHERE "roi" IS NOT NULL;

-- Índice para CeasaPrice (busca por produto + data)
CREATE INDEX IF NOT EXISTS "CeasaPrice_product_date_idx" ON "CeasaPrice"("product_name", "price_date");

-- Índice para CeasaPrice (busca por região)
CREATE INDEX IF NOT EXISTS "CeasaPrice_region_idx" ON "CeasaPrice"("ceasa_region");



