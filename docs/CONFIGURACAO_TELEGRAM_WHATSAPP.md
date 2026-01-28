# 📱 Configuração de Alertas Telegram e WhatsApp

Este guia explica como configurar os alertas via Telegram e WhatsApp no sistema Agro-AI.

---

## 🔵 Telegram

### 1. Criar Bot no Telegram

1. Abra o Telegram e procure por **@BotFather**
2. Envie o comando `/newbot`
3. Siga as instruções para criar um bot:
   - Escolha um nome para o bot (ex: "Agro-AI Alertas")
   - Escolha um username (ex: "agro_ai_alertas_bot")
4. O BotFather retornará um **token** (ex: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)
5. **Copie este token** - você precisará dele

### 2. Configurar Token no Backend

Adicione o token no arquivo `backend/.env`:

```env
TELEGRAM_BOT_TOKEN=seu_token_aqui
```

### 3. Conectar seu Telegram

1. No frontend, acesse a seção de **Alertas**
2. Clique em **Configurar Telegram**
3. Abra o Telegram e procure pelo bot (username que você criou)
4. Inicie uma conversa e envie `/start`
5. O bot retornará seu **Chat ID** (ex: `123456789`)
6. Copie o Chat ID e cole no campo do frontend
7. Clique em **Testar Conexão** para verificar

### 4. Testar

Após configurar, você pode:
- Enviar uma mensagem de teste pelo frontend
- Criar um alerta e verificar se recebe notificações

---

## 🟢 WhatsApp (via Twilio)

### 1. Criar Conta no Twilio

1. Acesse [https://www.twilio.com](https://www.twilio.com)
2. Crie uma conta (há plano gratuito para testes)
3. Após criar a conta, você receberá:
   - **Account SID** (ex: `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)
   - **Auth Token** (ex: `seu_auth_token_aqui`)

### 2. Configurar WhatsApp Sandbox (Testes)

1. No painel do Twilio, vá em **Messaging** > **Try it out** > **Send a WhatsApp message**
2. Siga as instruções para conectar seu número ao WhatsApp Sandbox
3. Você receberá um número do Twilio (ex: `whatsapp:+14155238886`)

### 3. Configurar Variáveis no Backend

Adicione no arquivo `backend/.env`:

```env
TWILIO_ACCOUNT_SID=seu_account_sid_aqui
TWILIO_AUTH_TOKEN=seu_auth_token_aqui
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

### 4. Conectar seu WhatsApp

1. No frontend, acesse a seção de **Alertas**
2. Clique em **Configurar WhatsApp**
3. Digite seu número no formato internacional (ex: `+5511999999999`)
4. Clique em **Testar Conexão**
5. Você receberá uma mensagem de teste no WhatsApp

### 5. Produção (Opcional)

Para usar em produção (fora do sandbox):
1. Solicite aprovação do número no Twilio
2. Configure o número aprovado em `TWILIO_WHATSAPP_NUMBER`

---

## ✅ Verificação

### Verificar se está configurado

1. Acesse `/api/alerts/config` (requer autenticação)
2. Verifique os campos:
   - `telegramConfigured`: `true` se Telegram está configurado
   - `whatsappConfigured`: `true` se WhatsApp está configurado
   - `telegramChatId`: Seu Chat ID do Telegram (se configurado)
   - `phone`: Seu número de WhatsApp (se configurado)

### Testar Envio

**Telegram:**
```bash
POST /api/alerts/telegram/test
{
  "chatId": "123456789"
}
```

**WhatsApp:**
```bash
POST /api/alerts/whatsapp/test
{
  "phone": "+5511999999999"
}
```

---

## 🔧 Troubleshooting

### Telegram não envia mensagens

1. Verifique se `TELEGRAM_BOT_TOKEN` está configurado no `.env`
2. Verifique se o Chat ID está correto
3. Verifique se você iniciou conversa com o bot (`/start`)
4. Verifique os logs do backend para erros

### WhatsApp não envia mensagens

1. Verifique se todas as variáveis Twilio estão configuradas
2. Verifique se o número está no formato correto (`+5511999999999`)
3. Verifique se você conectou seu número ao Sandbox do Twilio
4. Verifique os logs do backend para erros
5. No Twilio, verifique se há créditos disponíveis

### Mensagens não chegam

1. Verifique se os alertas estão ativos (`isActive: true`)
2. Verifique se o canal está selecionado no alerta (`channels: ["telegram"]` ou `["whatsapp"]`)
3. Verifique se o cronjob está rodando (a cada 30 minutos)
4. Verifique os logs do backend: `docker compose logs backend | grep -i alert`

---

## 📝 Notas Importantes

- **Telegram**: Gratuito e ilimitado
- **WhatsApp**: Requer conta Twilio (há plano gratuito para testes)
- **Email**: Placeholder - implementar com SendGrid/AWS SES no futuro
- Os alertas são verificados a cada 30 minutos (configurável via `ALERT_CHECK_SCHEDULE`)

---

## 🔐 Segurança

- **NUNCA** commite tokens ou chaves no repositório
- Use variáveis de ambiente para todas as configurações sensíveis
- Mantenha os tokens seguros e rotacione periodicamente





