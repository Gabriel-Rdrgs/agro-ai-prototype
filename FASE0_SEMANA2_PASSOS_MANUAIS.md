# 📋 FASE 0 - Semana 2: Passos Manuais

**Guia passo a passo para configurar Sentry e testar GitHub Actions**

---

## 🐛 PARTE 1: CONFIGURAR SENTRY

### **Passo 1.1: Criar Conta no Sentry**

1. Acesse https://sentry.io
2. Clique em **"Sign Up"** (ou **"Get Started"**)
3. Escolha uma das opções:
   - **GitHub** (recomendado - mais rápido)
   - **Google**
   - **Email** (criar conta manualmente)
4. Complete o cadastro se necessário

---

### **Passo 1.2: Criar Projeto para Backend (Node.js)**

1. Após fazer login, você verá a tela inicial do Sentry
2. Clique em **"Create Project"** (ou **"New Project"**)
3. Selecione a plataforma: **"Node.js"**

4. **TELA 1: "Do you use a framework?"**
   - ✅ **Selecione: "Express"** (seu backend usa Express.js)
   - ⚠️ **NÃO selecione "Nope, Vanilla"** (isso é para Node.js puro)
   - Clique em **"Configure SDK"**

5. **TELA 2: "Set your alert frequency" e "Name your project"**
   
   **Seção "2 Set your alert frequency":**
   - ✅ **Marque: "I'll create my own alerts later"** (você pode configurar alertas depois)
   - Isso permite criar o projeto rapidamente e configurar alertas quando necessário
   
   **Seção "3 Name your project and assign it a team":**
   - **Project slug:** Já deve estar preenchido com `agro-ai-backend` ✅ (está correto)
   - **Team:** Confirme se está correto (ex: "GR #gabriel-rodrigues")
   - Clique em **"Create Project"**

6. **IMPORTANTE:** Na próxima tela, você verá instruções de instalação
   - **NÃO precisa seguir essas instruções** (já instalamos tudo!)
   - Role a página até encontrar a seção **"Configure your DSN"**
   - Você verá algo como: 'https://d86a9fbab48f4cf40a0412ec4e1bf818@o4510530634776576.ingest.us.sentry.io/4510530667675648'
   - **COPIE ESSE DSN** (você precisará dele depois)

7. Clique em **"Skip this onboarding"** (ou **"Continue"**) para pular as instruções

---

### **Passo 1.3: Criar Projeto para Frontend (React)**

1. No dashboard do Sentry, clique em **"Projects"** (menu lateral)
2. Clique em **"Create Project"** novamente
3. Selecione a plataforma: **"React"**

4. **TELA 1: "Do you use a framework?"**
   - Para React, geralmente não há essa pergunta (ou aparece "Create React App")
   - Se aparecer, selecione a opção mais adequada ao seu setup

5. **TELA 2: "Set your alert frequency" e "Name your project"**
   
   **Seção "2 Set your alert frequency":**
   - ✅ **Marque: "I'll create my own alerts later"** (mesma escolha do backend)
   
   **Seção "3 Name your project and assign it a team":**
   - **Project slug:** Preencha com `agro-ai-frontend`
   - **Team:** Selecione o mesmo time do backend
   - Clique em **"Create Project"**

6. **IMPORTANTE:** 'https://c0f4a1194d4ecb410c5392c61ed5a6db@o4510530634776576.ingest.us.sentry.io/4510530694086656' **"Configure your DSN"**
   - **COPIE ESSE DSN** (é diferente do backend!)

7. Clique em **"Skip this onboarding"**

---

### **Passo 1.4: Adicionar DSNs nos Arquivos .env**

#### **Backend:**

1. Abra o terminal e navegue até o backend:
   ```bash
   cd /home/soares/dev/agro-ai-prototype/backend
   ```

2. Abra o arquivo `.env`:
   ```bash
   nano .env
   # ou
   code .env
   ```

3. Adicione as linhas (substitua pelo DSN que você copiou):
   ```bash
   # Sentry (FASE 0 - Semana 2)
   SENTRY_DSN=https://seu-dsn-backend@xxxxx.ingest.sentry.io/xxxxx
   SENTRY_RELEASE=1.0.0
   ```

4. Salve o arquivo (Ctrl+X, depois Y, depois Enter no nano)

5. **Reinicie o backend** para aplicar as mudanças:
   ```bash
   # Se estiver rodando com Docker:
   docker compose restart backend
   
   # Se estiver rodando localmente:
   # Pare o servidor (Ctrl+C) e inicie novamente
   npm run dev
   ```

#### **Frontend:**

1. Abra o terminal e navegue até o frontend:
   ```bash
   cd /home/soares/dev/agro-ai-prototype/frontend
   ```

2. Abra o arquivo `.env.local` (ou crie se não existir):
   ```bash
   nano .env.local
   # ou
   code .env.local
   ```

3. Adicione as linhas (substitua pelo DSN do frontend):
   ```bash
   # Sentry (FASE 0 - Semana 2)
   REACT_APP_SENTRY_DSN=https://seu-dsn-frontend@xxxxx.ingest.sentry.io/xxxxx
   REACT_APP_SENTRY_RELEASE=1.0.0
   ```

4. Salve o arquivo

5. **Reinicie o frontend** para aplicar as mudanças:
   ```bash
   # Pare o servidor (Ctrl+C) e inicie novamente
   npm start
   ```

---

### **Passo 1.5: Testar Sentry (Opcional mas Recomendado)**

#### **Testar Backend:**

1. No terminal do backend, você deve ver:
   ```
   ✅ Sentry inicializado para backend
   ```

2. Para forçar um erro de teste, você pode criar uma rota temporária:
   ```javascript
   // Adicione temporariamente em server.js (depois remova!)
   app.get('/test-sentry', (req, res) => {
     throw new Error('Teste do Sentry - Backend');
   });
   ```

3. Acesse: `http://localhost:3001/test-sentry`
4. Verifique no dashboard do Sentry se o erro apareceu

#### **Testar Frontend:**

1. No console do navegador (F12), você deve ver:
   ```
   ✅ Sentry inicializado para frontend
   ```

2. Para forçar um erro de teste, adicione temporariamente em `App.js`:
   ```javascript
   // Adicione temporariamente (depois remova!)
   useEffect(() => {
     throw new Error('Teste do Sentry - Frontend');
   }, []);
   ```

3. Recarregue a página
4. Verifique no dashboard do Sentry se o erro apareceu

---

## 🚀 PARTE 2: TESTAR GITHUB ACTIONS

### **Passo 2.1: Verificar se o Arquivo Existe**

1. Verifique se o arquivo `.github/workflows/test.yml` existe:
   ```bash
   cd /home/soares/dev/agro-ai-prototype
   ls -la .github/workflows/test.yml
   ```

2. Se existir, você verá algo como:
   ```
   -rw-rw-r-- 1 soares soares 1234 dez 13 22:00 .github/workflows/test.yml
   ```

---

### **Passo 2.2: Fazer Commit e Push**

1. Verifique o status do git:
   ```bash
   git status
   ```

2. Adicione os arquivos novos:
   ```bash
   git add .
   ```

3. Faça um commit:
   ```bash
   git commit -m "feat: FASE 0 Semana 2 - Sentry, Logging e GitHub Actions"
   ```

4. Faça push:
   ```bash
   git push origin main
   # ou
   git push origin develop
   ```

---

### **Passo 2.3: Verificar Pipeline no GitHub**

1. Acesse seu repositório no GitHub:
   ```
   https://github.com/seu-usuario/agro-ai-prototype
   ```

2. Clique na aba **"Actions"** (no topo do repositório)

3. Você verá uma lista de workflows executados
   - O mais recente deve estar rodando ou já ter terminado
   - Status: 🟡 **Amarelo** (em execução) ou 🟢 **Verde** (sucesso) ou 🔴 **Vermelho** (erro)

4. Clique no workflow mais recente para ver os detalhes

5. Você verá os jobs:
   - `backend-test` (Backend Tests)
   - `frontend-test` (Frontend Tests)
   - `python-check` (Python Service Check)

6. Clique em cada job para ver os logs detalhados

---

### **Passo 2.4: Interpretar Resultados**

#### **✅ Se tudo estiver verde:**
- Parabéns! O pipeline está funcionando
- Você pode verificar os logs para confirmar que tudo passou

#### **⚠️ Se houver avisos (amarelo):**
- Normal! Alguns testes podem ter avisos (ex: ESLint warnings)
- O pipeline ainda passa, mas você pode corrigir os avisos depois

#### **❌ Se houver erros (vermelho):**
- Clique no job que falhou
- Veja os logs para identificar o problema
- Erros comuns:
  - Dependências faltando (execute `npm install` localmente)
  - Erros de sintaxe no código
  - Problemas com Prisma (verifique `DATABASE_URL` nos secrets do GitHub)

---

## 📊 PARTE 3: AJUSTAR NÍVEL DE LOG (OPCIONAL)

### **Passo 3.1: Entender os Níveis de Log**

Os níveis disponíveis (do mais crítico ao menos crítico):
- `error` - Apenas erros
- `warn` - Avisos e erros
- `info` - Informações, avisos e erros
- `http` - Requisições HTTP, informações, avisos e erros
- `debug` - Tudo (mais verboso)

**Padrão:**
- **Desenvolvimento:** `debug` (mostra tudo)
- **Produção:** `info` (mostra apenas o essencial)

---

### **Passo 3.2: Configurar LOG_LEVEL**

1. Abra o arquivo `.env` do backend:
   ```bash
   cd /home/soares/dev/agro-ai-prototype/backend
   nano .env
   ```

2. Adicione ou modifique a linha:
   ```bash
   # Logging (FASE 0 - Semana 2)
   LOG_LEVEL=debug  # ou info, warn, error
   ```

3. Salve o arquivo

4. Reinicie o backend para aplicar

---

### **Passo 3.3: Verificar Logs**

1. Em desenvolvimento, os logs aparecem no console (coloridos)
2. Em produção, os logs são salvos em:
   - `backend/logs/error.log` (apenas erros)
   - `backend/logs/combined.log` (todos os logs)

3. Para ver os logs em tempo real:
   ```bash
   # Erros
   tail -f backend/logs/error.log
   
   # Todos os logs
   tail -f backend/logs/combined.log
   ```

---

## ✅ CHECKLIST FINAL

- [ ] Conta criada no Sentry
- [ ] Projeto Backend criado no Sentry
- [ ] Projeto Frontend criado no Sentry
- [ ] DSN do Backend adicionado ao `.env` do backend
- [ ] DSN do Frontend adicionado ao `.env.local` do frontend
- [ ] Backend reiniciado e mostrando "✅ Sentry inicializado"
- [ ] Frontend reiniciado e mostrando "✅ Sentry inicializado" no console
- [ ] Commit e push feitos
- [ ] GitHub Actions executado com sucesso (verde)
- [ ] (Opcional) LOG_LEVEL configurado

---

## 🆘 TROUBLESHOOTING

### **Sentry não inicializa:**
- Verifique se o DSN está correto (sem espaços, sem quebras de linha)
- Verifique se reiniciou o servidor após adicionar o DSN
- Verifique os logs do console para mensagens de erro

### **GitHub Actions falha:**
- Verifique se todos os arquivos foram commitados
- Verifique os logs do GitHub Actions para identificar o erro
- Teste localmente executando os mesmos comandos (ex: `npm run lint`)

### **Logs não aparecem:**
- Verifique se `LOG_LEVEL` está configurado corretamente
- Verifique se o diretório `backend/logs/` existe
- Verifique permissões de escrita no diretório

---

**Última atualização:** Dezembro 2025
