# 🔍 Como Verificar se o Backup no Railway Está Funcionando

## 📋 Checklist Rápido

### ✅ 1. Verificar Logs do Service de Backup

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

### ✅ 2. Verificar Execução do Job (se configurado como Cron Job)

1. **Acesse a aba "Triggers" ou "Cron Jobs"**
   - Veja o histórico de execuções
   - Verifique se há execuções recentes

2. **Status das Execuções:**
   - ✅ **Success** - Backup executado com sucesso
   - ❌ **Failed** - Backup falhou (veja logs para detalhes)
   - ⏸️ **Pending** - Aguardando próxima execução

### ✅ 3. Verificar Variáveis de Ambiente

1. **Acesse a aba "Variables" do service de backup**
2. **Verifique se estas variáveis estão configuradas:**
   - ✅ `DATABASE_URL` ou `DIRECT_URL` - **OBRIGATÓRIO**
   - ⚙️ `BACKUP_RETENTION_DAYS` (opcional, padrão: 7)
   - ⚙️ `BACKUP_COMPRESS` (opcional, padrão: true)
   - ⚙️ `BACKUP_SCHEDULE_TIME` (opcional, apenas para modo `--schedule`, padrão: 02:00)

### ✅ 4. Testar Manualmente (Recomendado para Primeira Vez)

1. **Execute o backup manualmente:**
   - No Railway, vá para o service de backup
   - Na aba **"Deployments"**, clique em **"Redeploy"**
   - Ou use o comando manual (se configurado como Service):
     ```bash
     python scripts/backup_worker.py --once
     ```

2. **Observe os logs em tempo real**
   - Deve aparecer a mensagem de sucesso

### ✅ 5. Verificar Arquivos de Backup (se usar Volume)

**⚠️ IMPORTANTE:** Por padrão, os backups são salvos no sistema de arquivos do container, que é **efêmero** (desaparece quando o container reinicia).

**Para backups persistentes, você precisa:**

1. **Configurar um Volume no Railway:**
   - Vá em **"Settings"** → **"Volumes"**
   - Adicione um volume (ex: `/app/backups`)
   - Configure a variável `BACKUP_DIR=/app/backups`

2. **Verificar arquivos (se tiver acesso SSH):**
   ```bash
   # Conecte ao container via Railway CLI ou SSH
   ls -lh /app/backups/
   # Deve mostrar arquivos como:
   # backup_20251219_020000.sql.gz
   # backup_20251218_020000.sql.gz
   ```

### ✅ 6. Verificar Tamanho e Data dos Backups

Nos logs, você verá:
```
📁 Arquivo: backup_20251219_020000.sql.gz
💾 Tamanho: 1.2 MB
🗓️ Retenção: 7 dias
```

**Verifique:**
- ✅ Tamanho razoável (não 0 bytes)
- ✅ Data recente (se configurado para executar diariamente)
- ✅ Arquivo comprimido (extensão `.gz` se `BACKUP_COMPRESS=true`)

---

## 🚨 Sinais de Problema

### ❌ Backup não está executando

**Sintomas:**
- Nenhum log de backup nas últimas 24h
- Status do job sempre "Pending"

**Possíveis causas:**
- Cron expression incorreta
- Service não configurado corretamente
- Job não está agendado

**Solução:**
- Verifique a configuração do cron job
- Teste manualmente com `--once`

### ❌ Backup falha com erro de conexão

**Sintomas:**
```
❌ Erro: pg_dump: error: connection to server at "..." failed
```

**Possíveis causas:**
- `DATABASE_URL` incorreta ou não configurada
- Firewall bloqueando conexão
- Credenciais inválidas

**Solução:**
- Verifique `DATABASE_URL` nas variáveis de ambiente
- Use `DIRECT_URL` (porta 5432) em vez de `DATABASE_URL` (porta 6543)
- Teste a conexão manualmente

### ❌ Backup falha com erro de versão

**Sintomas:**
```
❌ Erro: server version: 17.6; pg_dump version: 14.20
```

**Solução:**
- Os Dockerfiles já estão configurados com `postgresql-client-17`
- Faça redeploy do service para aplicar a correção

---

## 📊 Monitoramento Contínuo

### Opção 1: Verificar Logs Diariamente

1. Acesse Railway → Service de Backup → Logs
2. Verifique se há execuções diárias
3. Confirme mensagens de sucesso

### Opção 2: Configurar Alertas (Futuro)

Você pode configurar alertas no Railway para:
- Notificar quando um backup falhar
- Notificar quando não houver backup por X dias

### Opção 3: Integrar com Monitoramento Externo

- Use webhooks do Railway
- Configure alertas via email/Slack
- Integre com serviços de monitoramento (ex: Sentry)

---

## ✅ Checklist Final

Antes de considerar o backup funcionando:

- [ ] Service/job de backup criado no Railway
- [ ] Variável `DATABASE_URL` ou `DIRECT_URL` configurada
- [ ] Teste manual executado com sucesso
- [ ] Logs mostram "BACKUP CONCLUÍDO COM SUCESSO"
- [ ] Arquivo de backup gerado (se usar volume)
- [ ] Tamanho do backup é razoável (> 0 bytes)
- [ ] Backup agendado (se configurado como cron job)
- [ ] Execuções automáticas aparecem nos logs

---

## 🎯 Resumo

**Para verificar rapidamente se o backup está funcionando:**

1. **Railway Dashboard** → Service de Backup → **Logs**
2. Procure por: `✅ BACKUP CONCLUÍDO COM SUCESSO`
3. Verifique a data/hora da última execução
4. Se não houver execuções recentes, teste manualmente

**Se tudo estiver OK, você verá backups sendo executados automaticamente conforme o agendamento configurado!** 🎉

