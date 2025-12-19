# 💾 Guia Completo: Backup Automático no Railway

Este guia completo explica como configurar, verificar e resolver problemas de backups automáticos do PostgreSQL no Railway.

---

## 📋 Índice

1. [Opções de Configuração](#opções-de-configuração)
2. [Configuração Passo a Passo](#configuração-passo-a-passo)
3. [Verificação e Monitoramento](#verificação-e-monitoramento)
4. [Troubleshooting](#troubleshooting)
5. [Checklist Rápido](#checklist-rápido)

---

## 🎯 Opções de Configuração

Você tem **duas opções** para rodar backups no Railway:

### **Opção 1: Railway Cron Job** (Recomendado) ⭐
- Executa o backup uma vez por dia e termina
- Mais eficiente (não fica rodando 24/7)
- Ideal para backups diários

### **Opção 2: Railway Service** (Alternativa)
- Roda continuamente e executa backups agendados
- Útil se precisar de múltiplos backups por dia
- Consome mais recursos

---

## 🚀 Configuração Passo a Passo

### Passo 1: Criar um Novo Service

1. No dashboard do Railway, vá para seu projeto
2. Clique em **"+ New"** → **"Add New Service"**
3. Escolha **"GitHub Repo"** e selecione o mesmo repositório (`agro-ai-prototype`)

### Passo 2: Configurar Root Directory e Dockerfile

⚠️ **IMPORTANTE:** O Dockerfile do backup está na raiz como `Dockerfile`

1. Vá em **"Settings"** do novo service
2. Na seção **"Build & Deploy"**, configure:
   - **Root Directory:** Deixe vazio (ou `./`) - código está na raiz
   - **Dockerfile Path:** `Dockerfile` (ou deixe vazio) ⚠️ **CRÍTICO**
   - O Railway detectará automaticamente o `Dockerfile` na raiz
3. Clique em **"Save"**
3. Clique em **"Save"**

### Passo 3: Configurar Start Command

1. Ainda em **"Settings"**, procure a seção **"Deploy"** ou **"Start Command"**
2. Configure o comando de inicialização:

   **Para Cron Job (Opção 1):**
   ```bash
   python scripts/backup_worker.py --once
   ```
   - O `--once` faz o script executar o backup uma vez e terminar

   **Para Service Contínuo (Opção 2):**
   ```bash
   python scripts/backup_worker.py --schedule
   ```
   - O `--schedule` faz o script rodar continuamente e executar backups agendados

### Passo 4: Configurar Variáveis de Ambiente

1. Na seção **"Variables"** do service, adicione:

   ```bash
   # Obrigatório: URL do banco de dados
   DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
   # OU (preferível para backups)
   DIRECT_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
   
   # Opcional: Configurações de backup
   BACKUP_DIR=/tmp/backups
   BACKUP_RETENTION_DAYS=7
   BACKUP_COMPRESS=true
   BACKUP_SCHEDULE_TIME=02:00  # Apenas para modo --schedule
   ```

   **Nota:** Use `DIRECT_URL` se disponível (porta 5432, sem pgbouncer) para backups mais confiáveis.

### Passo 5: Configurar Cron Schedule (Apenas Opção 1)

1. No Railway, vá para a aba **"Cron"** do service (ou procure por "Scheduled Jobs")
2. Configure o schedule:
   - **Cron Expression:** `0 2 * * *` (diário às 2h UTC)
   - **Timezone:** UTC (ou ajuste conforme necessário)

   **Exemplos de Cron:**
   - `0 2 * * *` - Diário às 2h UTC
   - `0 3 * * *` - Diário às 3h UTC
   - `0 2 * * 0` - Semanal (domingos às 2h)
   - `0 */6 * * *` - A cada 6 horas

### Passo 6: Configurar Storage (Opcional)

Se você quiser persistir os backups:

1. Vá em **"Settings"** → **"Volumes"**
2. Crie um volume e monte em `/tmp/backups` (ou o diretório configurado em `BACKUP_DIR`)
3. Configure `BACKUP_DIR=/tmp/backups` nas variáveis de ambiente

**Alternativa:** Configure upload automático para S3/Cloud Storage (veja seção abaixo)

---

## 📊 Verificação e Monitoramento

### 1. Verificar Logs do Service

1. **Acesse o Railway Dashboard**
   - Vá para seu projeto
   - Encontre o service/job de backup (ex: `backup-worker`)

2. **Abra a aba "Logs"**
   - Clique na aba **"Logs"** do service de backup
   - Você verá os logs em tempo real

3. **Procure por estas mensagens:**

   **✅ Backup Bem-Sucedido:**
   ```
   🚀 Modo job único - executando backup agora...
   💾 INICIANDO BACKUP DO BANCO DE DADOS
   📦 Executando pg_dump...
   ✅ BACKUP CONCLUÍDO COM SUCESSO
   📁 Arquivo: backup_YYYYMMDD_HHMMSS.sql.gz
   💾 Tamanho: XXX KB
   ```

   **❌ Backup Falhou:**
   ```
   ❌ ERRO AO EXECUTAR BACKUP
   ❌ Erro: [mensagem de erro]
   ```

### 2. Verificar Execução do Job (Cron Job)

1. **Acesse a aba "Triggers" ou "Cron Jobs"**
   - Veja o histórico de execuções
   - Verifique se há execuções recentes

2. **Status das Execuções:**
   - ✅ **Success** - Backup executado com sucesso
   - ❌ **Failed** - Backup falhou (veja logs para detalhes)
   - ⏸️ **Pending** - Aguardando próxima execução

### 3. Testar Manualmente (Recomendado para Primeira Vez)

1. **Execute o backup manualmente:**
   - No Railway, vá para o service de backup
   - Na aba **"Deployments"**, clique em **"Redeploy"**
   - Ou execute localmente:
     ```bash
     python scripts/backup_worker.py --test  # Testa configuração
     python scripts/backup_worker.py --once   # Executa backup
     ```

2. **Observe os logs em tempo real**
   - Deve aparecer a mensagem de sucesso

### 4. Verificar Arquivos de Backup (se usar Volume)

**⚠️ IMPORTANTE:** Por padrão, os backups são salvos no sistema de arquivos do container, que é **efêmero** (desaparece quando o container reinicia).

**Para backups persistentes:**
1. Configure um Volume no Railway (Settings → Volumes)
2. Monte em `/tmp/backups` (ou outro diretório)
3. Configure `BACKUP_DIR=/tmp/backups` nas variáveis

---

## 🔧 Troubleshooting

### Erro: "Railpack could not determine how to build the app"

**Causa:** Dockerfile Path não configurado ou incorreto.

**Solução:** 
- Configure o Root Directory como vazio (ou `./`)
- Configure o Dockerfile Path como `Dockerfile` (ou deixe vazio)
- Verifique se o arquivo `Dockerfile` existe na raiz do repositório

### Erro: "Script de backup não encontrado"

**Causa:** Root Directory configurado incorretamente.

**Solução:** Verifique se o Root Directory está vazio (ou `./`) e o script está em `scripts/backup_postgres.py`

### Erro: "DATABASE_URL não configurado"

**Causa:** Variável de ambiente não definida.

**Solução:** Adicione `DATABASE_URL` ou `DIRECT_URL` nas variáveis de ambiente do service.

### Erro: "pg_dump não encontrado"

**Causa:** PostgreSQL client não instalado no container.

**Solução:** 
- O `Dockerfile` na raiz já inclui `postgresql-client-17` (compatível com Supabase)
- Faça redeploy do service para aplicar

### Erro: "server version mismatch" (pg_dump versão diferente do servidor)

**Causa:** Versão do `pg_dump` incompatível com a versão do PostgreSQL do servidor.

**Solução:**
- Os Dockerfiles já incluem `postgresql-client-17` (compatível com Supabase PostgreSQL 17)
- No Railway, isso será resolvido automaticamente pelo Dockerfile
- Localmente, instale uma versão compatível:
  ```bash
  wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
  echo "deb http://apt.postgresql.org/pub/repos/apt/ $(lsb_release -cs)-pgdg main" | sudo tee /etc/apt/sources.list.d/pgdg.list
  sudo apt-get update
  sudo apt-get install postgresql-client-17
  ```

### Backup não executa no horário agendado

**Causa:** Cron não configurado ou timezone incorreto.

**Solução:** 
- Verifique a expressão cron no Railway
- Confirme que o timezone está correto
- Para modo `--schedule`, verifique `BACKUP_SCHEDULE_TIME`

### Backup falha com erro de conexão

**Sintomas:**
```
❌ Erro: pg_dump: error: connection to server at "..." failed
```

**Solução:**
- Verifique `DATABASE_URL` nas variáveis de ambiente
- Use `DIRECT_URL` (porta 5432) em vez de `DATABASE_URL` (porta 6543)
- Teste a conexão manualmente

---

## ✅ Checklist Rápido

### Configuração Inicial
- [ ] Service criado no Railway
- [ ] Root Directory configurado (vazio ou `./`)
- [ ] Dockerfile Path: `Dockerfile` (ou vazio) ⚠️
- [ ] Start Command configurado (`--once` ou `--schedule`)
- [ ] Variáveis de ambiente adicionadas (`DATABASE_URL` ou `DIRECT_URL`)
- [ ] Cron schedule configurado (se usar `--once`)
- [ ] `BACKUP_SCHEDULE_TIME` configurado (se usar `--schedule`)
- [ ] Volume criado e montado (opcional, para persistência)

### Validação
- [ ] Teste manual executado com sucesso
- [ ] Logs mostram "BACKUP CONCLUÍDO COM SUCESSO"
- [ ] Arquivo de backup gerado (se usar volume)
- [ ] Tamanho do backup é razoável (> 0 bytes)
- [ ] Backup agendado (se configurado como cron job)
- [ ] Execuções automáticas aparecem nos logs

---

## 🔗 Referências

- [Railway Cron Jobs Documentation](https://docs.railway.app/guides/cron)
- [Railway Volumes Documentation](https://docs.railway.app/guides/volumes)
- [Guia de Backup PostgreSQL](./GUIA_BACKUP_POSTGRES.md)

---

## 📝 Notas Finais

**Estrutura do Projeto:**
- `Dockerfile` - Dockerfile do backup worker (na raiz, usado quando Root Directory está vazio)
- `Dockerfile.backup-worker` - Cópia de referência (não usado pelo Railway)
- `scripts/backup_postgres.py` - Script de backup
- `scripts/backup_worker.py` - Worker de agendamento

**Nota:** O Railway detecta automaticamente o `Dockerfile` na raiz quando o Root Directory está vazio. Para outros serviços (AI Service, Backend), use os Dockerfiles em seus respectivos diretórios.

**Para verificar rapidamente se o backup está funcionando:**
1. Railway Dashboard → Service de Backup → **Logs**
2. Procure por: `✅ BACKUP CONCLUÍDO COM SUCESSO`
3. Verifique a data/hora da última execução
4. Se não houver execuções recentes, teste manualmente
