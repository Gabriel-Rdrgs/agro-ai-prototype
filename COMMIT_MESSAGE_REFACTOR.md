# Mensagem de Commit - Refatoração de Documentação e Configuração Railway Backup

## Título (curto)
```
refactor(docs): organiza documentação e corrige configuração Railway Backup
```

## Descrição Completa
```
refactor(docs): organiza documentação e corrige configuração Railway Backup

### 📚 Organização de Documentação
- Remove arquivos temporários (COMMIT_MESSAGE_*.md, FASE0_*.md)
- Consolida documentação relacionada em guias únicos:
  - Backup: 4 arquivos → GUIA_BACKUP_RAILWAY.md
  - Railway: 3 arquivos → GUIA_RAILWAY.md
  - Testes: 4 arquivos → GUIA_TESTES.md
  - Prophet: 2 arquivos → GUIA_PROPHET.md
- Cria índice de documentação (docs/README.md)
- Reduz de ~39 para 12 arquivos .md organizados

### 🔧 Configuração Railway Backup
- Cria Dockerfile na raiz para Railway detectar automaticamente
- Railway detecta Dockerfile quando Root Directory está vazio
- Adiciona schedule às dependências do backup worker
- Atualiza guia de backup com configuração correta
- Corrige referências ao Dockerfile do backup

### 📝 Arquivos Removidos
- COMMIT_MESSAGE_*.md (temporários)
- FASE0_*.md (temporários)
- Documentação duplicada consolidada

### 📝 Arquivos Criados/Atualizados
- docs/README.md (novo índice)
- docs/GUIA_BACKUP_RAILWAY.md (consolidado)
- docs/GUIA_RAILWAY.md (consolidado)
- docs/GUIA_TESTES.md (consolidado)
- docs/GUIA_PROPHET.md (consolidado)
- Dockerfile (novo, na raiz - usado pelo Railway)
- Dockerfile.backup-worker (mantido como referência)
- scripts/backup_worker.py (adiciona schedule às dependências)
```

## Versão Curta (se preferir)
```
refactor(docs): organiza documentação e corrige Railway Backup

- Consolida 13 arquivos .md em 5 guias organizados
- Remove arquivos temporários
- Cria Dockerfile na raiz para Railway detectar automaticamente
- Adiciona índice de documentação (docs/README.md)
```

