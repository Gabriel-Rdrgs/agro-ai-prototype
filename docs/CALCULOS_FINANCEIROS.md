# Cálculos Financeiros e ROI

**Versão:** 1.0  
**Última Atualização:** Dezembro 2025

---

## 1. Visão Geral

O sistema calcula ROI (Retorno sobre Investimento) para operações agrícolas considerando múltiplos fatores:

- Custos de produção (por hectare)
- Custos de logística (frete, combustível)
- Perdas na viagem (quebra técnica)
- Custos de comercialização (taxas, comissões)
- Preços de compra e venda (mercado)

---

## 2. Fórmula de Cálculo de ROI

### 2.1. Fórmula Base

```
ROI = ((Receita Bruta - Custos Totais) / Custos Totais) × 100

Onde:
- Receita Bruta = Volume Efetivo Vendido × Preço de Venda
- Custos Totais = Custo de Produção + Frete + Comercialização
```

### 2.2. Componentes Detalhados

#### Receita Bruta

```
Receita Bruta = Volume Efetivo Vendido × Preço de Venda

Volume Efetivo Vendido = Volume Produzido × (1 - Perda Total)
```

#### Custos Totais

```
Custos Totais = 
  + Custo de Produção
  + Frete
  + Comercialização
  + Perdas (valor das perdas)
```

### 2.3. Cálculo de Custo de Produção

```
Custo de Produção = Área (ha) × Custo por Hectare

Custo por Hectare (por cultura):
- Tomate: R$ 35.000/ha
- Soja: R$ 4.500/ha
- Milho: R$ 5.000/ha
```

### 2.4. Cálculo de Frete

```
Frete = Distância (km) × Custo por km × Número de Viagens × Fator de Retorno

Onde:
- Custo por km: R$ 7,50/km
- Fator de Retorno: 1,35 (considera retorno vazio - deadhead)
- Número de Viagens: ceil(Volume Total / Capacidade do Caminhão)
```

**Distância:**
- **Com Google Maps**: Distância real de rota (se `GOOGLE_MAPS_API_KEY` configurada)
- **Sem Google Maps**: Haversine × 1,35 (fator de sinuosidade)

### 2.5. Cálculo de Perdas

```
Perda Total = Perda Base + Perda por Distância

Onde:
- Perda Base: 5% (quebra técnica)
- Perda por Distância: 0,02% por 50km
- Teto Máximo: 15% de perda total
```

**Valor das Perdas:**
```
Valor das Perdas = Volume Produzido × Perda Total × Preço de Compra
```

### 2.6. Cálculo de Comercialização

```
Comercialização = Receita Bruta × Taxa de Comissão

Taxa de Comissão (por cultura):
- Tomate: 17%
- Soja: 8%
- Milho: 10%
```

---

## 3. Consistência de ROI entre Componentes

### 3.1. Problema Identificado

Valores de ROI eram diferentes em três locais:
- **Dashboard (Melhores Oportunidades)**: ROIs negativos
- **Mapa**: ROIs positivos
- **Simulador**: ROI correto

### 3.2. Causa Raiz

**Dashboard:**
- Testava TODAS as combinações origem/destino possíveis
- Usava coordenadas do estado/hub em vez das coordenadas reais da cidade
- Resultado: Distâncias erradas (muito maiores) → Frete alto → ROI negativo

**Mapa:**
- Mostrava ROI já calculado e salvo no banco
- Foi calculado por `find_best_route()` que encontra o MELHOR destino
- Sempre positivo ou N/A (não salva ROIs negativos)

**Simulador:**
- Calculava ROI em tempo real para origem/destino específicos escolhidos pelo usuário
- Usava área especificada pelo usuário
- ROI era proporcional à área

### 3.3. Correções Implementadas

#### 1. Uso de `find_best_route()` em vez de testar todas as combinações

**Arquivo:** `ai-service/routers/predictions.py`

**Mudança:**
```python
# ANTES: Testava todas as combinações origem/destino
combinations = [(origin, dest) for origin in origins for dest in destinos]
for origin, dest_uf in combinations:
    result = arbitrage_calculator.calculate(calc_request)

# DEPOIS: Usa find_best_route() para cada origem (mesma lógica do banco)
for origin in origins:
    best_route = arbitrage_calculator.find_best_route(opp_dict)
```

**Resultado:** Dashboard agora mostra o mesmo ROI que está no banco.

#### 2. Uso de Coordenadas Reais

**Arquivo:** `ai-service/services/arbitrage_calculator.py`

**Mudança:**
```python
# ANTES: Sempre usava coordenadas do estado/hub
orig_info = MAJOR_HUBS.get(origin_uf)
orig_lat, orig_lng = orig_info['lat'], orig_info['lng']

# DEPOIS: Usa coordenadas específicas se fornecidas
if data.origin_lat is not None and data.origin_lng is not None:
    orig_lat, orig_lng = float(data.origin_lat), float(data.origin_lng)
else:
    # Fallback para estado/hub
    orig_info = MAJOR_HUBS.get(origin_uf)
    ...
```

#### 3. Informações sobre Área e Cálculo

**Arquivo:** `ai-service/models/schemas.py`

**Mudança:**
```python
class BestOpportunityItem(BaseModel):
    # ... campos existentes ...
    area_ha: float = 10.0  # Área usada no cálculo
    calculation_note: Optional[str] = "Cálculo baseado em 10 hectares (área padrão)"
```

### 3.4. Resultado Final

Agora todos os locais mostram valores consistentes:

| Local | ROI | Solução |
|-------|-----|---------|
| **Dashboard** | 28.9% | Usa `find_best_route()` (mesma lógica do banco) |
| **Mapa** | 28.9% | Mostra ROI do melhor destino (mesma lógica) |
| **Tabela "Monitoramento"** | 28.9% | Mostra dados do banco (mesma lógica) |
| **Simulador** | 28.8% | Calcula com área do usuário (já estava correto) |

**Consistência garantida:**
- Dashboard, Mapa e Tabela agora mostram valores idênticos (mesma origem, mesmo destino, mesmo ROI)
- Simulador pode mostrar ROI diferente se área for diferente de 10 ha (mas % similar)
- Lucro será sempre proporcional à área

---

## 4. Transparência dos Valores

### 4.1. Origem dos Preços

#### Preço de Compra (`buy_price`)

- **Fonte:** Banco de dados (`Opportunity.buyPrice`)
- **Origem:** Último registro disponível para o produto/estado de origem
- **Significado:** Preço que o produtor recebe na origem (já considerando margem do produtor)

#### Preço de Venda (`sell_price`)

- **Fonte:** Banco de dados (`Opportunity.sellPrice`)
- **Origem:** Último registro disponível para o produto/estado de destino
- **Significado:** Preço de venda no mercado de destino (CEASA/Hub)

### 4.2. Datas de Referência

Cada preço exibe:
- **Data do preço de compra:** Data do último registro na origem
- **Data do preço de venda:** Data do último registro no destino

**Exemplo:**
```
Compra: R$ 1,80/kg
📅 22/12/2025

Venda: R$ 4,00/kg
📅 20/12/2025
```

### 4.3. Interpretação dos Valores

**Preço de Compra:** É o preço atual na origem. Você pode comprar agora a esse preço (ou próximo, dependendo da volatilidade).

**Preço de Venda:** É o preço atual no destino. Você pode vender agora a esse preço (ou próximo, dependendo da volatilidade).

**ROI:** Representa a rentabilidade esperada se você:
1. Comprar na origem hoje (ou próximo ao preço de referência)
2. Transportar até o destino
3. Vender no destino hoje (ou próximo ao preço de referência)

**Importante:**
- Os preços são snapshots do banco de dados
- Podem ter sido atualizados há horas ou dias
- O ROI é uma estimativa baseada nesses valores
- Preços reais podem variar no momento da transação

---

## 5. Área Padrão

### 5.1. Definição

- **Dashboard:** 10 hectares (padrão)
- **Mapa:** 10 hectares (padrão, usado no cálculo do ROI salvo)
- **Simulador:** Área escolhida pelo usuário

**Por que 10 ha?**
- Área comercial padrão para justificar frete de carga fechada
- Permite comparação justa entre diferentes origens
- ROI % é independente da área (mas lucro é proporcional)

### 5.2. Proporcionalidade

**ROI %:** Independente da área
- 10 ha: ROI 28.9%
- 100 ha: ROI 28.9% (mesmo percentual)

**Lucro:** Proporcional à área
- 10 ha: Lucro R$ X
- 100 ha: Lucro R$ 10X (10 vezes maior)

---

## 6. Coordenadas

### 6.1. Prioridade

1. Coordenadas específicas da cidade (se fornecidas)
2. Coordenadas do hub do estado (se disponível)
3. Coordenadas do estado (fallback)

### 6.2. Fonte das Coordenadas

- **Banco de dados:** Campo `lat` e `lng` da tabela `Opportunity`
- **Hubs:** Definidos em `MAJOR_HUBS` (CEASA/CEAGESP)
- **Estados:** Definidos em `STATE_COORDS` (centro geográfico do estado)

### 6.3. Impacto na Precisão

**Coordenadas do Estado:**
- Distância calculada: ~2209 km (exemplo: Camocim de São Félix, PE → MG)
- Frete alto → ROI negativo

**Coordenadas Reais da Cidade:**
- Distância calculada: ~800-1000 km (mesmo exemplo)
- Frete correto → ROI positivo

---

## 7. Atualização de Preços

### 7.1. Fontes

1. **ETL Automático:**
   - Scraping de sites de mercado
   - Atualização via API de preços
   - Frequência: Configurável (geralmente diária)

2. **Atualização Manual:**
   - Via endpoint `/api/etl/start` (admin)
   - Importação de planilhas
   - Correção manual no banco

3. **Ajuste por Clima:**
   - Robô de precificação dinâmica
   - Baseado em condições climáticas
   - Ajusta preços conforme risco

### 7.2. Histórico de Preços

Todos os preços são salvos em `PriceHistory`:
- Permite ver evolução dos preços
- Usado para previsões (Prophet)
- Disponível no Dashboard (gráfico de tendências)

---

## 8. Limitações e Avisos

### 8.1. Preços Podem Estar Desatualizados

- Se o último registro foi há 3 dias, o preço pode ter mudado
- Sempre verifique a data de referência
- Considere volatilidade do mercado

### 8.2. ROI é uma Estimativa

- Baseado em custos médios
- Não considera variações sazonais extremas
- Não garante o resultado exato

### 8.3. Custos Reais Podem Variar

- Frete depende de disponibilidade de caminhões
- Preços de combustível mudam diariamente
- Perdas na viagem podem ser maiores/menores

### 8.4. Mercado é Dinâmico

- Preços mudam rapidamente
- Oportunidades podem desaparecer
- Sempre confirme valores antes de fechar negócio

---

## 9. Validação de Cálculos

### 9.1. Verificação de Coordenadas

```python
# Deve usar coordenadas reais da cidade
origin_lat, origin_lng = -8.36, -36.62  # Camocim de São Félix, PE
# Não deve usar coordenadas do hub: -8.0772, -34.9392
```

### 9.2. Verificação de Distâncias

- Camocim de São Félix, PE → MG deve ter distância ~800-1000 km (não 2209 km)
- Distâncias devem ser consistentes com Google Maps

### 9.3. Verificação de ROI

- Dashboard deve mostrar apenas ROIs positivos (ou filtrados por min_roi)
- ROI deve ser similar entre Dashboard e Mapa para mesma origem

### 9.4. Verificação de Área

- Dashboard: 10 ha (padrão)
- Simulador: Área escolhida pelo usuário
- ROI % deve ser similar, lucro deve ser proporcional

---

## 10. Referências

- [Análise de Problema ROI Negativo](./ANALISE_PROBLEMA_ROI_NEGATIVO.md) - Análise detalhada do problema
- [Consistência ROI Dashboard vs Mapa](./CONSISTENCIA_ROI_DASHBOARD_MAPA_SIMULADOR.md) - Correções implementadas
- [Transparência Valores ROI](./TRANSPARENCIA_VALORES_ROI.md) - Explicação para usuários
- [Correção ROI Melhores Oportunidades](./CORRECAO_ROI_MELHORES_OPORTUNIDADES.md) - Detalhes técnicos

---

**Última atualização:** Dezembro 2025

