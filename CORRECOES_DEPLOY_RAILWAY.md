# 🔧 Correções para Deploy no Railway

**Data:** Dezembro 2025  
**Status:** ✅ **CORRIGIDO**

---

## 🐛 PROBLEMAS IDENTIFICADOS

### 1. ❌ NameError: name 'logger' is not defined
**Arquivo:** `ai-service/services/data_sync/ibge_scraper.py`  
**Linha:** 35  
**Problema:** `logger` estava sendo usado antes de ser definido

**Erro:**
```python
# ❌ ERRADO (ordem incorreta)
try:
    import sidrapy
    SIDRAPY_AVAILABLE = True
except ImportError:
    SIDRAPY_AVAILABLE = False
    logger.warning("⚠️ sidrapy não instalado...")  # ❌ logger ainda não existe!

logger = logging.getLogger(__name__)  # Definido depois
```

**Correção:**
```python
# ✅ CORRETO (logger definido primeiro)
logger = logging.getLogger(__name__)  # Definido primeiro

try:
    import sidrapy
    SIDRAPY_AVAILABLE = True
except ImportError:
    SIDRAPY_AVAILABLE = False
    logger.debug("ℹ️ sidrapy não instalado (opcional)...")  # ✅ logger já existe
```

---

### 2. ❌ ModuleNotFoundError: No module named 'sidrapy'
**Problema:** Biblioteca `sidrapy` não está no `requirements.txt`  
**Solução:** `sidrapy` é opcional (fallback), não é necessário. O código já trata isso corretamente agora.

**Nota:** Adicionado comentário no `requirements.txt` explicando que é opcional.

---

### 3. ⚠️ Import de scripts.run_etl no main.py
**Arquivo:** `ai-service/main.py`  
**Linha:** 22  
**Problema:** Import no nível superior pode causar erros no deploy se houver dependências circulares

**Correção:** Removido import do nível superior (comentado). O ETL pode ser importado quando necessário (lazy import).

---

## ✅ CORREÇÕES APLICADAS

### Arquivos Modificados

1. **`ai-service/services/data_sync/ibge_scraper.py`**
   - ✅ `logger` definido antes do try/except
   - ✅ Mensagem de erro alterada para `logger.debug()` (menos verboso)
   - ✅ Comentário explicando que sidrapy é opcional

2. **`ai-service/main.py`**
   - ✅ Removido `import scripts.run_etl` do nível superior
   - ✅ Adicionado comentário explicando lazy import

3. **`ai-service/requirements.txt`**
   - ✅ Adicionado comentário sobre sidrapy ser opcional

---

## 🧪 TESTES REALIZADOS

```bash
✅ Sintaxe OK - ibge_scraper.py compila sem erros
✅ Import OK - ibge_scraper importa corretamente
✅ Main import OK - main.py importa sem erros
```

---

## 📝 PRÓXIMOS PASSOS

1. ✅ Fazer commit das correções
2. ✅ Fazer push para o repositório
3. ✅ Railway deve fazer deploy automaticamente
4. ✅ Verificar logs do Railway após deploy

---

## 🔍 VERIFICAÇÃO

Para verificar se está tudo OK:

```bash
# Testar import localmente
cd ai-service
python3 -c "from services.data_sync.ibge_scraper import ibge_scraper; print('OK')"
python3 -c "import main; print('OK')"
```

---

**Status:** ✅ **PRONTO PARA DEPLOY**
