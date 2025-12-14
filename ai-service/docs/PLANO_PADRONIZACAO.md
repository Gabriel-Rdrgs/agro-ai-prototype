# PLANO DE PADRONIZAÇÃO - FÓRMULAS MATEMÁTICAS

## Objetivo
Garantir que **TODA A APLICAÇÃO** (mapa, clima, simulador, backend, frontend) use as **MESMAS FÓRMULAS** dos 3 documentos base.

## Status Atual

### ✅ Arquivos Criados
1. `config/mathematical_formulas.py` - Fonte da Verdade centralizada
2. `docs/FORMULAS_EXTRAIDAS.md` - Extração dos PDFs

### 📋 Arquivos que Precisam ser Atualizados

#### Backend Python (ai-service)
1. **`services/storage_advisor.py`**
   - ❌ Usa fórmula de decay biológico própria (sigmoide)
   - ✅ Deve usar: `calculate_storage_cost()` de `mathematical_formulas.py`
   - ❌ Perdas: 0.2%/dia (hardcoded)
   - ✅ Deve usar: 6% ao mês (0.2%/dia ≈ 6%/mês, mas precisa validar)

2. **`services/climate/risk_analyzer.py`**
   - ✅ Já usa 8.4 MJ (correto)
   - ⚠️ Usa thresholds próprios
   - ✅ Deve usar: `evaluate_temperature_risk()`, `evaluate_solar_radiation()`, `evaluate_rainfall()`

3. **`config/agronomic_params.py`**
   - ⚠️ Tem alguns parâmetros, mas não todos
   - ✅ Deve importar de `mathematical_formulas.py`

4. **`config/calendar.py`**
   - ✅ Já usa dados do agronomic_params
   - ✅ Deve usar: `PLANTING_CALENDAR` de `mathematical_formulas.py`

#### Backend Node.js
1. **`backend/server.js`**
   - ⚠️ Pode ter cálculos hardcoded
   - ✅ Deve chamar APIs Python que usam fórmulas padronizadas

#### Frontend
1. **Componentes de cálculo**
   - ⚠️ Verificar se há cálculos client-side
   - ✅ Deve usar APIs do backend

## Fórmulas Identificadas nos PDFs

### 1. Função Custo de Armazenagem
```
C(x,t) = Cf + Cv(x,t) + Cp(x,t)

Onde:
- Cf = R$ 1700/mês (R$ 1500 aluguel + R$ 200 seguro)
- Cv = 0.10x + 0.025xt
  * 0.10x = embalagens (R$ 0,10/kg)
  * 0.025xt = energia (R$ 0,025/kg/dia)
- Cp = 0.06xt·P
  * 0.06 = 6% perda mensal
  * P = preço médio por kg
```

### 2. Temperaturas
- Germinação: 15-25°C (ótima), 11°C min, 34°C max
- Vegetativo: 18-27°C (ideal), 10-34°C (suporta)
- Frutificação: 18°C min, 20-24°C ideal, 30°C max
- Maturação: 10°C min, 20-24°C ideal, 30°C max

### 3. Radiação Solar
- Mínimo: 8.4 MJ/m²/dia

### 4. Precipitação
- Ideal: 400-600 mm por ciclo
- Excesso: >600 mm aumenta doenças

### 5. Calendário de Plantio
- Sudeste Alta Altitude: Agosto a Janeiro
- Sudeste Baixa Altitude: Fevereiro a Julho
- Oeste Paulista: Fevereiro a Junho
- Sul: Agosto a Janeiro

## Próximos Passos

1. ✅ Criar `mathematical_formulas.py` (FEITO)
2. ⏳ Atualizar `storage_advisor.py` para usar `calculate_storage_cost()`
3. ⏳ Atualizar `risk_analyzer.py` para usar funções padronizadas
4. ⏳ Atualizar `agronomic_params.py` para importar de `mathematical_formulas.py`
5. ⏳ Validar que frontend não tem cálculos hardcoded
6. ⏳ Testar que mapa, clima e simulador retornam mesmos valores













