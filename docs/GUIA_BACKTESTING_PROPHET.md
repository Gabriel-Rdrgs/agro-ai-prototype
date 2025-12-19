# 🔬 Guia de Backtesting do Prophet

Este documento explica como usar o script de backtesting para validar a qualidade das previsões do modelo Prophet.

## 📋 O que é Backtesting?

Backtesting é uma técnica de validação que simula como o modelo teria se comportado no passado:

1. **Escolhe uma data no passado** (ex: 30 dias atrás) como "data de corte"
2. **Treina o modelo** apenas com dados até essa data
3. **Gera previsões** para os próximos N dias (como se estivesse naquela data)
4. **Compara** as previsões com os valores reais que aconteceram
5. **Calcula métricas** de acurácia (MAE, RMSE, MAPE, Coverage)

## 🚀 Como Usar

### Pré-requisitos

- Banco de dados com dados históricos de preços (`CeasaPrice`)
- Python com dependências instaladas (`prophet`, `pandas`, `numpy`, `sqlalchemy`)
- Variáveis de ambiente configuradas (`.env` com `DATABASE_URL`)

### Execução Básica

```bash
cd ai-service
python scripts/backtest_prophet.py
```

Isso executa um backtest padrão:
- **Produto**: Tomate
- **Região**: Todas (Brasil inteiro)
- **Cutoff**: 30 dias atrás
- **Previsão**: 7 dias à frente

### Exemplos de Uso

#### 1. Backtest para Tomate em SP (30 dias atrás, prever 7 dias)

```bash
python scripts/backtest_prophet.py --product Tomate --region SP --cutoff-days 30 --forecast-days 7
```

#### 2. Backtest para Soja em MG (60 dias atrás, prever 14 dias)

```bash
python scripts/backtest_prophet.py --product Soja --region MG --cutoff-days 60 --forecast-days 14
```

#### 3. Backtest para Milho no Brasil (45 dias atrás, prever 30 dias)

```bash
python scripts/backtest_prophet.py --product Milho --cutoff-days 45 --forecast-days 30
```

### Parâmetros

| Parâmetro | Descrição | Padrão | Exemplo |
|-----------|-----------|--------|---------|
| `--product` | Nome do produto | `Tomate` | `--product Soja` |
| `--region` | Código UF (opcional) | `None` (todas) | `--region SP` |
| `--cutoff-days` | Quantos dias atrás fazer o cutoff | `30` | `--cutoff-days 60` |
| `--forecast-days` | Quantos dias à frente prever | `7` | `--forecast-days 14` |

## 📊 Métricas Calculadas

O script calcula as seguintes métricas:

### 1. MAE (Mean Absolute Error)
- **O que é**: Erro absoluto médio
- **Interpretação**: Quanto o modelo erra em média (em R$)
- **Exemplo**: MAE = 0.50 significa que o modelo erra em média R$ 0,50

### 2. RMSE (Root Mean Squared Error)
- **O que é**: Raiz do erro quadrático médio
- **Interpretação**: Penaliza mais erros grandes
- **Exemplo**: RMSE = 0.75 significa que erros grandes têm mais peso

### 3. MAPE (Mean Absolute Percentage Error)
- **O que é**: Erro percentual médio
- **Interpretação**: Quanto o modelo erra em percentual
- **Exemplo**: MAPE = 10% significa que o modelo erra em média 10%

### 4. Coverage (Cobertura do Intervalo de Confiança)
- **O que é**: Percentual de valores reais que caíram dentro do intervalo de confiança
- **Interpretação**: Quão confiável é o intervalo de confiança
- **Exemplo**: Coverage = 80% significa que 80% dos valores reais estavam dentro do intervalo previsto

### 5. Bias (Viés)
- **O que é**: Erro médio (pode ser positivo ou negativo)
- **Interpretação**: 
  - **Positivo**: Modelo tende a superestimar
  - **Negativo**: Modelo tende a subestimar
  - **Próximo de zero**: Modelo é não-viesado

## 📈 Interpretando Resultados

### Exemplo de Saída

```
🔬 INICIANDO BACKTEST
   Produto: Tomate
   Região: SP
   Cutoff: 30 dias atrás
   Previsão: 7 dias à frente
============================================================
📅 Data de corte (treinamento até): 2025-11-19
📅 Período de teste (valores reais): 2025-11-19 até 2025-11-26
📊 Carregando dados históricos para treinamento...
   ✅ 120 registros históricos carregados
📊 Carregando valores reais do período de teste...
   ✅ 7 valores reais encontrados
🤖 Treinando modelo e gerando previsões...
   ✅ 7 previsões geradas (modelo: prophet)
📈 Calculando métricas de acurácia...
============================================================
📊 RESULTADOS DO BACKTEST
============================================================
   Modelo usado: prophet
   Pontos de dados comparados: 7

   Métricas de Erro:
   - MAE (Mean Absolute Error): 0.3245
   - RMSE (Root Mean Squared Error): 0.4123
   - MAPE (Mean Absolute Percentage Error): 7.85%

   Intervalo de Confiança:
   - Coverage: 85.71% (valores reais dentro do intervalo)

   Bias:
   - Erro médio: -0.1234
   - Erro mínimo: -0.4567
   - Erro máximo: 0.2345
============================================================
```

### Interpretação

- **MAE = 0.32**: O modelo erra em média R$ 0,32 por kg
- **RMSE = 0.41**: Erros grandes são penalizados (maior que MAE)
- **MAPE = 7.85%**: O modelo erra em média 7,85% do valor real
- **Coverage = 85.71%**: 6 de 7 valores reais estavam dentro do intervalo de confiança (bom!)
- **Bias = -0.12**: O modelo tende a subestimar ligeiramente (previsões um pouco menores que o real)

## ✅ Critérios de Qualidade

### Boa Qualidade
- **MAPE < 10%**: Erro percentual baixo
- **Coverage > 80%**: Intervalo de confiança confiável
- **Bias próximo de zero**: Modelo não-viesado

### Qualidade Aceitável
- **MAPE entre 10-20%**: Erro percentual moderado
- **Coverage entre 60-80%**: Intervalo de confiança razoável
- **Bias < 5% do preço médio**: Viés pequeno

### Qualidade Ruim
- **MAPE > 20%**: Erro percentual alto
- **Coverage < 60%**: Intervalo de confiança não confiável
- **Bias > 10% do preço médio**: Viés significativo

## 🔧 Troubleshooting

### Erro: "Dados insuficientes para treinamento"

**Causa**: Menos de 30 registros históricos disponíveis.

**Solução**:
- Verifique se há dados no banco para o produto/região
- Tente aumentar `--cutoff-days` para buscar mais histórico
- Verifique se o nome do produto está correto

### Erro: "Nenhum valor real encontrado no período de teste"

**Causa**: Não há dados reais no período de teste.

**Solução**:
- Verifique se há dados no banco para o período de teste
- Tente reduzir `--forecast-days` ou aumentar `--cutoff-days`
- Verifique se `is_projection = false` nos dados

### Erro: "Nenhum overlap entre previsões e valores reais"

**Causa**: As datas das previsões não coincidem com as datas dos valores reais.

**Solução**:
- Verifique se há dados diários no banco (não apenas semanais)
- Tente ajustar as datas de corte e previsão

## 📝 Próximos Passos

Após executar o backtesting:

1. **Analise as métricas**: Compare com critérios de qualidade
2. **Identifique padrões**: O modelo funciona melhor para alguns produtos/regiões?
3. **Ajuste hiperparâmetros**: Se necessário, ajuste configurações do Prophet
4. **Documente resultados**: Mantenha um registro dos resultados para acompanhar melhorias

## 🔗 Referências

- [Prophet Documentation](https://facebook.github.io/prophet/)
- [Time Series Cross-Validation](https://otexts.com/fpp3/tscv.html)
- [Forecast Accuracy Metrics](https://otexts.com/fpp3/accuracy.html)

