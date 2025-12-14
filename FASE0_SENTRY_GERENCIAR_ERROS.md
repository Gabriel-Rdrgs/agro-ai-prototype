# 🐛 Como Gerenciar Erros no Sentry

**Guia rápido para entender e gerenciar erros no dashboard do Sentry**

---

## 📋 ENTENDENDO A LISTA DE ERROS

### **O que você está vendo:**

Na lista de erros do Sentry, você vê:
- **Issue:** Tipo e descrição do erro
- **Last Seen:** Quando o erro foi visto pela última vez
- **Age:** Há quanto tempo o erro foi detectado pela primeira vez
- **Trend:** Gráfico mostrando a frequência do erro
- **Events:** Quantas vezes o erro ocorreu
- **Status:** `Unhandled` (não tratado) ou `Resolved` (resolvido)

### **Status dos Erros:**

- **New:** Erro novo (apareceu recentemente)
- **Ongoing:** Erro contínuo (ainda está acontecendo)
- **Resolved:** Erro resolvido (não aparece mais)

---

## ✅ COMO RESOLVER/MARCAR ERROS COMO RESOLVIDOS

### **Opção 1: Marcar como Resolvido (Recomendado)**

1. **Clique no erro** na lista (ex: "TypeError | Cannot read properties of undefined")
2. Na página de detalhes do erro, você verá:
   - Stack trace completo
   - Quando ocorreu
   - Contexto (ambiente, release, etc.)
3. **No topo da página**, procure pelo botão **"Resolve"** (ou **"Resolver"**)
4. Clique em **"Resolve"**
5. O erro será marcado como resolvido e não aparecerá mais na lista principal

**Quando usar:** Quando você corrigiu o código e o erro não está mais acontecendo.

---

### **Opção 2: Arquivar (Se o Erro Não é Mais Relevante)**

1. Clique no erro
2. Procure pelo botão **"Archive"** (ou **"Arquivar"**)
3. Clique em **"Archive"**
4. O erro será arquivado (não aparece na lista principal, mas pode ser recuperado)

**Quando usar:** Quando o erro não é mais relevante ou foi causado por código antigo que não existe mais.

---

### **Opção 3: Ignorar (Temporariamente)**

1. Clique no erro
2. Procure por **"Ignore"** ou **"Ignorar"**
3. Configure por quanto tempo ignorar (ex: "1 semana", "1 mês")
4. O erro não aparecerá na lista durante esse período

**Quando usar:** Quando você sabe que o erro existe mas não é crítico e vai resolver depois.

---

## 🔍 VERIFICAR SE O ERRO AINDA ESTÁ ACONTECENDO

### **Passo 1: Verificar "Last Seen"**

- Se o **"Last Seen"** é **muito recente** (ex: "7min ago", "17min ago"), o erro **ainda está acontecendo**
- Se o **"Last Seen"** é **antigo** (ex: "2 hours ago", "1 day ago"), o erro **provavelmente parou**

### **Passo 2: Verificar o Trend (Gráfico)**

- **Linha plana com spike no final:** Erro novo que apareceu recentemente
- **Linha crescente:** Erro contínuo (ainda está acontecendo)
- **Linha decrescente:** Erro está diminuindo (pode ter sido corrigido)

### **Passo 3: Verificar os Logs do Backend**

```bash
# Ver os logs mais recentes do backend
docker compose logs backend --tail 50

# Procurar por erros relacionados
docker compose logs backend | grep -i "error\|undefined\|cannot read"
```

---

## 🛠️ O QUE FAZER COM OS ERROS ATUAIS

### **Cenário 1: Erros Ainda Estão Acontecendo**

Se o **"Last Seen"** é recente (ex: "7min ago"):

1. **NÃO marque como resolvido ainda**
2. Verifique os logs do backend:
   ```bash
   docker compose logs backend --tail 100
   ```
3. Procure por mensagens de erro relacionadas
4. Se o backend está funcionando normalmente, pode ser um erro antigo que ainda aparece no Sentry
5. Aguarde alguns minutos e verifique se novos eventos aparecem

### **Cenário 2: Erros Pararam de Acontecer**

Se o **"Last Seen"** é antigo (ex: "1 hour ago") e o backend está funcionando:

1. **Marque como Resolvido:**
   - Clique no erro
   - Clique em **"Resolve"**
   - Confirme

2. **Ou Arquivar:**
   - Clique no erro
   - Clique em **"Archive"**
   - Confirme

---

## 📊 INTERPRETANDO OS ERROS DA SUA LISTA

### **Erro 1: "AGRO-AI-BACKEND-3" (2 eventos, 7min ago)**
- **Status:** `New` (novo)
- **Ação:** Verificar se ainda está acontecendo. Se não, marcar como resolvido.

### **Erro 2: "AGRO-AI-BACKEND-1" (6 eventos, 17min ago)**
- **Status:** `Ongoing` (contínuo)
- **Ação:** Este parece ser o mais crítico. Verificar logs e código.

### **Erro 3: "AGRO-AI-BACKEND-2" (1 evento, 17min ago)**
- **Status:** `New` (novo)
- **Ação:** Verificar se ainda está acontecendo. Se não, marcar como resolvido.

---

## ✅ CHECKLIST RÁPIDO

1. [ ] Verificar logs do backend: `docker compose logs backend --tail 100`
2. [ ] Verificar se o backend está funcionando: `docker compose ps`
3. [ ] Aguardar 10-15 minutos e verificar se novos eventos aparecem no Sentry
4. [ ] Se não aparecerem novos eventos, marcar os erros como **"Resolved"**
5. [ ] Se aparecerem novos eventos, investigar o código

---

## 🆘 TROUBLESHOOTING

### **"Os erros ainda aparecem mesmo depois de corrigir"**

- Os erros no Sentry são **históricos** - eles mostram o que aconteceu no passado
- Se você corrigiu o código, **novos eventos não devem aparecer**
- Marque os erros antigos como **"Resolved"** para limpar a lista

### **"Como saber se o erro ainda está acontecendo?"**

1. Verifique o **"Last Seen"** - se é muito recente, ainda está acontecendo
2. Verifique o **Trend** - se a linha está subindo, ainda está acontecendo
3. Verifique os **logs do backend** - procure por mensagens de erro

### **"Devo marcar todos como resolvidos?"**

- **SIM**, se você corrigiu o código e não aparecem novos eventos há mais de 15-30 minutos
- **NÃO**, se o "Last Seen" é muito recente (menos de 5 minutos)

---

## 📝 PRÓXIMOS PASSOS RECOMENDADOS

1. **Agora:** Verificar logs do backend para confirmar que não há erros ativos
2. **Aguardar 15 minutos:** Verificar se novos eventos aparecem no Sentry
3. **Se não aparecerem:** Marcar todos os erros como "Resolved"
4. **Se aparecerem:** Investigar o código e corrigir

---

**Última atualização:** Dezembro 2025
