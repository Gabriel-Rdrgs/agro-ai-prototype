# ✅ Checklist Rápido: Configurar Scheduler no Railway

Use este checklist para configurar o scheduler worker passo a passo.

---

## 📋 Checklist

### 1. Criar Novo Service
- [ ] No Railway, clique em **"+ New"** → **"Add New Service"**
- [ ] Escolha **"GitHub Repo"** (ou "Empty Service" se preferir)
- [ ] Selecione o mesmo repositório do seu serviço Python
- [ ] Nomeie o service: `agro-ai-scheduler-worker`

### 2. Configurar Root Directory ⚠️ IMPORTANTE!
- [ ] Vá em **"Settings"** do novo service
- [ ] Encontre **"Source"** ou **"Root Directory"**
- [ ] Configure **Root Directory** como: `ai-service`
- [ ] Salve as alterações

### 3. Configurar Start Command
- [ ] Vá em **"Settings"** do novo service
- [ ] Encontre **"Start Command"** ou **"Deploy"**
- [ ] **SUBSTITUA** o comando por:
  ```bash
  python scripts/scheduler_worker.py
  ```
- [ ] Salve as alterações

### 4. Configurar Variáveis de Ambiente
- [ ] Vá em **"Variables"** do service scheduler
- [ ] Copie as variáveis do serviço Python principal:
  - [ ] `DATABASE_URL`
  - [ ] `DIRECT_URL` (se usar)
  - [ ] `INTERNAL_API_KEY`
  - [ ] Outras variáveis necessárias

### 5. Configurar Recursos
- [ ] Vá em **"Settings"** → **"Resources"**
- [ ] Configure:
  - [ ] **CPU:** 0.5 vCPU
  - [ ] **RAM:** 512MB
  - [ ] **Replicas:** **1** ⚠️ (IMPORTANTE: apenas 1!)

### 6. Verificar Deploy
- [ ] Aguarde o deploy completar (2-5 minutos)
- [ ] Vá em **"Deployments"** → clique no deployment mais recente
- [ ] Veja os **"Logs"**
- [ ] Confirme que aparece:
  ```
  ⏰ SCHEDULER WORKER INICIADO
  ✅ Banco de dados conectado
  🔄 Verificando jobs a cada 60 segundos...
  ```

---

## ✅ Pronto!

Se todos os itens acima estão marcados e os logs mostram as mensagens de sucesso, o scheduler está configurado corretamente!

---

## 🆘 Problemas?

- **Erro "can't open file":** Configure `Root Directory` como `ai-service` (PASSO 2)
- **Erro de banco:** Verifique se `DATABASE_URL` está configurada
- **Erro de módulo:** Verifique se `Root Directory` está como `ai-service` e o comando está correto
- **Múltiplas execuções:** Verifique se há apenas **1 réplica**

Veja o guia completo em: `docs/RAILWAY_SCHEDULER_WORKER.md`

