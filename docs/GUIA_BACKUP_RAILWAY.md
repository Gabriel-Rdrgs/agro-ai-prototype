# 💾 Guia: Configurar Backup Automático no Railway

Este guia explica como configurar backups automáticos do PostgreSQL no Railway usando o `backup_worker.py`.

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

## 🚀 Opção 1: Railway Cron Job (Recomendado)

### Passo 1: Criar um Novo Service

1. No dashboard do Railway, vá para seu projeto
2. Clique em **"+ New"** → **"Add New Service"**
3. Escolha **"GitHub Repo"** e selecione o mesmo repositório (`agro-ai-prototype`)

### Passo 2: Configurar Root Directory

⚠️ **IMPORTANTE:** Como o script está na raiz do projeto, você pode deixar o Root Directory vazio ou configurar como `./`

1. Vá em **"Settings"** do novo service
2. Na seção **"Source"**, configure:
   - **Root Directory:** Deixe vazio (ou `./`)
   - Isso indica que o código está na raiz do repositório

### Passo 3: Configurar Start Command

1. Ainda em **"Settings"**, procure a seção **"Deploy"** ou **"Start Command"**
2. Configure o comando de inicialização:
   ```bash
   python scripts/backup_worker.py --once
   ```
   - O `--once` faz o script executar o backup uma vez e terminar

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
   ```

   **Nota:** Use `DIRECT_URL` se disponível (porta 5432, sem pgbouncer) para backups mais confiáveis.

### Passo 5: Configurar Cron Schedule

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

## 🔄 Opção 2: Railway Service (Processo Contínuo)

Se preferir um processo que roda continuamente:

### Passo 1-4: Mesmos passos da Opção 1

### Passo 5: Configurar Start Command (Diferente)

Em vez de `--once`, use `--schedule`:

```bash
python scripts/backup_worker.py --schedule
```

### Passo 6: Configurar Horário do Backup

O horário é controlado pela variável de ambiente `BACKUP_SCHEDULE_TIME`:

```bash
BACKUP_SCHEDULE_TIME=02:00  # Backup às 2h UTC (padrão)
```

O script usa a biblioteca `schedule` para executar backups no horário configurado.

---

## 📤 Upload Automático para S3/Cloud Storage (Opcional)

Para salvar backups em storage externo, você pode:

### Opção A: Modificar o Script

Adicione lógica de upload após o backup no `backup_postgres.py`:

```python
import boto3

def upload_to_s3(file_path, bucket_name, s3_key):
    s3 = boto3.client('s3')
    s3.upload_file(file_path, bucket_name, s3_key)
```

### Opção B: Usar Railway Volume + Sincronização

1. Configure um volume no Railway
2. Use um script separado para sincronizar com S3 periodicamente

---

## 🧪 Testar a Configuração

Antes de agendar, teste manualmente:

1. No Railway, vá para o service de backup
2. Clique em **"Deploy"** → **"Manual Deploy"**
3. Ou execute localmente:
   ```bash
   python scripts/backup_worker.py --test
   ```

Isso verifica se todas as variáveis de ambiente estão configuradas corretamente.

---

## 📊 Monitoramento

### Ver Logs

1. No Railway, vá para o service de backup
2. Clique na aba **"Logs"**
3. Você verá:
   - ✅ "BACKUP CONCLUÍDO COM SUCESSO" - Backup bem-sucedido
   - ❌ "ERRO AO EXECUTAR BACKUP" - Backup falhou

### Verificar Backups

Se você configurou um volume:

1. Conecte ao service via SSH (se disponível)
2. Liste os arquivos:
   ```bash
   ls -lh /tmp/backups/
   ```

---

## 🔧 Troubleshooting

### Erro: "Script de backup não encontrado"

**Causa:** Root Directory configurado incorretamente.

**Solução:** Verifique se o Root Directory está vazio (ou `./`) e o script está em `scripts/backup_postgres.py`

### Erro: "DATABASE_URL não configurado"

**Causa:** Variável de ambiente não definida.

**Solução:** Adicione `DATABASE_URL` ou `DIRECT_URL` nas variáveis de ambiente do service.

### Erro: "pg_dump não encontrado"

**Causa:** PostgreSQL client não instalado no container.

**Solução:** 
- O `Dockerfile` do `ai-service` já inclui `postgresql-client-17` (compatível com Supabase)
- Se usar um Dockerfile customizado, adicione:
```dockerfile
RUN apt-get update && apt-get install -y postgresql-client-17
```
- Ou use o `Dockerfile.backup` fornecido na raiz do projeto

### Erro: "server version mismatch" (pg_dump versão diferente do servidor)

**Causa:** Versão do `pg_dump` incompatível com a versão do PostgreSQL do servidor.

**Solução:**
- Os Dockerfiles já incluem `postgresql-client-17` (compatível com Supabase PostgreSQL 17)
- No Railway, isso será resolvido automaticamente pelo Dockerfile
- Localmente, instale uma versão compatível:
  ```bash
  # Ubuntu/Debian - Adicionar repositório oficial do PostgreSQL
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

---

## 📝 Checklist de Configuração

- [ ] Service criado no Railway
- [ ] Root Directory configurado (vazio ou `./`)
- [ ] Start Command configurado (`--once` ou `--schedule`)
- [ ] Variáveis de ambiente adicionadas (`DATABASE_URL` ou `DIRECT_URL`)
- [ ] Cron schedule configurado (se usar `--once`)
- [ ] `BACKUP_SCHEDULE_TIME` configurado (se usar `--schedule`)
- [ ] Volume criado e montado (opcional, para persistência)
- [ ] Teste manual executado com sucesso
- [ ] Logs verificados após primeira execução

---

## 🔗 Referências

- [Railway Cron Jobs Documentation](https://docs.railway.app/guides/cron)
- [Railway Volumes Documentation](https://docs.railway.app/guides/volumes)
- [Guia de Backup PostgreSQL](./GUIA_BACKUP_POSTGRES.md)

