# 🎨 PLANO: UI do Mapa Sem Poluição Visual

**Data:** Dezembro 2025  
**Objetivo:** Exibir todas as informações sem poluir visualmente

---

## 📋 REQUISITOS A EXIBIR

### **Informações Básicas (Sempre Visíveis)**
- Produto
- Localização (cidade, estado)
- ROI
- Preço de compra/venda

### **Informações Detalhadas (Sob Demanda)**
- Qualidade da mercadoria
- Dias de mercadoria disponível
- Início de frete/vendas
- Informações de safra
- Como colhe a região
- Chuva ano anterior vs. atual
- Picos de frio/calor
- Regiões comprometidas
- Recomendações de compra/não compra

---

## 🎨 ESTRATÉGIA DE UI/UX

### **1. Sistema de Camadas (Layers)**

**Conceito:** Informações em camadas, do mais simples ao mais detalhado.

```
CAMADA 1: Popup Básico (Sempre visível ao clicar)
├── Produto + Localização
├── ROI (grande, destacado)
├── Preços (compra/venda)
└── [Botão: "Ver Detalhes Completos"]

CAMADA 2: Modal de Detalhes (Ao clicar "Ver Detalhes")
├── Aba 1: Financeiro
│   ├── ROI, Preços, Frete
│   └── Gráfico de evolução
├── Aba 2: Qualidade & Disponibilidade
│   ├── Qualidade atual (%)
│   ├── Dias restantes
│   ├── Shelf-life
│   └── Início de frete/vendas
├── Aba 3: Clima & Safra
│   ├── Chuva (ano anterior vs. atual)
│   ├── Eventos extremos (frio/calor)
│   ├── Época de safra
│   └── Como colhe a região
├── Aba 4: Recomendações IA
│   ├── Compra/Não compra
│   ├── Score de recomendação
│   ├── Justificativa
│   └── Regiões comprometidas
└── Aba 5: Análise Completa
    └── Todos os dados técnicos
```

---

### **2. Indicadores Visuais no Mapa**

**Marcadores com Cores/Ícones:**
- 🟢 Verde: ROI > 100% (Alto)
- 🟡 Amarelo: ROI 50-100% (Médio)
- 🔴 Vermelho: ROI < 50% (Baixo)
- ⚠️ Alerta: Evento extremo detectado
- 🚨 Crítico: Região comprometida

**Tooltips ao Hover:**
- ROI
- Qualidade (%)
- Dias restantes
- Status de safra

---

### **3. Sidebar Inteligente**

**Estrutura:**
```
┌─────────────────────────┐
│ 🔍 Busca                │
├─────────────────────────┤
│ 📊 Filtros Rápidos      │
│  [Alto ROI] [Médio] ... │
├─────────────────────────┤
│ 📋 Lista de Oportunidades│
│  ┌─────────────────────┐│
│  │ 🍅 Tomate - SP      ││
│  │ 🎯 120% ROI         ││
│  │ 📍 São Paulo         ││
│  │ [Ver Detalhes] →     ││
│  └─────────────────────┘│
│  ┌─────────────────────┐│
│  │ 🌽 Milho - PR       ││
│  │ 🎯 85% ROI          ││
│  │ 📍 Curitiba         ││
│  │ [Ver Detalhes] →     ││
│  └─────────────────────┘│
└─────────────────────────┘
```

**Ao clicar em "Ver Detalhes":**
- Abre modal com todas as abas
- Sidebar permanece visível (não fecha)
- Modal sobrepõe o mapa

---

### **4. Modal de Detalhes (Sistema de Abas)**

**Design:**
```
┌─────────────────────────────────────────┐
│ 🍅 Tomate - São Paulo, SP        [X]   │
├─────────────────────────────────────────┤
│ [💰 Financeiro] [📊 Qualidade] [🌦️ Clima]│
│ [🤖 IA] [📈 Análise]                    │
├─────────────────────────────────────────┤
│                                         │
│  CONTEÚDO DA ABA SELECIONADA           │
│                                         │
│  [Aba 1: Financeiro]                    │
│  - ROI: 120%                            │
│  - Preço Compra: R$ 3,50/kg            │
│  - Preço Venda: R$ 7,70/kg             │
│  - Frete: R$ 0,80/kg                   │
│  - Gráfico de evolução                  │
│                                         │
└─────────────────────────────────────────┘
```

**Abas:**
1. **💰 Financeiro** - ROI, preços, frete, gráficos
2. **📊 Qualidade** - Qualidade atual, dias restantes, shelf-life, início frete
3. **🌦️ Clima** - Chuva (comparação), eventos extremos, safra
4. **🤖 IA** - Recomendações, score, justificativa
5. **📈 Análise** - Dados técnicos completos

---

### **5. Alertas e Notificações**

**Sistema de Badges:**
- Badge vermelho: "⚠️ Evento Extremo"
- Badge laranja: "🚨 Região Comprometida"
- Badge azul: "🤖 Recomendado pela IA"
- Badge verde: "✅ Safra Ideal"

**Posicionamento:**
- No canto superior direito do popup
- No marcador do mapa (ícone pequeno)
- Na lista do sidebar (ícone ao lado do ROI)

---

### **6. Comparação de Chuva (Gráfico Compacto)**

**Design:**
```
┌─────────────────────────┐
│ 🌧️ Chuva: Ano Anterior vs. Atual │
├─────────────────────────┤
│                         │
│  Ano Anterior: ████████ │ 450mm
│  Ano Atual:    ██████   │ 380mm
│                         │
│  Diferença: -15.5% ⬇️   │
│                         │
└─────────────────────────┘
```

**Onde exibir:**
- Aba "Clima" do modal
- Tooltip ao hover no popup (versão compacta)

---

### **7. Eventos Extremos (Lista Compacta)**

**Design:**
```
┌─────────────────────────┐
│ ⚠️ Eventos Extremos Detectados │
├─────────────────────────┤
│ ❄️ Pico de Frio: 15/06  │
│    -3°C (Crítico)       │
│                         │
│ 🔥 Onda de Calor: 20/12 │
│    38°C (Alto Risco)    │
└─────────────────────────┘
```

**Onde exibir:**
- Aba "Clima" do modal
- Badge no popup se houver eventos recentes

---

### **8. Regiões Comprometidas (Mapa de Calor)**

**Design:**
- Camada de calor no mapa (heatmap)
- Cores: Verde (seguro) → Amarelo (atenção) → Vermelho (comprometido)
- Lista de regiões na sidebar (seção separada)

---

### **9. Recomendação IA (Card Destaque)**

**Design:**
```
┌─────────────────────────┐
│ 🤖 Recomendação da IA    │
├─────────────────────────┤
│                         │
│  ✅ COMPRAR              │
│                         │
│  Score: 85/100          │
│  ████████████░░░░       │
│                         │
│  Justificativa:         │
│  • ROI projetado: 120%  │
│  • Qualidade: Excelente │
│  • Clima: Favorável     │
│  • Safra: Ideal         │
│                         │
│  [Aceitar] [Rejeitar]   │
└─────────────────────────┘
```

**Onde exibir:**
- Aba "IA" do modal
- Card destacado no popup (versão compacta)

---

## 🎯 IMPLEMENTAÇÃO SUGERIDA

### **Componentes React a Criar:**

1. **`OpportunityPopup.jsx`** - Popup básico no mapa
2. **`OpportunityModal.jsx`** - Modal com abas
3. **`OpportunityTabs.jsx`** - Sistema de abas
4. **`FinancialTab.jsx`** - Aba financeira
5. **`QualityTab.jsx`** - Aba de qualidade
6. **`ClimateTab.jsx`** - Aba de clima
7. **`AITab.jsx`** - Aba de IA
8. **`AnalysisTab.jsx`** - Aba de análise
9. **`RainComparison.jsx`** - Componente de comparação de chuva
10. **`ExtremeEvents.jsx`** - Lista de eventos extremos
11. **`RecommendationCard.jsx`** - Card de recomendação IA

---

## 📱 RESPONSIVIDADE

### **Desktop:**
- Modal: 800px de largura
- Sidebar: 350px de largura
- Mapa: Resto da tela

### **Tablet:**
- Modal: 90% da largura
- Sidebar: Colapsável
- Mapa: Full screen quando sidebar fechada

### **Mobile:**
- Modal: Full screen
- Sidebar: Drawer (slide lateral)
- Mapa: Full screen

---

## ✅ PRINCÍPIOS DE DESIGN

1. **Hierarquia Visual:**
   - Informações mais importantes = maior destaque
   - Informações secundárias = menor destaque ou ocultas

2. **Progressive Disclosure:**
   - Mostrar pouco inicialmente
   - Revelar mais ao clicar/interagir

3. **Consistência:**
   - Mesmo padrão de cores/ícones em todo lugar
   - Mesma estrutura de abas em todos os modais

4. **Performance:**
   - Lazy loading de dados pesados
   - Cache de dados já carregados
   - Debounce em buscas/filtros

---

## 🚀 ORDEM DE IMPLEMENTAÇÃO

### **FASE 1: Estrutura Base (Semana 1)**
1. Criar `OpportunityModal` com sistema de abas
2. Criar componentes de abas básicos
3. Integrar com dados existentes

### **FASE 2: Informações Básicas (Semana 1)**
1. Aba Financeiro (ROI, preços, frete)
2. Aba Qualidade (qualidade, dias restantes)
3. Integrar com Python

### **FASE 3: Informações Climáticas (Semana 2)**
1. Aba Clima (chuva, eventos extremos)
2. Componente de comparação de chuva
3. Lista de eventos extremos

### **FASE 4: IA e Recomendações (Semana 3)**
1. Aba IA (recomendações, score)
2. Card de recomendação
3. Integração com sistema de recomendação

### **FASE 5: Polimento (Semana 4)**
1. Ajustes visuais
2. Animações
3. Responsividade
4. Testes de usabilidade

---

**Status:** ✅ **PLANO COMPLETO**

**Última atualização:** Dezembro 2025
