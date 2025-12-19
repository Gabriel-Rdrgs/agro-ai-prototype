# ✅ Checklist: Configurar Backup Automático no Railway

Use este checklist para configurar backups automáticos passo a passo.

---

## 📋 Pré-requisitos

- [ ] Scripts de backup existem (`scripts/backup_postgres.py` e `scripts/backup_worker.py`)
- [ ] Acesso ao Railway Dashboard
- [ ] Variável `DATABASE_URL` ou `DIRECT_URL` disponível

---

## 🚀 Configuração no Railway

### Passo 1: Criar Service

- [ ] No Railway, clique em **"+ New"** → **"Add New Service"**
- [ ] Escolha **"GitHub Repo"** e selecione `agro-ai-prototype`
- [ ] Service criado com sucesso

### Passo 2: Configurar Root Directory

- [ ] Vá em **"Settings"** do service
- [ ] Na seção **"Source"**, configure:
  - [ ] **Root Directory:** Deixe vazio (ou `./`)
  - [ ] Salve as alterações

### Passo 3: Configurar Start Command

- [ ] Em **"Settings"** → **"Deploy"** ou **"Start Command"**
- [ ] Configure:
  ```bash
  python scripts/backup_worker.py --once
  ```
- [ ] Salve as alterações

### Passo 4: Configurar Variáveis de Ambiente

- [ ] Vá em **"Variables"** do service
- [ ] Adicione:
  - [ ] `DATABASE_URL` ou `DIRECT_URL` (obrigatório)
  - [ ] `BACKUP_DIR=/tmp/backups` (opcional)
  - [ ] `BACKUP_RETENTION_DAYS=7` (opcional, padrão: 7)
  - [ ] `BACKUP_COMPRESS=true` (opcional, padrão: true)

### Passo 5: Configurar Cron Schedule

- [ ] Vá na aba **"Cron"** do service (ou "Scheduled Jobs")
- [ ] Configure:
  - [ ] **Cron Expression:** `0 2 * * *` (diário às 2h UTC)
  - [ ] **Timezone:** UTC
- [ ] Salve as alterações

### Passo 6: Configurar Volume (Opcional)

- [ ] Se quiser persistir backups, vá em **"Settings"** → **"Volumes"**
- [ ] Crie um volume
- [ ] Monte em `/tmp/backups`
- [ ] Configure `BACKUP_DIR=/tmp/backups` nas variáveis

---

## 🧪 Teste

- [ ] Execute teste de configuração:
  ```bash
  python scripts/backup_worker.py --test
  ```
- [ ] Execute backup manual uma vez:
  ```bash
  python scripts/backup_worker.py --once
  ```
- [ ] Verifique logs no Railway após primeira execução
- [ ] Confirme que backup foi criado com sucesso

---

## ✅ Validação Final

- [ ] Service está rodando no Railway
- [ ] Cron está configurado corretamente
- [ ] Variáveis de ambiente estão definidas
- [ ] Backup executou com sucesso (verificar logs)
- [ ] Arquivo de backup foi criado (se volume configurado)

---

## 📚 Documentação

Para mais detalhes, consulte:
- [Guia Completo de Backup no Railway](./GUIA_BACKUP_RAILWAY.md)
- [Guia de Backup PostgreSQL](./GUIA_BACKUP_POSTGRES.md)

