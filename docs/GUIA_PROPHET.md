# 📈 Guia Completo: Prophet - Previsões e Validação

Este guia consolida toda a documentação sobre o Prophet (modelo de previsão de preços) e suas validações.

---

## 📋 Índice

1. [Backtesting](#backtesting)
2. [Validação](#validação)
3. [Uso](#uso)

---

## 🔬 Backtesting

### O que é Backtesting?

Backtesting é o processo de testar o modelo Prophet usando dados históricos para avaliar sua precisão.

### Executar Backtesting

```bash
cd ai-service
python scripts/backtest_prophet.py
```

### Opções

```bash
# Backtest com parâmetros customizados
python scripts/backtest_prophet.py \
  --product Tomate \
  --region SP \
  --cutoff-days 30 \
  --forecast-days 7
```

### Métricas Retornadas

- **MAE** (Mean Absolute Error): Erro médio absoluto
- **RMSE** (Root Mean Squared Error): Raiz do erro quadrático médio
- **MAPE** (Mean Absolute Percentage Error): Erro percentual médio
- **Coverage**: Percentual de valores reais dentro do intervalo de confiança
- **Bias**: Tendência do modelo (superestima ou subestima)

### Interpretação

- **MAE/RMSE baixos:** Modelo mais preciso
- **MAPE < 20%:** Considerado bom para séries temporais
- **Coverage > 80%:** Intervalos de confiança confiáveis
- **Bias próximo de 0:** Modelo não tem tendência sistemática

---

## ✅ Validação

### Validação de Dados

O sistema valida automaticamente:
- Qualidade dos dados históricos
- Suficiência de dados para treinamento
- Consistência temporal

### Validação de Previsões

- Verificação de valores negativos
- Verificação de outliers
- Validação de intervalos de confiança

---

## 🚀 Uso

### Gerar Previsões

```python
from services.price_forecast import PriceForecastService

service = PriceForecastService()
forecast = service.forecast(
    product="Tomate",
    region="SP",
    days=7
)
```

### Endpoint API

```bash
POST /api/v1/predict/price
{
  "product": "Tomate",
  "region": "SP",
  "days": 7
}
```

---

## 🔗 Referências

- [Script de Backtesting](../ai-service/scripts/backtest_prophet.py)
- [Serviço de Previsão](../ai-service/services/price_forecast.py)

