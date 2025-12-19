# 🔮 Guia de Validação do Prophet

Este guia explica como validar se o Prophet está funcionando corretamente com seus dados do Supabase.

## 📋 Pré-requisitos

- Banco de dados Supabase configurado e acessível
- Variável `DATABASE_URL` configurada no `.env` do `ai-service`
- Python 3.10+ com dependências instaladas

## 🚀 Como Usar

### 1. Validação Básica (Verificar Dados)

Verifica se há dados suficientes no banco:

```bash
cd ai-service
python scripts/validate_prophet_data.py
```

**O que ele faz:**
- Conta quantos registros históricos existem
- Verifica a cobertura temporal (quantos dias de dados)
- Identifica produtos e regiões disponíveis
- Indica se há dados suficientes (≥30 dias e ≥30 registros)

### 2. Teste com Produto Específico

Testa Prophet com um produto específico:

```bash
python scripts/validate_prophet_data.py --product Tomate
```

### 3. Teste com Produto e Região

Testa Prophet com produto e região específicos:

```bash
python scripts/validate_prophet_data.py --product Tomate --region SP
```

### 4. Relatório Completo

Gera relatório completo de cobertura e testa múltiplas combinações:

```bash
python scripts/validate_prophet_data.py --full-report
```

## 📊 Interpretando os Resultados

### ✅ Dados Suficientes

```
✅ Dados suficientes para Prophet (≥30 dias e ≥30 registros)
```

**Significa:** Você pode usar Prophet normalmente. As previsões devem funcionar.

### ⚠️ Dados Insuficientes

```
⚠️ Dados INSUFICIENTES para Prophet
   Necessário: ≥30 dias e ≥30 registros
   Atual: 15 dias, 20 registros

💡 Recomendação: Execute o script backfill_history.py
```

**O que fazer:**
1. Execute o backfill para gerar dados sintéticos:
   ```bash
   python scripts/backfill_history.py --days 180 --product Tomate
   ```

2. Ou execute o ETL para coletar dados reais:
   ```bash
   python scripts/run_etl.py
   ```

### 🔮 Prophet Funcionando

```
✅ Prophet funcionando corretamente!
   7 dias:  Status=success, Modelo=prophet
   30 dias: Status=success, Modelo=prophet
```

**Significa:** Prophet está gerando previsões corretamente.

### ⚠️ Usando Fallback

```
⚠️ Previsão funcionando, mas usando fallback (não Prophet)
   Isso indica que não há dados suficientes para Prophet
```

**Significa:** O sistema está funcionando, mas usando valores fixos (+2%/+8%) ao invés de Prophet.

## 🔧 Solução de Problemas

### Problema: "Dados insuficientes"

**Solução 1: Gerar dados sintéticos (desenvolvimento/teste)**
```bash
python scripts/backfill_history.py --days 180 --product Tomate
```

**Solução 2: Coletar dados reais (produção)**
```bash
python scripts/run_etl.py
```

### Problema: "Erro ao conectar ao banco"

**Verifique:**
1. Variável `DATABASE_URL` está configurada no `.env`
2. URL do Supabase está correta
3. Conexão com Supabase está funcionando

**Teste conexão:**
```bash
python -c "from utils.database import test_connection; print('✅ Conectado' if test_connection() else '❌ Erro')"
```

### Problema: "Prophet não está sendo usado"

**Possíveis causas:**
1. Dados insuficientes para produto/região específica
2. Dados muito recentes (Prophet precisa de histórico)
3. Erro no treinamento do modelo

**Solução:**
1. Execute o backfill para gerar mais dados históricos
2. Verifique os logs do Prophet para erros específicos
3. Teste com produto/região que tem mais dados

## 📈 Próximos Passos

Após validar:

1. **Se dados suficientes:**
   - ✅ Prophet está pronto para uso
   - Teste no endpoint `/api/v1/predict/batch`
   - Monitore logs para verificar uso do Prophet vs fallback

2. **Se dados insuficientes:**
   - Execute `backfill_history.py` ou `run_etl.py`
   - Re-execute a validação
   - Verifique se dados foram inseridos corretamente

3. **Para produção:**
   - Configure ETL agendado no Railway
   - Monitore cobertura de dados regularmente
   - Configure alertas se dados ficarem insuficientes

## 🔗 Links Úteis

- Script de backfill: `ai-service/scripts/backfill_history.py`
- Script de ETL: `ai-service/scripts/run_etl.py`
- Serviço Prophet: `ai-service/services/price_forecast.py`
- Endpoint batch: `ai-service/routers/predictions.py` (linha 244)


