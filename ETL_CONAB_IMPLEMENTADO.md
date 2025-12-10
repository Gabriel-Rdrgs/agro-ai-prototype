# ✅ ETL CONAB IMPLEMENTADO

**Data:** Dezembro 2025  
**Status:** ✅ Completo

---

## 📋 O QUE FOI FEITO

### 1. Método `fetch_conab()` Adicionado

**Arquivo:** `ai-service/services/data_sync/market_scraper.py`

- ✅ Novo método que faz scraping do portal CONAB
- ✅ Suporta múltiplas URLs (fallback se estrutura mudar)
- ✅ Extrai dados de tabelas HTML automaticamente
- ✅ Normaliza preços seguindo padrão existente
- ✅ Identifica produtos: Tomate, Soja, Milho
- ✅ Extrai região/UF quando disponível

**Estratégia de Scraping:**
1. Tenta acessar portal CONAB
2. Extrai tabelas HTML usando `pandas.read_html()`
3. Identifica colunas automaticamente (produto, preço, região, data)
4. Normaliza dados e salva na estrutura `CeasaPrice`

### 2. Método `_save_to_ceasa_price_table()` Adicionado

**Arquivo:** `ai-service/services/data_sync/market_scraper.py`

- ✅ Salva dados coletados na tabela `CeasaPrice`
- ✅ Usa `UPSERT` (INSERT ... ON CONFLICT) para evitar duplicatas
- ✅ Baseado na constraint: `ceasa_region + product_name + price_date`
- ✅ Atualiza registros existentes se houver conflito

### 3. Integração no `run_etl()`

**Arquivo:** `ai-service/services/data_sync/market_scraper.py`

- ✅ `fetch_conab()` agora é chamado automaticamente
- ✅ Dados CONAB são salvos junto com CEASA-PR e Agrolink
- ✅ Retorno inclui contagem de registros salvos
- ✅ Lista de fontes inclui 'CONAB'

---

## 🔧 COMO FUNCIONA

### Fluxo Completo:

```
run_etl()
  ├── fetch_ceasa_pr()      → Dados CEASA-PR
  ├── fetch_agrolink_national() → Dados Agrolink
  ├── fetch_conab()          → Dados CONAB ✅ NOVO
  ├── _save_to_ceasa_price_table() → Salva tudo ✅ NOVO
  └── Retorna estatísticas
```

### Estrutura de Dados CONAB:

```python
{
    "ceasa_region": "SP",           # Código UF ou "BR"
    "ceasa_name": "CONAB SP",        # Nome identificador
    "product_name": "Tomate",        # Tomate, Soja ou Milho
    "unit_type": "kg",               # Sempre normalizado para kg
    "price_min": 3.50,               # Preço mínimo (95% do avg)
    "price_max": 3.85,               # Preço máximo (105% do avg)
    "price_avg": 3.67,               # Preço médio normalizado
    "price_date": "2025-12-10T..."   # Data da coleta
}
```

---

## 🧪 COMO TESTAR

### 1. Teste Manual (Python)

```bash
# No diretório ai-service
cd ai-service
python -c "
from services.data_sync.market_scraper import market_scraper
result = market_scraper.run_etl()
print(f'✅ Coletados: {result[\"records\"]} registros')
print(f'💾 Salvos: {result[\"saved\"]} registros')
print(f'📊 Fontes: {result[\"sources\"]}')
"
```

**Esperado:**
```
✅ Coletados: 50 registros
💾 Salvos: 48 registros
📊 Fontes: ['CEASA-PR', 'Agrolink', 'CONAB']
```

### 2. Teste via API (FastAPI)

```bash
# Via curl
curl -X POST http://localhost:8000/admin/etl/market-prices

# Resposta esperada:
{
  "status": "success",
  "message": "ETL concluído com sucesso",
  "records": 50,
  "sources": ["CEASA-PR", "Agrolink", "CONAB"],
  "timestamp": "2025-12-10T12:00:00.000Z"
}
```

### 3. Verificar no Banco

```sql
-- Verificar dados CONAB salvos
SELECT 
    ceasa_region,
    product_name,
    price_avg,
    price_date,
    sync_timestamp
FROM "CeasaPrice"
WHERE ceasa_name LIKE 'CONAB%'
ORDER BY price_date DESC
LIMIT 20;
```

---

## ⚠️ PONTOS DE ATENÇÃO

### 1. Portal CONAB Pode Mudar

**Problema:** Portal pode mudar estrutura HTML  
**Mitigação:** 
- Múltiplas URLs de fallback
- Parsing flexível de colunas
- Logs detalhados para debug

**Se falhar:**
- Verificar logs: `logger.warning("⚠️ CONAB: Nenhum dado coletado")`
- Acessar portal manualmente: https://portaldeinformacoes.conab.gov.br
- Verificar se estrutura HTML mudou

### 2. Rate Limiting

**Problema:** CONAB pode bloquear muitas requisições  
**Mitigação:**
- `time.sleep(2)` entre tentativas
- User-Agent configurado
- Timeout de 20s

### 3. Dados Históricos

**Nota:** Este ETL coleta dados atuais. Para histórico:
- Portal CONAB oferece download de CSV/Excel
- Pode ser implementado método `fetch_conab_historical()` futuro
- Por enquanto, dados históricos podem ser importados manualmente

---

## 📊 RESULTADO ESPERADO

### Antes:
- ✅ CEASA-PR: ~10-15 registros
- ✅ Agrolink: ~20-30 registros
- ❌ CONAB: 0 registros

### Depois:
- ✅ CEASA-PR: ~10-15 registros
- ✅ Agrolink: ~20-30 registros
- ✅ **CONAB: ~10-20 registros** ← NOVO

**Total:** ~40-65 registros por execução (era ~30-45)

---

## 🚀 PRÓXIMOS PASSOS

### Imediato (Hoje):
1. ✅ Testar ETL CONAB manualmente
2. ✅ Verificar dados salvos no banco
3. ✅ Validar que Prophet pode usar esses dados

### Curto Prazo (Esta Semana):
1. **ETL IBGE** - Próxima tarefa (API REST disponível)
2. **Validação Prophet** - Usar dados CONAB para backtesting
3. **Agendamento** - Configurar ETL automático (cron/Lambda)

### Médio Prazo (Próximas 2 Semanas):
1. **ETL Histórico CONAB** - Download de CSV/Excel para backfill
2. **Monitoramento** - Alertas se CONAB falhar
3. **Métricas** - Dashboard de coleta de dados

---

## 📝 NOTAS TÉCNICAS

### Estrutura do Código:

```python
class MarketScraper:
    def fetch_conab(self) -> List[Dict]:
        # 1. Tenta múltiplas URLs
        # 2. Extrai tabelas HTML
        # 3. Identifica colunas automaticamente
        # 4. Normaliza dados
        # 5. Retorna lista de preços
    
    def _save_to_ceasa_price_table(self, prices: List[Dict]) -> int:
        # 1. Itera sobre preços
        # 2. Usa UPSERT para evitar duplicatas
        # 3. Retorna contagem de salvos
    
    def run_etl(self) -> Dict:
        # 1. Coleta de todas as fontes
        # 2. Salva tudo na tabela
        # 3. Retorna estatísticas
```

### Dependências:

- ✅ `requests` - Já instalado
- ✅ `pandas` - Já instalado
- ✅ `sqlalchemy` - Já instalado
- ✅ Nenhuma nova dependência necessária

---

## ✅ CHECKLIST DE VALIDAÇÃO

- [x] Método `fetch_conab()` implementado
- [x] Método `_save_to_ceasa_price_table()` implementado
- [x] Integração no `run_etl()` completa
- [x] Documentação atualizada
- [ ] Teste manual executado
- [ ] Dados verificados no banco
- [ ] Logs verificados (sem erros)

---

**Status:** ✅ Implementação completa, pronto para testes!

**Próximo passo:** Executar teste manual e verificar dados no banco.

