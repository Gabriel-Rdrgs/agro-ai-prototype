# TÍTULO DO COMMIT (primeira linha):

fix(security): adiciona Helmet.js, rate limiting e validação de env vars

---

# DESCRIÇÃO DO COMMIT (corpo da mensagem):

🛡️ Segurança e Confiabilidade - ONDA 1: Correções Críticas

## 🔒 Melhorias de Segurança

### Helmet.js (CRIT-010)
- Adiciona security headers HTTP (X-Content-Type-Options, X-Frame-Options, etc.)
- Content Security Policy configurada para APIs externas
- Proteção contra XSS, clickjacking e outros ataques comuns

### Rate Limiting (CRIT-003)
- Proteção geral: 100 requisições/15min por IP
- Proteção para autenticação: 5 tentativas/15min por IP
- Aplicado em `/api/auth/login` e `/api/auth/refresh`
- Previne brute force e DDoS

### Validação de Variáveis de Ambiente (CRIT-004)
- Schema de validação com Zod
- Validação crítica no startup (falha rápida se faltar)
- Variáveis validadas: DATABASE_URL, JWT_SECRET, SUPABASE_URL, INTERNAL_API_KEY
- Em produção: falha imediatamente se configuração inválida
- Em desenvolvimento: avisa mas continua (facilita desenvolvimento)

## 🔧 Melhorias de Confiabilidade

### Graceful Shutdown (CRIT-008)
- Handlers para SIGTERM e SIGINT
- Fecha servidor HTTP adequadamente
- Desconecta Prisma antes de encerrar
- Fecha job queue se existir
- Handlers para erros não tratados (unhandledRejection, uncaughtException)

## 🧹 Limpeza

### Remoção de Arquivos Backup (CRIT-009)
- Remove Dockerfile.backup, Dockerfile.backup-worker, railway.backup.json
- Atualiza .gitignore com padrões: *.backup, *.backup.*, *_backup.*

## 📦 Dependências Adicionadas

- helmet: ^7.x (security headers)
- express-rate-limit: ^7.x (rate limiting)
- zod: ^3.x (validação de schemas)

## ✅ Validação

- Testes: 41/41 passando ✅
- Linting: Sem erros ✅
- Breaking changes: Nenhum ✅

## 📝 Arquivos Modificados

- backend/server.js (Helmet, rate limiting, graceful shutdown)
- backend/config/envValidation.js (novo arquivo)
- backend/package.json (dependências)
- .gitignore (padrões de backup)

## 🔍 Observação

CRIT-002 (Axios version): Verificado - versão 1.13.2 existe e é a mais recente no npm. Relatório estava desatualizado.

---

**Baseado em:** frontend/Relatório_Completo.md  
**ONDA:** 1/4 (Correções Críticas)  
**Próxima:** ONDA 2 (Melhorias de Performance)

