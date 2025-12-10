# ✅ SOLUÇÃO: Download Automático de Dados CONAB

**Data:** Dezembro 2025  
**Status:** ✅ Implementado

---

## 🎯 PROBLEMA

O portal CONAB não tem API pública e usa JavaScript/AJAX para carregar dados dinamicamente, tornando scraping HTML simples ineficaz.

---

## 💡 SOLUÇÃO IMPLEMENTADA

### Estratégia Híbrida (2 Tentativas)

1. **Tentativa 1: Scraping HTML** (já existente)
   - Tenta extrair dados de tabelas HTML
   - Se falhar, vai para tentativa 2

2. **Tentativa 2: Download CSV/Excel** ✅ **NOVO**
   - Acessa portal de downloads CONAB
   - Procura links para arquivos CSV/Excel
   - Faz download automático
   - Processa e salva dados

---

## 🔧 COMO FUNCIONA

### Método `_fetch_conab_from_downloads()`

**Fluxo:**
```
1. Acessa portal de downloads CONAB
   ↓
2. Procura links CSV/Excel usando regex
   ↓
3. Faz download do primeiro arquivo encontrado
   ↓
4. Processa arquivo (CSV ou Excel)
   ↓
5. Extrai produtos, preços, regiões
   ↓
6. Normaliza e retorna dados
```

### Método `_download_and_process_conab_file()`

**Suporta:**
- ✅ Arquivos CSV (delimitadores: `;` ou `,`)
- ✅ Arquivos Excel (`.xlsx`, `.xls`)
- ✅ Múltiplos encodings (UTF-8, Latin-1)
- ✅ Identificação automática de colunas
- ✅ Extração de data (se disponível)

---

## 📋 IMPLEMENTAÇÃO TÉCNICA

### 1. Busca de Links

```python
# Procura links CSV/Excel no HTML
csv_links = re.findall(r'href=["\']([^"\']*\.(csv|xlsx|xls))["\']', html, re.IGNORECASE)
download_links = re.findall(r'href=["\']([^"\']*(?:download|preco|cotacao)[^"\']*\.(?:csv|xlsx|xls))["\']', html, re.IGNORECASE)
```

### 2. Download e Processamento

```python
# Download
response = requests.get(file_url, headers=headers, timeout=30)

# Processa CSV
df = pd.read_csv(io.StringIO(response.text), delimiter=';', encoding='utf-8')

# Processa Excel
df = pd.read_excel(tmp_path, engine='openpyxl')
```

### 3. Identificação de Colunas

- **Produto:** Procura por "PRODUTO", "ITEM", "MERCADORIA", "CULTURA"
- **Preço:** Procura por "PREÇO", "VALOR", "COTAÇÃO"
- **Região:** Procura por "REGIÃO", "ESTADO", "UF", "LOCAL"
- **Data:** Procura por "DATA", "DATE", "PERÍODO"

### 4. Normalização

- Converte preços para float
- Normaliza unidades para kg
- Extrai código UF quando disponível
- Formata datas corretamente

---

## 🧪 COMO TESTAR

### Teste Manual

```python
from services.data_sync.market_scraper import market_scraper

# Testa apenas download CONAB
result = market_scraper._fetch_conab_from_downloads()
print(f"✅ Dados coletados: {len(result)}")
```

### Teste Completo

```bash
cd ai-service
python3 scripts/test_etl_completo.py
```

**Esperado:**
- Se encontrar arquivos CSV/Excel: dados coletados
- Se não encontrar: continua funcionando (não quebra ETL)

---

## ⚠️ LIMITAÇÕES E CONSIDERAÇÕES

### 1. Links Podem Mudar

**Problema:** URLs de download podem mudar  
**Mitigação:**
- Múltiplas URLs de fallback
- Regex flexível para encontrar links
- Logs detalhados para debug

### 2. Estrutura de Arquivos

**Problema:** Estrutura de CSV/Excel pode variar  
**Mitigação:**
- Identificação automática de colunas
- Múltiplos delimitadores (CSV)
- Múltiplos engines (Excel)
- Fallbacks robustos

### 3. Frequência de Atualização

**Nota:** Arquivos podem não ser atualizados diariamente  
**Solução:**
- ETL tenta baixar arquivo mais recente
- Se arquivo for antigo, ainda é útil para histórico

### 4. Dependências

**Nova dependência:** `openpyxl==3.1.2`
- Adicionada ao `requirements.txt`
- Necessária para ler arquivos `.xlsx`

**Instalação:**
```bash
pip install openpyxl==3.1.2
```

---

## 📊 RESULTADO ESPERADO

### Cenário 1: Arquivos Encontrados

```
✅ CONAB (HTML): 0 preços coletados
✅ CONAB (Download): 15 preços coletados via CSV/Excel
✅ CONAB: Total de 15 preços coletados
```

### Cenário 2: Arquivos Não Encontrados

```
✅ CONAB (HTML): 0 preços coletados
⚠️ CONAB (Download): Erro ao tentar download
ℹ️ CONAB: Nenhum dado coletado
```

**Nota:** ETL continua funcionando normalmente mesmo se CONAB falhar.

---

## 🚀 PRÓXIMOS PASSOS

### Curto Prazo (Hoje):

1. **Instalar dependência:**
   ```bash
   cd ai-service
   pip install openpyxl==3.1.2
   ```

2. **Testar:**
   ```bash
   python3 scripts/test_etl_completo.py
   ```

### Médio Prazo (Esta Semana):

1. **Monitorar resultados:**
   - Verificar se arquivos são encontrados
   - Ajustar regex se necessário
   - Validar qualidade dos dados

2. **Melhorias opcionais:**
   - Cache de arquivos baixados
   - Verificação de data de atualização
   - Suporte a múltiplos arquivos

---

## 📝 CÓDIGO IMPLEMENTADO

### Arquivos Modificados:

1. **`ai-service/services/data_sync/market_scraper.py`**
   - Método `_fetch_conab_from_downloads()` - Novo
   - Método `_download_and_process_conab_file()` - Novo
   - Método `fetch_conab()` - Atualizado para usar fallback

2. **`ai-service/requirements.txt`**
   - Adicionado `openpyxl==3.1.2`

---

## ✅ VANTAGENS DA SOLUÇÃO

1. **Não bloqueia ETL:**
   - Se falhar, ETL continua normalmente
   - Outras fontes (CEASA-PR, Agrolink) continuam funcionando

2. **Dados mais confiáveis:**
   - Arquivos oficiais da CONAB
   - Estrutura padronizada
   - Dados históricos disponíveis

3. **Automático:**
   - Não requer intervenção manual
   - Tenta múltiplas estratégias
   - Logs detalhados para debug

4. **Flexível:**
   - Suporta CSV e Excel
   - Múltiplos delimitadores
   - Identificação automática de colunas

---

## 🔍 TROUBLESHOOTING

### Problema: "Nenhum link encontrado"

**Possíveis causas:**
- Portal mudou estrutura HTML
- Links não estão na página acessada
- Portal requer autenticação

**Solução:**
- Verificar manualmente: https://portaldeinformacoes.conab.gov.br/download-arquivos.html
- Ajustar regex se necessário
- Considerar usar Selenium se portal mudar muito

### Problema: "Erro ao processar arquivo"

**Possíveis causas:**
- Estrutura de arquivo diferente do esperado
- Encoding incorreto
- Arquivo corrompido

**Solução:**
- Verificar arquivo manualmente
- Ajustar parsing conforme necessário
- Adicionar mais fallbacks

---

## 📊 COMPARAÇÃO DE ABORDAGENS

| Abordagem | Vantagens | Desvantagens | Status |
|-----------|-----------|--------------|--------|
| **Scraping HTML** | Simples, rápido | Falha se portal usar JS | ✅ Implementado |
| **Download CSV/Excel** | Dados oficiais, confiáveis | Links podem mudar | ✅ Implementado |
| **Selenium** | Funciona com JS | Complexo, lento, pesado | ⚠️ Futuro (se necessário) |
| **API Pública** | Ideal | Não existe | ❌ Não disponível |

**Recomendação:** Usar abordagem híbrida atual (HTML + Download) é suficiente para MVP.

---

## ✅ CONCLUSÃO

**Solução implementada:** Download automático de CSV/Excel do portal CONAB como fallback quando scraping HTML falha.

**Resultado:** Maior chance de coletar dados CONAB, sem bloquear o ETL se falhar.

**Próximo passo:** Instalar `openpyxl` e testar!

---

**Status:** ✅ Implementado e pronto para testes!

**Última atualização:** Dezembro 2025
