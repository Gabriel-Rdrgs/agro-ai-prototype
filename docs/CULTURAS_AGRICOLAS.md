# Especificações de Culturas Agrícolas

**Versão:** 1.0  
**Última Atualização:** Dezembro 2025

---

## 1. Visão Geral

O sistema suporta três culturas principais com especificações baseadas em documentos científicos (Embrapa, UFG, ZARC):

- **Tomate** (implementação completa)
- **Soja** (implementação completa)
- **Milho** (implementação completa)

Cada cultura possui:
- Fórmulas matemáticas específicas (armazenagem, perdas)
- Parâmetros climáticos (temperatura, precipitação, radiação)
- Calendário de plantio regional
- Especificações de produção (produtividade, custos, transporte)

---

## 2. Armazenagem

### 2.1. Comparação entre Culturas

| Parâmetro | Tomate | Soja | Milho |
|-----------|--------|------|-------|
| **Custo Fixo Mensal** | R$ 1.700 | R$ 1.200 | R$ 1.100 |
| **Energia (R$/kg/dia)** | R$ 0,025 | R$ 0,015 | R$ 0,012 |
| **Embalagem (R$/kg)** | R$ 0,10 | R$ 0,03 | R$ 0,025 |
| **Perda Mensal** | 6% | 2% | 2.5% |
| **Perda Diária** | 0.2% | 0.067% | 0.083% |
| **Taxa Comissão** | 17% | 8% | 10% |

**Justificativa:**
- **Tomate**: Perecível, requer câmara fria, maior perda
- **Soja**: Grão seco, mais estável, menor perda
- **Milho**: Grão seco, similar a soja, mas pode ter maior perda por pragas

### 2.2. Fórmulas de Armazenagem

#### Tomate

**Arquivo:** `ai-service/config/mathematical_formulas.py`

```python
def calculate_storage_cost(quantity_kg, time_months, price_per_kg):
    """
    Calcula custo total de armazenagem de tomate.
    
    Fórmula baseada em "Função Custo de Armazenagem de Tomate.pdf"
    """
    fixed_cost = 1700.0 * time_months
    variable_cost = (0.025 * quantity_kg * time_months * 30) + (0.10 * quantity_kg)
    loss_cost = (0.06 * quantity_kg * time_months) * price_per_kg
    total_cost = fixed_cost + variable_cost + loss_cost
    return {
        'total_cost': total_cost,
        'fixed_cost': fixed_cost,
        'variable_cost': variable_cost,
        'loss_cost': loss_cost
    }
```

#### Soja

**Arquivo:** `ai-service/config/soybean_formulas.py`

```python
def calculate_soybean_storage_cost(quantity_kg, time_months, price_per_kg):
    """
    Calcula custo total de armazenagem de soja.
    
    Fórmula baseada em "Função Custo Armazenagem Soja.pdf"
    """
    fixed_cost = 1200.0 * time_months
    variable_cost = (0.015 * quantity_kg * time_months * 30) + (0.03 * quantity_kg)
    loss_cost = (0.02 * quantity_kg * time_months) * price_per_kg
    total_cost = fixed_cost + variable_cost + loss_cost
    return {
        'total_cost': total_cost,
        'fixed_cost': fixed_cost,
        'variable_cost': variable_cost,
        'loss_cost': loss_cost
    }
```

#### Milho

**Arquivo:** `ai-service/config/corn_formulas.py`

```python
def calculate_corn_storage_cost(quantity_kg, time_months, price_per_kg):
    """
    Calcula custo total de armazenagem de milho.
    
    Fórmula baseada em "Função Custo de Armazenagem de Milho.pdf"
    """
    fixed_cost = 1100.0 * time_months
    variable_cost = (0.012 * quantity_kg * time_months * 30) + (0.025 * quantity_kg)
    loss_cost = (0.025 * quantity_kg * time_months) * price_per_kg
    total_cost = fixed_cost + variable_cost + loss_cost
    return {
        'total_cost': total_cost,
        'fixed_cost': fixed_cost,
        'variable_cost': variable_cost,
        'loss_cost': loss_cost
    }
```

---

## 3. Parâmetros Climáticos

### 3.1. Temperatura

#### Temperaturas Ideais por Fase

| Fase | Tomate (Ótimo) | Soja (Ótimo) | Milho (Ótimo) |
|------|----------------|--------------|---------------|
| **Germinação** | 15-25°C | 20-25°C | 25-30°C |
| **Crescimento Vegetativo** | 21-24°C | 21-27°C | 24-30°C |
| **Floração** | 20-24°C | 24-28°C | 24-30°C |
| **Enchimento de Grãos** | - | 24-28°C | 21-25°C |
| **Maturação** | 20-24°C | 20-25°C | 15-20°C |
| **Crítico (Mín)** | 10°C | 15°C | 10°C |
| **Crítico (Máx)** | 34°C | 40°C | 35°C |

**Justificativa:**
- **Tomate**: Sensível a temperaturas extremas, faixa ótima estreita
- **Soja**: Tolerante a temperaturas mais altas (até 40°C), faixa ótima ampla
- **Milho**: Requer temperaturas mais altas que soja, especialmente na germinação

#### Perda de Produtividade por Temperatura (Milho)

**Arquivo:** `ai-service/config/corn_formulas.py`

```python
def evaluate_corn_temperature_risk(temperature: float, phase: str) -> dict:
    """
    Avalia risco de temperatura para milho.
    
    Perda de produtividade: 3-5% para cada 1°C acima de 30°C durante floração/enchimento.
    """
    if phase in ['flowering', 'grain_filling']:
        if temperature > 30.0:
            excess_temp = temperature - 30.0
            productivity_loss = excess_temp * 4.0  # 4% por °C (média entre 3-5%)
            return {
                'risk_level': 'high',
                'productivity_loss': productivity_loss,
                'message': f'Temperatura acima do ideal. Perda estimada: {productivity_loss:.1f}%'
            }
    # ... outras fases
```

### 3.2. Precipitação

| Parâmetro | Tomate | Soja | Milho |
|-----------|--------|------|-------|
| **Ideal Mín** | 400 mm/ciclo | 600 mm/ciclo | 500 mm/ciclo |
| **Ideal Máx** | 600 mm/ciclo | 1000 mm/ciclo | 800 mm/ciclo |
| **Crítico Déficit** | - | 500 mm/ciclo | 400 mm/ciclo |
| **Perda em Déficit (Floração)** | - | 20-30% | 20-30% |

**Justificativa:**
- **Tomate**: Requer menos água (400-600 mm)
- **Soja**: Requer mais água (600-1000 mm)
- **Milho**: Intermediário (500-800 mm), mas déficit durante floração causa perdas severas

### 3.3. Radiação Solar

| Parâmetro | Tomate | Soja | Milho |
|-----------|--------|------|-------|
| **Mínimo** | 8.4 MJ/m²/dia | 8.0 MJ/m²/dia | 7.5 MJ/m²/dia |
| **Ótimo** | 8.4 MJ/m²/dia | 8.0 MJ/m²/dia | 8.0 MJ/m²/dia |

**Justificativa:**
- **Tomate**: Requer radiação alta para fotossíntese e qualidade
- **Soja**: Requisito ligeiramente menor
- **Milho**: Requisito menor ainda (7.5 mínimo), mas ótimo similar a soja

### 3.4. Variação Térmica Diária (Milho)

**Arquivo:** `ai-service/config/corn_formulas.py`

```python
def calculate_corn_thermal_amplitude_impact(temp_max: float, temp_min: float) -> dict:
    """
    Avalia impacto da variação térmica diária para milho.
    
    Ideal: 6-9°C entre dia e noite (dia quente, noite fresca).
    """
    variation = temp_max - temp_min
    if 6.0 <= variation <= 9.0:
        return {
            'adequate': True,
            'score': 1.0,
            'variation': variation,
            'message': 'Variação térmica ideal para milho'
        }
    # ... outros casos
```

**Justificativa:** Milho se beneficia de variação térmica diária de 6-9°C, otimizando crescimento e qualidade dos grãos.

---

## 4. Calendário de Plantio

### 4.1. Tomate

| Região | Janela de Plantio | Prioridade |
|--------|-------------------|------------|
| **Centro-Oeste (MT, MS, GO)** | Março a Outubro | - |
| **Sul (PR, RS, SC)** | Agosto a Janeiro | - |
| **Sudeste (SP, MG, ES, RJ)** | Fev-Jul (baixa) / Ago-Jan (alta) | - |
| **Nordeste (CE, PE, BA, PI)** | Março a Junho | - |
| **Norte (PA, AM, RO)** | Março a Outubro | - |

### 4.2. Soja

| Região | Janela de Plantio | Prioridade |
|--------|-------------------|------------|
| **Centro-Oeste (MT, MS, GO)** | Setembro a Dezembro | Set-Out ideal |
| **Sul (PR, RS, SC)** | Setembro a Outubro | Outubro ideal |
| **Sudeste (SP, MG, ES, RJ)** | Setembro a Dezembro | Out-Nov ideal |
| **Nordeste (CE, PE, BA, PI)** | Outubro a Dezembro | Out-Nov ideal |
| **Norte (PA, AM, RO)** | Janeiro a Maio | Jan-Fev ideal |

### 4.3. Milho

| Região | Janela de Plantio | Safrinha |
|--------|-------------------|----------|
| **Centro-Oeste (MT, MS, GO)** | Set-Dez (safra) | Jan-Mar |
| **Sul (PR, RS, SC)** | Ago-Nov (safra) | Limitada por geadas |
| **Sudeste (SP, MG, ES, RJ)** | Set-Dez (safra) | Jan-Fev limitada |
| **Nordeste (CE, PE, BA, PI)** | Jan-Abr (após chuvas) | - |
| **Norte/Matopiba (PA, AM, RO, MA, TO)** | Jan-Mai (época seca) | Viável em Matopiba |

**Justificativa:** Milho tem calendário mais variado, com safra principal (Set-Dez na maioria das regiões) e safrinha viável em algumas áreas (Centro-Oeste, Matopiba).

---

## 5. Especificações de Produção

### 5.1. Produtividade

| Cultura | Produtividade Base | Unidade |
|---------|---------------------|---------|
| **Tomate** | 60.000 kg/ha | kg/ha |
| **Soja** | 3.600 kg/ha (60 sacas/ha) | kg/ha |
| **Milho** | 9.000 kg/ha (150 sacas/ha) | kg/ha |

### 5.2. Custos de Produção

| Cultura | Custo por Hectare |
|---------|-------------------|
| **Tomate** | R$ 35.000/ha |
| **Soja** | R$ 4.500/ha |
| **Milho** | R$ 5.000/ha |

### 5.3. Transporte

| Cultura | Peso Unitário | Capacidade Caminhão |
|---------|---------------|---------------------|
| **Tomate** | 20 kg (caixa) | 1.000 caixas |
| **Soja** | 60 kg (saca) | 550 sacas |
| **Milho** | 60 kg (saca) | 550 sacas |

---

## 6. Implementação no Código

### 6.1. Estrutura de Arquivos

```
ai-service/config/
├── crops.py                    # Especificações consolidadas
├── mathematical_formulas.py   # Fórmulas de tomate
├── soybean_formulas.py         # Fórmulas de soja
├── soybean_params.py           # Parâmetros de soja
├── corn_formulas.py            # Fórmulas de milho
├── corn_params.py              # Parâmetros de milho
└── calendar.py                 # Calendário de plantio (todas as culturas)
```

### 6.2. Uso no Código

#### Obter Especificações de uma Cultura

```python
from config.crops import get_crop_specs

specs = get_crop_specs('Tomate')
# Retorna: {
#   'productivity_kg_per_ha': 60000.0,
#   'cost_per_ha': 35000.0,
#   'unit_weight_kg': 20.0,
#   'transport_capacity': 1000.0,
#   ...
# }
```

#### Calcular Armazenagem

```python
from config.soybean_formulas import calculate_soybean_storage_cost

costs = calculate_soybean_storage_cost(
    quantity_kg=10000.0,
    time_months=3.0,
    price_per_kg=4.00
)
```

#### Verificar Calendário de Plantio

```python
from config.calendar import get_planting_window, is_ideal_month

window = get_planting_window('Soja', 'MT')
# Retorna: {'ideal': [9, 10, 11, 12], 'risk': [...], 'notes': '...'}

is_ideal = is_ideal_month('Soja', 'MT', 10)  # Outubro
# Retorna: True
```

---

## 7. Extensibilidade

### 7.1. Adicionar Nova Cultura

**Passos:**

1. **Criar `{crop}_formulas.py`** com fórmulas específicas:
   - `calculate_{crop}_storage_cost()`
   - `evaluate_{crop}_temperature_risk()`
   - `evaluate_{crop}_rainfall()`
   - `evaluate_{crop}_solar_radiation()`

2. **Criar `{crop}_params.py`** importando de `{crop}_formulas.py`:
   - `{CROP}_SPECS` com todas as especificações

3. **Atualizar `crops.py`**:
   ```python
   from .{crop}_params import {CROP}_SPECS
   CROPS_SPECS['{Cultura}'] = {CROP}_SPECS
   ```

4. **Atualizar `calendar.py`** com calendário regional

5. **Atualizar `storage_advisor.py`** para detectar nova cultura

**Exemplo para Trigo:**
```python
# 1. Criar wheat_formulas.py
# 2. Criar wheat_params.py
# 3. Em crops.py:
from .wheat_params import WHEAT_SPECS
CROPS_SPECS['Trigo'] = WHEAT_SPECS
```

---

## 8. Referências Científicas

### 8.1. Documentos Base

**Tomate:**
- Clima e Produção de Tomates no Brasil.pdf
- Função Custo de Armazenagem de Tomate.pdf
- Épocas de Plantio e Métricas de Decisão para Cultivo de Tomate no Brasil.pdf

**Soja:**
- Clima e Produção de Soja.pdf
- Função Custo Armazenagem Soja.pdf
- Épocas de Plantio e Métricas de Decisão para Cultivo de Soja no Brasil.pdf

**Milho:**
- Clima e Produção de Milho no Brasil.pdf
- Função Custo de Armazenagem de Milho.pdf
- Épocas de Plantio e Métricas de Decisão para Cultivo de Milho no Brasil.pdf

### 8.2. Fontes

- **Embrapa**: Dados de produção e clima
- **UFG**: Análise climática
- **ZARC**: Zoneamento Agrícola de Risco Climático (MAPA)

---

## 9. Validação

### 9.1. Testes Recomendados

1. **Armazenagem:**
   - Comparar custos: soja deve ser menor que tomate
   - Verificar perda: 2% ao mês para soja (vs 6% tomate)
   - Verificar taxa de comissão: 8% para soja (vs 17% tomate)

2. **Cálculos de ROI:**
   - Verificar produtividade: 60 sacas/ha para soja
   - Verificar custo: R$ 4.500/ha para soja
   - Verificar peso unitário: 60 kg (saca padrão)

3. **Avaliação Climática:**
   - Temperatura 24-28°C deve ser ideal para floração de soja
   - Precipitação 750 mm deve ser adequada
   - Radiação 8.0 MJ/m²/dia deve ser adequada

---

## 10. Referências

- [Implementação Soja Completa](./IMPLEMENTACAO_SOJA_COMPLETA.md) - Detalhes da implementação de soja
- [Implementação Milho Completa](./IMPLEMENTACAO_MILHO_COMPLETA.md) - Detalhes da implementação de milho
- [Análise Completa vs PDFs](./ANALISE_COMPLETA_VS_PDFS.md) - Comparação com documentos científicos

---

**Última atualização:** Dezembro 2025

