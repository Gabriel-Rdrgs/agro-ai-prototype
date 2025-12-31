# 🎯 Planejamento Incremental - Features de Decisão

**Data:** Dezembro 2025  
**Objetivo:** Transformar a aplicação em uma ferramenta indispensável para guiar decisões práticas do cliente

---

## 📊 Análise do Estado Atual

### ✅ O Que Já Temos (Base Sólida)

- ✅ Sistema de recomendação automática (COMPRAR/NÃO COMPRAR/AGUARDAR)
- ✅ Cálculo de ROI completo e preciso
- ✅ Previsões Prophet (7d e 30d)
- ✅ Análise climática detalhada
- ✅ Chat RAG para consultas agronômicas
- ✅ Mapa interativo com filtros avançados
- ✅ Dashboard com oportunidades em tempo real

### ⚠️ Gaps Críticos para Decisões

- ❌ **Falta contexto temporal** - Cliente não vê evolução histórica
- ❌ **Falta comparação prática** - Cliente não compara opções lado a lado
- ❌ **Falta simulação** - Cliente não testa cenários "e se..."
- ❌ **Falta alertas proativos** - Cliente precisa ficar checando manualmente
- ❌ **Falta rastreamento** - Cliente não acompanha decisões passadas
- ❌ **Falta insights acionáveis** - Cliente recebe dados, mas não orientação clara

---

## 🚀 FASE 5: FEATURES DE DECISÃO (4-6 Semanas)

### **Objetivo:**
Transformar dados em decisões práticas e acionáveis para o cliente.

---

## 📅 SEMANA 1-2: Contexto Temporal e Histórico

### **1.1. Histórico Visual de Preços e ROI** ⭐⭐⭐⭐⭐

**Por quê é crítico:**
- Cliente precisa ver tendência, não só valor atual
- Ajuda a identificar padrões sazonais
- Facilita decisão de "comprar agora" vs "aguardar"

**Implementação:**

#### Backend (`backend/routers/opportunities.js`)
```javascript
// Novo endpoint
GET /api/opportunities/:id/history
// Retorna: [{date, buyPrice, sellPrice, roi, volume, ...}]
```

#### Frontend (`frontend/src/components/Map/tabs/HistoryTab.jsx`)
- Gráfico de linha (Chart.js) mostrando:
  - Preço de compra (linha azul)
  - Preço de venda (linha verde)
  - ROI (linha laranja)
  - Volume negociado (barras)
- Períodos: 7d, 30d, 90d, 1 ano
- Indicadores:
  - Média móvel (7 dias)
  - Tendência (seta ↑↓)
  - Máximo/Mínimo do período

**Dados necessários:**
- Já temos `PriceHistory` no schema
- Popular via ETL (salvar snapshot diário de oportunidades)

**Impacto:** 🔥🔥🔥🔥🔥 (5/5) - Contexto essencial para decisão

---

### **1.2. Comparação com Ano Anterior** ⭐⭐⭐⭐

**Por quê é útil:**
- "Preço atual vs mesmo período ano anterior"
- Identifica anomalias e oportunidades sazonais
- Ajuda a planejar compras futuras

**Implementação:**
- Adicionar ao gráfico de histórico
- Linha tracejada mostrando valores do ano anterior
- Badge indicando: "Acima/abaixo da média histórica"

**Impacto:** 🔥🔥🔥🔥 (4/5) - Valor analítico importante

---

## 📅 SEMANA 2-3: Comparação e Análise Comparativa

### **2.1. Comparador de Oportunidades** ⭐⭐⭐⭐⭐

**Por quê é crítico:**
- Cliente precisa escolher entre múltiplas opções
- Facilita decisão mostrando trade-offs claramente
- Reduz tempo de análise

**Implementação:**

#### Frontend (`frontend/src/components/Map/ComparisonModal.jsx`)
- Seleção múltipla (checkbox) em cada oportunidade no mapa
- Botão "Comparar Selecionadas" (máx 3-5)
- Modal com tabela comparativa:

| Métrica | Oportunidade A | Oportunidade B | Oportunidade C |
|---------|----------------|---------------|----------------|
| **ROI** | 85% 🟢 | 120% 🟢 | 65% 🟡 |
| **Preço Compra** | R$ 2,50/kg | R$ 2,80/kg | R$ 2,30/kg |
| **Preço Venda** | R$ 4,50/kg | R$ 5,20/kg | R$ 3,80/kg |
| **Frete** | R$ 0,45/kg | R$ 0,60/kg | R$ 0,35/kg |
| **Distância** | 450 km | 680 km | 320 km |
| **Risco Climático** | 🟢 Baixo | 🟡 Médio | 🟢 Baixo |
| **Shelf Life** | 12 dias | 8 dias | 15 dias |
| **Recomendação IA** | ✅ COMPRAR | ✅ COMPRAR | ⏳ AGUARDAR |

- Gráfico radar comparando múltiplas dimensões
- Botão "Recomendação da IA" destacando melhor opção

#### Backend (`backend/routers/opportunities.js`)
```javascript
POST /api/opportunities/compare
{
  "opportunityIds": [123, 456, 789]
}
// Retorna: Array de oportunidades com métricas comparativas
```

**Impacto:** 🔥🔥🔥🔥🔥 (5/5) - Facilita decisão entre opções

---

### **2.2. Ranking Inteligente de Oportunidades** ⭐⭐⭐⭐

**Por quê é útil:**
- Cliente quer ver "melhores oportunidades" primeiro
- Ranking não é só ROI, mas score composto

**Implementação:**
- Novo endpoint: `GET /api/opportunities/ranked`
- Score composto:
  - ROI (40%)
  - Qualidade/Shelf Life (20%)
  - Risco Climático (20%)
  - Tendência de Mercado (10%)
  - Distância/Logística (10%)
- Ordenação por score, não só ROI
- Badge "⭐ Recomendado pela IA" nas top 10

**Impacto:** 🔥🔥🔥🔥 (4/5) - Melhora descoberta de oportunidades

---

## 📅 SEMANA 3-4: Simulação e Cenários

### **3.1. Simulador de Cenários Interativo** ⭐⭐⭐⭐⭐

**Por quê é crítico:**
- Cliente precisa testar "e se..." antes de decidir
- Reduz risco de decisões erradas
- Diferencial competitivo forte

**Implementação:**

#### Frontend (`frontend/src/components/Map/tabs/ScenarioTab.jsx`)
- Modal com sliders para ajustar variáveis:
  - **Dólar:** -20% a +20%
  - **Frete:** -30% a +30%
  - **Preço de Compra:** -15% a +15%
  - **Preço de Venda:** -15% a +15%
  - **Chuva (próximos 15 dias):** 0mm a 300mm
  - **Temperatura:** -5°C a +5°C
- Botão "Simular" recalcula ROI
- Resultado mostra:
  - ROI atual vs ROI simulado (comparação lado a lado)
  - Gráfico mostrando impacto de cada variável
  - Recomendação atualizada baseada no cenário

#### Backend (`ai-service/routers/predictions.py`)
```python
POST /api/v1/simulate/scenario
{
  "opportunity_id": 123,
  "scenarios": {
    "dollar_change": +10,  # +10%
    "freight_change": +20,  # +20%
    "buy_price_change": -5,  # -5%
    "rain_mm": 200,
    "temperature_change": +3  # +3°C
  }
}
```

**Lógica:**
- Recalcula ROI com variáveis alteradas
- Usa Prophet para prever impacto climático
- Ajusta shelf-life baseado em chuva/temperatura
- Retorna novo score de recomendação

**Cenários Pré-definidos:**
- "Cenário Otimista" (dólar -10%, frete -20%)
- "Cenário Pessimista" (dólar +10%, frete +20%)
- "Cenário de Seca" (chuva -50%)
- "Cenário de Chuva Excessiva" (chuva +100%)

**Impacto:** 🔥🔥🔥🔥🔥 (5/5) - Diferencial competitivo único

---

### **3.2. Análise de Sensibilidade** ⭐⭐⭐⭐

**Por quê é útil:**
- Mostra qual variável tem maior impacto no ROI
- Cliente entende o que monitorar mais de perto

**Implementação:**
- Após simulação, mostrar gráfico de sensibilidade:
  - "ROI é mais sensível a: Preço de Venda (45%), Frete (30%), Dólar (15%)"
- Tornado chart mostrando impacto de cada variável

**Impacto:** 🔥🔥🔥🔥 (4/5) - Valor educacional e estratégico

---

## 📅 SEMANA 4-5: Alertas Proativos

### **4.1. Sistema de Alertas Inteligentes** ⭐⭐⭐⭐⭐

**Por quê é crítico:**
- Cliente não pode ficar monitorando 24/7
- Oportunidades aparecem e desaparecem rapidamente
- Transforma app passivo em proativo

**Implementação:**

#### Schema (`backend/prisma/schema.prisma`)
```prisma
model Alert {
  id            String   @id @default(uuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  
  type          String   // "roi_threshold", "price_change", "extreme_weather", "new_opportunity"
  config        Json     // Configuração específica do alerta
  channels      String[] // ["email", "whatsapp", "push"]
  
  isActive      Boolean  @default(true)
  lastTriggered DateTime?
  triggerCount  Int      @default(0)
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

#### Tipos de Alertas:

**1. Alerta de ROI:**
```javascript
POST /api/alerts
{
  "type": "roi_threshold",
  "config": {
    "threshold": 80,  // ROI mínimo
    "product": "Tomate",  // opcional
    "state": "SP",  // opcional
    "direction": "above"  // "above" ou "below"
  },
  "channels": ["email", "whatsapp"]
}
```

**2. Alerta de Mudança de Preço:**
```javascript
{
  "type": "price_change",
  "config": {
    "product": "Tomate",
    "state": "SP",
    "threshold_percent": 15,  // Mudança de 15%
    "time_window_hours": 24,
    "direction": "up"  // "up", "down", "both"
  }
}
```

**3. Alerta de Eventos Climáticos:**
```javascript
{
  "type": "extreme_weather",
  "config": {
    "severity": ["extreme", "high"],
    "regions": ["SP", "MG"],
    "weather_types": ["hail", "tropical_storm", "frost"],
    "days_ahead": 7
  }
}
```

**4. Alerta de Nova Oportunidade:**
```javascript
{
  "type": "new_opportunity",
  "config": {
    "min_roi": 50,
    "products": ["Tomate", "Soja"],
    "regions": ["SP", "MG", "PR"]
  }
}
```

#### Worker (`ai-service/scripts/alert_worker.py`)
- Roda a cada 5 minutos
- Verifica todos os alertas ativos
- Compara condições atuais vs configuração
- Dispara notificações quando condições são atendidas
- Evita spam (rate limiting: máximo 1 alerta por tipo a cada 1h)

#### Notificações:

**Email (Resend/SendGrid):**
- Template HTML profissional
- Inclui link direto para oportunidade
- Gráfico de evolução (se aplicável)

**WhatsApp (Twilio):**
- Mensagem curta e direta
- Emoji para tipo de alerta
- Link para app

**Push (Web Push API):**
- Notificação no navegador
- Funciona mesmo com app fechado (PWA)

**Impacto:** 🔥🔥🔥🔥🔥 (5/5) - Transforma app em ferramenta proativa

---

### **4.2. Dashboard de Alertas** ⭐⭐⭐⭐

**Por quê é útil:**
- Cliente gerencia alertas criados
- Vê histórico de alertas disparados
- Ajusta configurações baseado em resultados

**Implementação:**
- Nova aba "Alertas" no Dashboard
- Lista de alertas ativos
- Histórico de alertas disparados (últimos 30 dias)
- Botão para pausar/reativar/editar/deletar
- Estatísticas: "Você foi alertado 12 vezes este mês"

**Impacto:** 🔥🔥🔥🔥 (4/5) - Controle e transparência

---

## 📅 SEMANA 5-6: Rastreamento e Aprendizado

### **5.1. Portfolio Tracking** ⭐⭐⭐⭐⭐

**Por quê é crítico:**
- Cliente quer acompanhar decisões realizadas
- Aprender com histórico (o que funcionou, o que não funcionou)
- Calcular lucro real vs projetado

**Implementação:**

#### Schema (`backend/prisma/schema.prisma`)
```prisma
model PortfolioOperation {
  id            String   @id @default(uuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  
  opportunityId Int?     // Referência à oportunidade original
  opportunity   Opportunity? @relation(fields: [opportunityId], references: [id])
  
  type          String   // "buy", "sell"
  product       String
  origin        String
  destination   String
  
  quantity      Float    // kg
  price         Float    // R$/kg
  totalValue    Float    // quantity * price
  
  projectedROI  Float?   // ROI projetado no momento da compra
  actualROI     Float?   // ROI real (calculado após venda)
  
  status        String   // "planned", "in_progress", "completed", "cancelled"
  
  notes         String?
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  completedAt   DateTime?
}
```

#### Frontend (`frontend/src/components/Dashboard/PortfolioSection.jsx`)
- Aba "Portfolio" no Dashboard
- Lista de operações:
  - Planejadas (compra agendada)
  - Em Andamento (compra realizada, aguardando venda)
  - Concluídas (venda realizada)
- Para cada operação:
  - ROI Projetado vs ROI Real (comparação)
  - Lucro/Prejuízo
  - Status visual (🟢 Lucro, 🔴 Prejuízo)
- Gráfico de evolução do portfolio (valor total ao longo do tempo)
- Estatísticas:
  - "Taxa de acerto: 78%" (operações com ROI real >= projetado)
  - "Lucro total: R$ 45.000"
  - "Melhor operação: +R$ 12.000 (ROI 125%)"

#### Backend (`backend/routers/portfolio.js`)
```javascript
// Registrar compra
POST /api/portfolio/operations
{
  "opportunityId": 123,
  "type": "buy",
  "quantity": 1000,
  "price": 2.50,
  "projectedROI": 85.5
}

// Registrar venda (completa operação)
PATCH /api/portfolio/operations/:id
{
  "type": "sell",
  "price": 4.20,
  "actualROI": 92.3
}
```

**Impacto:** 🔥🔥🔥🔥🔥 (5/5) - Aprendizado e accountability

---

### **5.2. Insights e Recomendações Personalizadas** ⭐⭐⭐⭐

**Por quê é útil:**
- Cliente recebe insights baseados em seu histórico
- Aprendizado contínuo do sistema
- Recomendações cada vez mais precisas

**Implementação:**

#### Backend (`ai-service/services/insights_engine.py`)
- Analisa histórico do portfolio do usuário
- Identifica padrões:
  - "Você tem melhor performance com Tomate em SP"
  - "Evite operações com ROI < 30% (taxa de acerto: 45%)"
  - "Suas melhores operações foram em meses de safra"
- Gera recomendações personalizadas:
  - "Baseado no seu histórico, recomendamos focar em Soja em MT (sua taxa de acerto: 85%)"
  - "Evite operações longas (>500km) - sua taxa de acerto cai para 60%"

#### Frontend
- Seção "💡 Insights para Você" no Dashboard
- Cards com recomendações personalizadas
- Botão "Por quê?" explicando o insight

**Impacto:** 🔥🔥🔥🔥 (4/5) - Valor personalizado e aprendizado

---

## 📅 SEMANA 6: Integração e Automação

### **6.1. Integração WhatsApp (Básica)** ⭐⭐⭐⭐

**Por quê é importante:**
- 95% dos produtores usam WhatsApp
- Notificações instantâneas
- Não precisa abrir app

**Implementação:**

#### Backend (`backend/routers/whatsapp.js`)
- Integração Twilio WhatsApp API
- Endpoint para receber mensagens (webhook)
- Comandos suportados:
  - `/preco tomate sp` → Retorna preço atual
  - `/oportunidades` → Retorna top 5 oportunidades
  - `/alerta roi 80` → Cria alerta de ROI > 80%
  - `/help` → Lista comandos disponíveis

#### Worker (`ai-service/scripts/whatsapp_worker.py`)
- Processa mensagens recebidas
- Responde com dados atualizados
- Envia alertas configurados

**Custo:** ~R$ 0,10 por mensagem (Twilio)

**Impacto:** 🔥🔥🔥🔥 (4/5) - Acessibilidade e engajamento

---

### **6.2. Relatórios Agendados por Email** ⭐⭐⭐

**Por quê é útil:**
- Cliente recebe resumo diário/semanal
- Não precisa acessar app todo dia
- Mantém engajamento

**Implementação:**

#### Backend (`backend/routers/reports.js`)
```javascript
POST /api/reports/schedule
{
  "frequency": "daily",  // "daily", "weekly", "monthly"
  "time": "08:00",
  "format": "pdf",  // "pdf", "html"
  "sections": [
    "top_opportunities",
    "market_trends",
    "weather_alerts",
    "portfolio_summary"
  ]
}
```

#### Worker (`ai-service/scripts/report_worker.py`)
- Gera relatório no horário configurado
- Inclui:
  - Top 5 oportunidades do dia
  - Gráfico de tendências de mercado
  - Alertas climáticos
  - Resumo do portfolio
- Envia por email (Resend/SendGrid)
- Anexa PDF se solicitado

**Impacto:** 🔥🔥🔥 (3/5) - Retenção e engajamento

---

## 📊 Resumo de Impacto

| Feature | Impacto | Esforço | Prioridade |
|---------|---------|---------|------------|
| **Histórico Visual de Preços** | 🔥🔥🔥🔥🔥 | Médio (3-4 dias) | ALTA |
| **Comparador de Oportunidades** | 🔥🔥🔥🔥🔥 | Médio (3-4 dias) | ALTA |
| **Simulador de Cenários** | 🔥🔥🔥🔥🔥 | Alto (5-7 dias) | ALTA |
| **Sistema de Alertas** | 🔥🔥🔥🔥🔥 | Alto (5-7 dias) | ALTA |
| **Portfolio Tracking** | 🔥🔥🔥🔥🔥 | Médio (4-5 dias) | ALTA |
| **Ranking Inteligente** | 🔥🔥🔥🔥 | Baixo (2-3 dias) | MÉDIA |
| **Análise de Sensibilidade** | 🔥🔥🔥🔥 | Baixo (2 dias) | MÉDIA |
| **Insights Personalizados** | 🔥🔥🔥🔥 | Médio (3-4 dias) | MÉDIA |
| **Integração WhatsApp** | 🔥🔥🔥🔥 | Médio (3-4 dias) | MÉDIA |
| **Relatórios Agendados** | 🔥🔥🔥 | Baixo (2-3 dias) | BAIXA |

---

## 🎯 Roadmap de Implementação Recomendado

### **Sprint 1 (Semanas 1-2): Contexto Temporal**
1. ✅ Histórico Visual de Preços
2. ✅ Comparação com Ano Anterior

**Resultado:** Cliente vê evolução e tendências

---

### **Sprint 2 (Semanas 2-3): Comparação**
3. ✅ Comparador de Oportunidades
4. ✅ Ranking Inteligente

**Resultado:** Cliente compara e escolhe melhor

---

### **Sprint 3 (Semanas 3-4): Simulação**
5. ✅ Simulador de Cenários
6. ✅ Análise de Sensibilidade

**Resultado:** Cliente testa cenários antes de decidir

---

### **Sprint 4 (Semanas 4-5): Proatividade**
7. ✅ Sistema de Alertas
8. ✅ Dashboard de Alertas

**Resultado:** App notifica cliente de oportunidades

---

### **Sprint 5 (Semanas 5-6): Aprendizado**
9. ✅ Portfolio Tracking
10. ✅ Insights Personalizados

**Resultado:** Cliente aprende com histórico

---

### **Sprint 6 (Semana 6): Automação**
11. ✅ Integração WhatsApp
12. ✅ Relatórios Agendados

**Resultado:** Cliente recebe informações automaticamente

---

## 💡 Features Adicionais (Nice to Have)

### **7.1. Favoritos e Watchlist** ⭐⭐⭐⭐
- Já existe modelo `Favorite` no schema
- Implementar: botão favoritar, aba de favoritos, histórico de preços para favoritos

### **7.2. Compartilhamento de Oportunidades** ⭐⭐⭐
- Gerar link único para compartilhar oportunidade
- Útil para equipes e parceiros

### **7.3. Modo Escuro/Claro** ⭐⭐
- Preferência do usuário
- Melhora experiência visual

---

## 📈 Métricas de Sucesso

### KPIs para Medir Impacto:

1. **Engajamento:**
   - Tempo médio na aplicação (meta: +50%)
   - Frequência de acesso (meta: +30%)
   - Número de simulações por usuário (meta: 3+/mês)

2. **Conversão:**
   - % de usuários que criam alertas (meta: 40%+)
   - % de usuários que usam simulador (meta: 60%+)
   - % de usuários que registram operações (meta: 30%+)

3. **Retenção:**
   - Taxa de retorno semanal (meta: 70%+)
   - Churn rate mensal (meta: <10%)

4. **Valor:**
   - ROI médio das oportunidades aproveitadas (meta: manter >50%)
   - Taxa de acerto de recomendações (meta: 75%+)
   - NPS (Net Promoter Score) (meta: 50+)

---

## 🎯 Conclusão

**Top 5 Features que Transformam em Ferramenta de Decisão:**

1. 🔥 **Simulador de Cenários** - Testa "e se..." antes de decidir
2. 🔥 **Sistema de Alertas** - App proativo, não reativo
3. 🔥 **Histórico Visual** - Contexto temporal essencial
4. 🔥 **Comparador de Oportunidades** - Facilita escolha
5. 🔥 **Portfolio Tracking** - Aprende com histórico

**Próximo Passo Recomendado:**
Começar pela **Sprint 1** (Histórico Visual). É relativamente simples, mas com alto impacto no contexto para decisão.

---

**Última atualização:** Dezembro 2025

