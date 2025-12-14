# 📋 PLANEJAMENTO EXPANDIDO - AGRO-AI PROTOTYPE

**Data de Criação:** Dezembro 2025  
**Última Atualização:** Dezembro 2025  
**Status:** Em Execução  
**Progresso Geral:** ~70%  
**Novo Prazo:** 16 Semanas (4 Meses)

---

## 🎯 PLANO DE AÇÃO EXPANDIDO (Próximas 16 Semanas)

> **Nota:** Este planejamento incorpora **TODAS** as sugestões de melhorias identificadas para tornar a aplicação um programa de previsão de mercado completo e útil. O prazo foi expandido para 16 semanas (4 meses) para acomodar todas as funcionalidades de forma realista.

> **⚠️ IMPORTANTE:** Antes de iniciar este plano, recomenda-se completar a **FASE 0: Fundação Sólida (1-3 meses)** descrita no `PLANEJAMENTO.md`. A FASE 0 estabelece a base técnica (Sentry, GitHub Actions, RLS, APIs essenciais) necessária para um MVP empresarial robusto.

---

### **SEMANA 1: Quick Wins - Visualizações e Exportação** ⚡

**Objetivo:** Implementar melhorias rápidas de alto impacto

#### **Dia 1-2: Gráfico de Candle (Candlestick)**
- [ ] Implementar gráfico tipo bolsa de valores para preços
- [ ] Mostrar: abertura, fechamento, máxima, mínima do dia
- [ ] Identificar padrões: tendência de alta, reversão
- [ ] Integrar no Dashboard

#### **Dia 3: Exportação Excel/CSV**
- [ ] Botão "Exportar" em todas as tabelas
- [ ] Formato Excel com formatação
- [ ] CSV para análise externa
- [ ] Testes de exportação

#### **Dia 4-5: Comparador de Oportunidades**
- [ ] Tabela comparativa: "Melhor oportunidade hoje"
- [ ] Ranking por: ROI, Risco, Distância, Qualidade
- [ ] Filtro "Mostrar apenas top 5"
- [ ] Integração no Sidebar

**Esforço Total:** 4-5 dias  
**Impacto:** ✅ Alto - Melhora visualização e usabilidade imediata

---

### **SEMANA 2: Sistema de Alertas Inteligentes** 🔔

**Objetivo:** Implementar sistema completo de notificações

#### **Dia 1-2: Backend - Sistema de Jobs**
- [ ] Configurar node-cron ou Bull para jobs agendados
- [ ] Criar serviço de verificação de alertas
- [ ] Lógica de detecção: ROI > 100%, preço cai >10%, eventos extremos
- [ ] Banco de dados: tabela `UserAlert` e `AlertHistory`

#### **Dia 3: Frontend - Configuração de Alertas**
- [ ] Interface para configurar alertas por região/produto
- [ ] "Regiões favoritas" para monitorar
- [ ] Tipos de alerta: ROI alto, preço cai, evento extremo, safra ideal
- [ ] Gerenciamento de alertas (ativar/desativar)

#### **Dia 4: Integração Email**
- [ ] Configurar serviço de email (SendGrid/Nodemailer)
- [ ] Templates de email para alertas
- [ ] Testes de envio

#### **Dia 5: Testes e Polimento**
- [ ] Testes end-to-end do sistema de alertas
- [ ] Ajustes de performance
- [ ] Documentação

**Esforço Total:** 4-5 dias  
**Impacto:** ✅ Muito Alto - Produtor não precisa ficar checando

---

### **SEMANA 3: Dashboard de Tendências de Mercado** 📊

**Objetivo:** Visualização profissional de tendências e volatilidade

#### **Dia 1-2: Backend - Endpoint de Tendências**
- [ ] Criar `/api/v1/market/trends`
- [ ] Calcular tendência (up/down/stable) por produto/região
- [ ] Calcular volatilidade (bandas de Bollinger, desvio padrão)
- [ ] Comparação entre regiões ("SP está 15% mais caro que MG")

#### **Dia 3: Frontend - Gráficos de Tendência**
- [ ] Gráfico de linha: últimos 30/90/180 dias
- [ ] Indicadores de volatilidade visual
- [ ] Comparação entre regiões (gráfico comparativo)
- [ ] Filtros: produto, região, período

#### **Dia 4: Alertas Automáticos de Tendência**
- [ ] Alerta quando preço sobe/desce >10% em 24h
- [ ] Integração com sistema de alertas (Semana 2)
- [ ] Notificações push

#### **Dia 5: Testes e Refinamento**
- [ ] Testes com dados reais
- [ ] Ajustes de performance
- [ ] Polimento visual

**Esforço Total:** 4-5 dias  
**Impacto:** ✅ Muito Alto - Identifica momentos ideais de compra/venda

---

### **SEMANA 4: Histórico de Decisões e ROI Realizado** 📈

**Objetivo:** Sistema de aprendizado com decisões passadas

#### **Dia 1: Banco de Dados**
- [ ] Criar tabela `UserDecision` no Prisma
- [ ] Campos: opportunityId, userId, decisionDate, predictedROI, actualROI, status
- [ ] Migração de banco

#### **Dia 2: Backend - API de Decisões**
- [ ] Endpoint POST `/api/decisions` (salvar decisão)
- [ ] Endpoint PUT `/api/decisions/:id` (atualizar ROI realizado)
- [ ] Endpoint GET `/api/decisions` (listar decisões do usuário)
- [ ] Cálculo de acurácia: ROI previsto vs realizado

#### **Dia 3: Frontend - Interface de Decisões**
- [ ] Botão "Marcar como Comprada" em oportunidades
- [ ] Modal para inserir ROI realizado (após venda)
- [ ] Dashboard "Minhas Decisões" com histórico
- [ ] Gráfico: ROI previsto vs realizado

#### **Dia 4: Dashboard de Aprendizado**
- [ ] Estatísticas: acurácia média, melhores/piores decisões
- [ ] Identificar padrões: "você compra melhor em SP do que em MG"
- [ ] Recomendações baseadas em histórico

#### **Dia 5: Testes e Refinamento**
- [ ] Testes end-to-end
- [ ] Ajustes de UX
- [ ] Documentação

**Esforço Total:** 4-5 dias  
**Impacto:** ✅ Muito Alto - Aprendizado contínuo e melhoria de previsões

---

### **SEMANA 5: Análise de Correlação entre Regiões** 🔗

**Objetivo:** Identificar padrões de correlação de preços

#### **Dia 1-2: Backend - Cálculo de Correlação**
- [ ] Algoritmo de correlação de Pearson entre regiões
- [ ] Matriz de correlação (região x região)
- [ ] Endpoint `/api/v1/market/correlation`
- [ ] Cache de correlações (atualizar diariamente)

#### **Dia 3: Frontend - Visualização**
- [ ] Heatmap de correlação (matriz visual)
- [ ] Identificar regiões altamente correlacionadas
- [ ] Sugestão: "regiões alternativas" quando região principal está cara

#### **Dia 4: Integração com Recomendações**
- [ ] Usar correlação para sugerir mercados substitutos
- [ ] Alertas: "SP e MG estão correlacionados, considere MG se SP estiver cara"

#### **Dia 5: Testes e Refinamento**
- [ ] Validação de correlações com dados históricos
- [ ] Ajustes de algoritmo
- [ ] Documentação

**Esforço Total:** 4-5 dias  
**Impacto:** ✅ Alto - Encontra mercados substitutos

---

### **SEMANA 6: Previsão de Oferta e Demanda** ⚖️

**Objetivo:** Prever escassez/excesso baseado em calendário + clima

#### **Dia 1-2: Backend - Serviço de Previsão**
- [ ] Criar `supply_demand_forecast.py`
- [ ] Combinar: calendário de plantio + previsão climática + histórico de preços
- [ ] Prever escassez (quando safra termina + clima ruim)
- [ ] Prever excesso (safra concentrada + clima bom)

#### **Dia 3: Endpoint e Lógica**
- [ ] Endpoint `/api/v1/market/supply-demand`
- [ ] Retornar: escassez prevista, excesso previsto, recomendação
- [ ] Sugestão: "comprar agora" vs "esperar 15 dias"

#### **Dia 4: Frontend - Visualização**
- [ ] Timeline de oferta/demanda prevista
- [ ] Indicadores visuais: escassez (vermelho), excesso (verde)
- [ ] Recomendações claras de ação

#### **Dia 5: Testes e Refinamento**
- [ ] Validação com dados históricos
- [ ] Ajustes de algoritmo
- [ ] Integração com alertas

**Esforço Total:** 4-5 dias  
**Impacto:** ✅ Muito Alto - Decisão estratégica de compra/venda

---

### **SEMANA 7: Integração WhatsApp Business API** 📱

**Objetivo:** Alertas e chatbot via WhatsApp

#### **Dia 1: Setup WhatsApp Business API**
- [ ] Configurar conta WhatsApp Business API
- [ ] Obter tokens e credenciais
- [ ] Configurar webhook

#### **Dia 2: Backend - Integração**
- [ ] Biblioteca: `whatsapp-web.js` ou API oficial
- [ ] Serviço de envio de mensagens
- [ ] Integração com sistema de alertas (Semana 2)
- [ ] Enviar alertas via WhatsApp

#### **Dia 3: Chatbot via WhatsApp**
- [ ] Comandos: "SP tomate" → retorna oportunidades
- [ ] Comandos: "tendência SP" → retorna tendências
- [ ] Comandos: "alertas" → lista alertas configurados
- [ ] Processamento de mensagens recebidas

#### **Dia 4: Frontend - Configuração**
- [ ] Interface para vincular número WhatsApp
- [ ] Configurar alertas via WhatsApp
- [ ] Testes de envio

#### **Dia 5: Testes e Documentação**
- [ ] Testes end-to-end
- [ ] Documentação de comandos
- [ ] Guia de uso

**Esforço Total:** 4-5 dias  
**Impacto:** ✅ Muito Alto - 90% dos produtores usam WhatsApp

---

### **SEMANA 8: Mapa de Calor de Preços** 🗺️

**Objetivo:** Visualização instantânea de preços no mapa

#### **Dia 1-2: Backend - Cálculo de Preços por Região**
- [ ] Agregar preços por região (média, min, max)
- [ ] Endpoint `/api/v1/market/price-heatmap`
- [ ] Cache de dados de calor

#### **Dia 3: Frontend - Visualização**
- [ ] Camada de calor no mapa (Leaflet Heat)
- [ ] Cores: vermelho = caro, verde = barato
- [ ] Tooltip com informações detalhadas
- [ ] Filtro por produto

#### **Dia 4: Integração e Interatividade**
- [ ] Atualização em tempo real
- [ ] Zoom interativo
- [ ] Legenda de cores

#### **Dia 5: Testes e Refinamento**
- [ ] Testes de performance
- [ ] Ajustes visuais
- [ ] Documentação

**Esforço Total:** 4-5 dias  
**Impacto:** ✅ Alto - Visualização instantânea de oportunidades

---

### **SEMANA 9: Timeline de Eventos** 📅

**Objetivo:** Visualização de eventos futuros planejados

#### **Dia 1-2: Backend - Agregação de Eventos**
- [ ] Combinar: calendário de plantio + previsões Prophet + eventos climáticos
- [ ] Endpoint `/api/v1/events/timeline`
- [ ] Eventos: início safra, previsão de alta/baixa, eventos extremos previstos

#### **Dia 3: Frontend - Timeline Visual**
- [ ] Componente de timeline (linha do tempo)
- [ ] Eventos: "Em 15 dias: safra começa em SP"
- [ ] Eventos: "Em 30 dias: preço deve subir 10% (Prophet)"
- [ ] Filtros: produto, região

#### **Dia 4: Integração e Interatividade**
- [ ] Clique em evento → mostra detalhes
- [ ] Links para oportunidades relacionadas
- [ ] Exportação de timeline

#### **Dia 5: Testes e Refinamento**
- [ ] Testes com dados reais
- [ ] Ajustes de UX
- [ ] Documentação

**Esforço Total:** 4-5 dias  
**Impacto:** ✅ Médio - Planejamento antecipado

---

### **SEMANA 10: Relatórios PDF Automáticos** 📄

**Objetivo:** Geração e envio automático de relatórios

#### **Dia 1-2: Backend - Geração de PDF**
- [ ] Biblioteca: `pdfkit` ou `puppeteer`
- [ ] Template de relatório: "Oportunidades de Hoje"
- [ ] Incluir: gráficos, tabelas, recomendações
- [ ] Endpoint `/api/reports/generate`

#### **Dia 3: Agendamento e Envio**
- [ ] Job agendado: gerar PDF diariamente
- [ ] Enviar por email (integração com Semana 2)
- [ ] Armazenar PDFs em S3 (futuro) ou local

#### **Dia 4: Frontend - Configuração**
- [ ] Interface para configurar relatórios
- [ ] Escolher: frequência, conteúdo, destinatários
- [ ] Download manual de relatórios

#### **Dia 5: Testes e Refinamento**
- [ ] Testes de geração
- [ ] Ajustes de layout
- [ ] Documentação

**Esforço Total:** 4-5 dias  
**Impacto:** ✅ Alto - Compartilhamento e documentação

---

### **SEMANA 11-12: Recomendação Personalizada por Perfil** 🤖

**Objetivo:** IA que aprende preferências do usuário

#### **Semana 11: Backend - Engine de Preferências**
- [ ] Criar `user_preference_engine.py`
- [ ] Algoritmo: clustering ou collaborative filtering
- [ ] Aprender: preferência por ROI alto vs baixo risco, distâncias, estados
- [ ] Endpoint `/api/v1/recommendations/personalized`

#### **Semana 12: Frontend - Dashboard Personalizado**
- [ ] Seção "Recomendado para você"
- [ ] Explicação: "Baseado no seu histórico, recomendamos..."
- [ ] Ajustes de preferências (manual)
- [ ] Feedback: "útil" / "não útil" para melhorar algoritmo

**Esforço Total:** 8-10 dias  
**Impacto:** ✅ Muito Alto - Diferenciação forte

---

### **SEMANA 13: Chatbot de Decisão** 💬

**Objetivo:** Interface natural para consultas complexas

#### **Dia 1-2: Backend - Lógica de Análise**
- [ ] Parser de perguntas: "Devo comprar tomate em SP hoje?"
- [ ] Análise: ROI, clima, risco, histórico
- [ ] Geração de resposta: "Sim, recomendado. ROI 120%, risco baixo..."

#### **Dia 3: Frontend - Interface de Chat**
- [ ] Componente de chat
- [ ] Input de texto livre
- [ ] Respostas formatadas com dados
- [ ] Histórico de conversas

#### **Dia 4: Integração com IA**
- [ ] Usar RAG para contexto adicional
- [ ] Melhorar respostas com conhecimento técnico
- [ ] Sugestões de perguntas

#### **Dia 5: Testes e Refinamento**
- [ ] Testes com perguntas reais
- [ ] Ajustes de NLP
- [ ] Documentação

**Esforço Total:** 4-5 dias  
**Impacto:** ✅ Alto - UX diferenciada

---

### **SEMANA 14: Dados de Trânsito em Tempo Real** 🚗

**Objetivo:** Frete mais preciso considerando trânsito

#### **Dia 1-2: Integração Google Maps Distance Matrix**
- [ ] Configurar API key
- [ ] Integrar com cálculo de frete existente
- [ ] Considerar trânsito atual na rota
- [ ] Ajustar ROI baseado em tempo real

#### **Dia 3: Frontend - Visualização**
- [ ] Mostrar tempo de entrega considerando trânsito
- [ ] Indicador: "trânsito normal" / "trânsito pesado"
- [ ] Atualização em tempo real

#### **Dia 4: Otimização**
- [ ] Cache de rotas (evitar chamadas excessivas)
- [ ] Fallback quando API não disponível
- [ ] Ajustes de performance

#### **Dia 5: Testes e Refinamento**
- [ ] Testes com diferentes rotas
- [ ] Validação de precisão
- [ ] Documentação

**Esforço Total:** 4-5 dias  
**Impacto:** ✅ Médio - Frete mais preciso

---

### **SEMANA 15-16: App Mobile (React Native)** 📱

**Objetivo:** App nativo iOS/Android completo

#### **Semana 15: Setup e Estrutura Base**
- [ ] Inicializar projeto React Native
- [ ] Configurar navegação (React Navigation)
- [ ] Estrutura de pastas e componentes
- [ ] Integração com API backend
- [ ] Autenticação JWT

#### **Semana 16: Funcionalidades Principais**
- [ ] Tela de mapa (React Native Maps)
- [ ] Lista de oportunidades
- [ ] Dashboard com gráficos
- [ ] Sistema de alertas (notificações push nativas)
- [ ] Modo offline (cache de dados recentes)
- [ ] Deploy: iOS (TestFlight) e Android (Play Store)

**Esforço Total:** 10-12 dias  
**Impacto:** ✅ Alto - Acesso no campo

---

## 📊 RESUMO DO PLANO EXPANDIDO

### **Total de Semanas:** 16 semanas (4 meses)

### **Distribuição por Categoria:**
- **Quick Wins (Semana 1):** 3 funcionalidades
- **Alertas e Notificações (Semana 2, 7):** 2 funcionalidades
- **Inteligência de Mercado (Semanas 3, 5, 6):** 3 funcionalidades
- **Análise e Aprendizado (Semana 4):** 1 funcionalidade
- **Visualizações (Semanas 8, 9):** 2 funcionalidades
- **Relatórios (Semana 10):** 1 funcionalidade
- **IA e Automação (Semanas 11-12, 13):** 2 funcionalidades
- **Integrações (Semana 14):** 1 funcionalidade
- **Mobile (Semanas 15-16):** 1 funcionalidade (app completo)

### **Total de Funcionalidades:** 16 funcionalidades principais

### **Priorização:**
1. **Semanas 1-4:** Quick wins e alto impacto imediato
2. **Semanas 5-8:** Funcionalidades de mercado e visualização
3. **Semanas 9-12:** IA avançada e personalização
4. **Semanas 13-16:** Diferenciação e mobile

---

## ⚠️ FUNCIONALIDADES ADICIONAIS (Futuro - Após 16 Semanas)

### **Análise de Sentimento de Mercado** (5-7 dias)
- Scraping de notícias agrícolas
- Análise de sentimento (positivo/negativo)
- Correlação com movimentos de preço

### **Integração com Sistemas de Gestão (ERP)** (1-2 semanas)
- API para integrar com ERPs agrícolas
- Sincronizar: compras, vendas, estoque
- ROI calculado com dados reais

### **PWA Completo** (2-3 dias)
- Service Worker completo
- Manifest.json
- Instalação como app

---

## 🎯 MÉTRICAS DE SUCESSO DO PLANO EXPANDIDO

### **Funcionalidades:**
- ✅ 16 funcionalidades principais implementadas
- ✅ App mobile nativo funcionando
- ✅ Sistema de alertas completo
- ✅ IA personalizada funcionando

### **Impacto Esperado:**
- 📈 Aumento de 300% em decisões tomadas (baseado em alertas)
- 📈 Redução de 50% em tempo de análise (dashboard de tendências)
- 📈 Melhoria de 40% em acurácia de previsões (histórico de decisões)
- 📈 Aumento de 200% em uso mobile (app nativo)

