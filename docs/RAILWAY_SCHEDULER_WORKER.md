# ⏰ Guia Passo a Passo: Configurar Scheduler Worker no Railway

Este guia explica **exatamente** como configurar o Scheduler Worker no Railway, com cada passo detalhado.

---

## 🎯 O Que Você Vai Fazer

Você vai criar um **novo Service** no Railway que roda o mesmo código do seu serviço Python, mas executa o `scheduler_worker.py` em vez do FastAPI.

**Arquitetura final:**
```
┌─────────────────────┐     ┌──────────────────────┐
│  Python Service     │     │ Scheduler Worker     │
│  (FastAPI - API)    │     │ (Background Jobs)     │
│  Múltiplas réplicas  │     │ 1 réplica apenas     │
└─────────────────────┘     └──────────────────────┘
         │                            │
         └────────────┬───────────────┘
                      │
            ┌─────────▼─────────┐
            │  PostgreSQL       │
            │  (Supabase)       │
            └───────────────────┘
```

---

## 📝 Passo a Passo Completo

### **PASSO 1: Escolher a Opção Correta no Menu**

Quando você clicar em **"+ New"** → **"Add New Service"**, você verá um menu com várias opções.

**✅ ESCOLHA: "GitHub Repo"** (se seu projeto já está conectado ao GitHub)

**OU**

**✅ ESCOLHA: "Empty Service"** (se preferir configurar manualmente)

> **💡 Por que?** 
> - Se escolher "GitHub Repo", o Railway vai usar o mesmo repositório do seu serviço Python principal
> - Se escolher "Empty Service", você vai precisar conectar o repositório depois

---

### **PASSO 2: Configurar o Service**

#### 2.1. Se escolheu "GitHub Repo":

1. Selecione o mesmo repositório do seu serviço Python
2. O Railway vai detectar automaticamente o código
3. Vá para **PASSO 3**

#### 2.2. Se escolheu "Empty Service":

1. Clique em **"Settings"** do novo service
2. Na seção **"Source"**, clique em **"Connect GitHub Repo"**
3. Selecione seu repositório `agro-ai-prototype`
4. Configure o **Root Directory** como: `ai-service` (ou deixe vazio se o repositório já aponta para ai-service)

---

### **PASSO 3: Configurar Root Directory (IMPORTANTE!)**

⚠️ **CRÍTICO:** O Railway precisa saber onde está o código do `ai-service`.

1. No service criado, vá em **"Settings"**
2. Encontre a seção **"Source"** ou **"Root Directory"**
3. Configure o **Root Directory** como: `ai-service`
   - Isso diz ao Railway que o código está na pasta `ai-service/` do repositório
4. Salve as alterações

> **💡 Por que isso é importante?**
> - Seu repositório tem a estrutura: `agro-ai-prototype/ai-service/scripts/scheduler_worker.py`
> - O Railway precisa saber que o "root" do service é `ai-service/`, não a raiz do repositório
> - Sem isso, ele procura `/app/scripts/scheduler_worker.py` mas o arquivo está em `/app/ai-service/scripts/scheduler_worker.py`

---

### **PASSO 4: Configurar o Comando de Inicialização**

Este é o passo mais importante! Você precisa mudar o comando que o Railway executa.

1. No service criado, vá em **"Settings"**
2. Role até a seção **"Deploy"** ou **"Start Command"**
3. Você verá algo como:
   ```
   uvicorn main:app --host 0.0.0.0 --port $PORT
   ```
4. **SUBSTITUA** por:
   ```bash
   python scripts/scheduler_worker.py
   ```
5. Salve as alterações

> **💡 Explicação:** 
> - O serviço Python principal roda `uvicorn main:app` (FastAPI)
> - O scheduler worker roda `python scripts/scheduler_worker.py` (worker de background)
> - Com o Root Directory configurado como `ai-service`, o caminho `scripts/scheduler_worker.py` funciona corretamente

---

### **PASSO 5: Configurar Variáveis de Ambiente**

O scheduler precisa das mesmas variáveis do serviço Python principal.

1. No service do scheduler, vá em **"Variables"** (ou **"Environment Variables"**)
2. Adicione as mesmas variáveis do seu serviço Python principal:

**Variáveis obrigatórias:**
```
DATABASE_URL=postgresql://... (sua URL do Supabase)
DIRECT_URL=postgresql://... (URL direta, sem pgbouncer)
INTERNAL_API_KEY=seu_token_aqui
```

**Variáveis opcionais (se usar):**
```
PYTHON_DB_URL=postgresql://...
OPENAI_API_KEY=sk-... (se o scheduler precisar chamar OpenAI)
```

> **💡 Dica:** 
> - No Railway, você pode copiar variáveis de um service para outro
> - Vá no service Python principal → "Variables" → "..." → "Copy Variables"
> - Cole no service do scheduler

---

### **PASSO 6: Configurar Recursos (CPU/RAM)**

1. No service do scheduler, vá em **"Settings"** → **"Resources"**
2. Configure:
   - **CPU:** 0.5 vCPU (suficiente para scheduler)
   - **RAM:** 512MB (suficiente)
   - **Replicas:** **1** ⚠️ **IMPORTANTE: apenas 1 réplica!**

> **⚠️ CRÍTICO:** 
> - Se você colocar mais de 1 réplica, o scheduler vai executar os mesmos jobs múltiplas vezes
> - Sempre mantenha **1 réplica apenas**

---

### **PASSO 7: Nomear o Service (Opcional mas Recomendado)**

1. No service, clique no nome (provavelmente algo como "Service-123")
2. Renomeie para: `agro-ai-scheduler-worker`
3. Isso facilita identificar nos logs e no dashboard

---

### **PASSO 8: Fazer Deploy e Verificar**

1. O Railway vai fazer deploy automaticamente após salvar as configurações
2. Aguarde o deploy completar (pode levar 2-5 minutos)
3. Vá em **"Deployments"** → clique no deployment mais recente
4. Verifique os logs

**Logs esperados (sucesso):**
```
⏰ SCHEDULER WORKER INICIADO
============================================================
🔌 Testando conexão com banco de dados...
✅ Database engine criado (pool_size=3, max_overflow=2)
✅ Conexão com banco OK
✅ Banco de dados conectado
📋 Registrando jobs agendados...
✅ Jobs registrados (nenhum por padrão - ETLs são executados manualmente)
🔄 Verificando jobs a cada 60 segundos...
   Pressione Ctrl+C para interromper
============================================================
```

**Se aparecer erro:**
- Verifique se as variáveis de ambiente estão corretas
- Verifique se `DATABASE_URL` está configurada
- Veja a seção **Troubleshooting** abaixo

---

## 🖼️ Visualização do Processo

### Menu Inicial:
```
┌─────────────────────────────┐
│  Add New Service           │
├─────────────────────────────┤
│  🐙 GitHub Repo      ← ESCOLHA ESTA
│  📄 Template
│  🗄️ Database
│  🐳 Docker Image
│  💾 Volume
│  ⚡ Function
│  🪣 Bucket
│  >_ Empty Service
└─────────────────────────────┘
```

### Configuração do Service:
```
┌─────────────────────────────────────┐
│  Settings - agro-ai-scheduler      │
├─────────────────────────────────────┤
│  Source:                            │
│  [GitHub Repo: agro-ai-prototype]  │
│  Root Directory: ai-service         │
│                                     │
│  Deploy:                            │
│  Start Command:                     │
│  [python scripts/scheduler_worker.py] ← MUDE AQUI
│                                     │
│  Resources:                         │
│  CPU: [0.5 vCPU]                   │
│  RAM: [512MB]                       │
│  Replicas: [1] ← IMPORTANTE!       │
└─────────────────────────────────────┘
```

---

## 🔍 Verificar se Está Funcionando

### Método 1: Logs no Dashboard

1. No service do scheduler, clique em **"Deployments"**
2. Clique no deployment mais recente
3. Veja a aba **"Logs"**
4. Você deve ver mensagens como:
   ```
   ⏰ SCHEDULER WORKER INICIADO
   ✅ Banco de dados conectado
   🔄 Verificando jobs a cada 60 segundos...
   ```

### Método 2: Railway CLI

```bash
# Instalar Railway CLI (se não tiver)
npm i -g @railway/cli

# Login
railway login

# Ver logs do scheduler
railway logs --service agro-ai-scheduler-worker
```

---

## ⚠️ Troubleshooting

### ❌ Erro: "Banco de dados não acessível"

**Causa:** `DATABASE_URL` não configurada ou incorreta

**Solução:**
1. Vá em **"Variables"** do service scheduler
2. Verifique se `DATABASE_URL` está configurada
3. Copie a mesma `DATABASE_URL` do service Python principal
4. Se usar Supabase, use `DIRECT_URL` (porta 5432, não 6543)

---

### ❌ Erro: "can't open file '/app/scripts/scheduler_worker.py': No such file or directory"

**Causa:** Root Directory não configurado ou incorreto

**Solução:**
1. Vá em **"Settings"** → **"Source"** (ou **"Root Directory"**)
2. Configure **Root Directory** como: `ai-service`
3. Salve e faça redeploy
4. O Railway vai procurar o arquivo em: `ai-service/scripts/scheduler_worker.py`

---

### ❌ Erro: "ModuleNotFoundError: No module named 'utils'"

**Causa:** Root Directory incorreto ou caminho do comando errado

**Solução:**
1. Vá em **"Settings"** → **"Source"**
2. Configure **Root Directory** como: `ai-service`
3. Verifique se o **Start Command** está como: `python scripts/scheduler_worker.py` (não `python ai-service/scripts/scheduler_worker.py`)
4. Faça redeploy

---

### ❌ Scheduler não executa jobs

**Causa:** Nenhum job registrado (comportamento esperado por padrão)

**Solução:**
- Por padrão, o scheduler não tem jobs agendados
- Os ETLs são executados manualmente via endpoints admin
- Se quiser agendar ETLs automáticos, edite `scripts/scheduler_worker.py` e adicione jobs na função `register_etl_jobs()`

---

### ❌ Múltiplas execuções do mesmo job

**Causa:** Mais de 1 réplica configurada

**Solução:**
1. Vá em **"Settings"** → **"Resources"**
2. Configure **Replicas** como **1**
3. Faça redeploy

---

## 📊 Comparação: Service vs Job

| Característica | Service | Job |
|----------------|---------|-----|
| **Execução** | Contínua (roda sempre) | Uma vez e para |
| **Ideal para** | Scheduler, APIs, Workers | Tarefas únicas, scripts |
| **Custo** | Cobrado por hora | Cobrado por execução |
| **Recomendação** | ✅ **Use Service** | ❌ Não ideal para scheduler |

**Conclusão:** Use **Service** para o scheduler worker.

---

## 🎯 Resumo Rápido

1. ✅ Criar novo **Service** no Railway
2. ✅ Conectar ao mesmo **GitHub Repo** do serviço Python
3. ✅ Mudar **Start Command** para: `python scripts/scheduler_worker.py`
4. ✅ Copiar **variáveis de ambiente** do serviço Python principal
5. ✅ Configurar **1 réplica apenas**
6. ✅ Verificar **logs** para confirmar que está rodando

---

## 📚 Próximos Passos

Depois de configurar o scheduler:

1. **Adicionar jobs agendados** (opcional):
   - Edite `scripts/scheduler_worker.py`
   - Adicione jobs na função `register_etl_jobs()`
   - Exemplo:
     ```python
     schedule.every(6).hours.do(lambda: run_market_etl())
     ```

2. **Monitorar logs regularmente**:
   - Verifique se o worker está rodando
   - Monitore erros nos logs

3. **Otimizar recursos** (se necessário):
   - Se o scheduler usar muita CPU/RAM, ajuste os recursos
   - Por padrão, 0.5 vCPU e 512MB são suficientes

---

**Última atualização:** Dezembro 2025  
**Dúvidas?** Verifique os logs ou consulte a documentação do Railway.
