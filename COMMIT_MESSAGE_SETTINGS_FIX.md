# Mensagem de Commit - Correção Import Settings

## Título (curto)
```
fix(ai-service): corrige importação de settings no health router
```

## Descrição Completa
```
fix(ai-service): corrige importação de settings no health router

- Adiciona exportação direta de `settings` em `config/settings.py`
- Resolve ImportError: cannot import name 'settings' no Railway
- Mantém compatibilidade com `get_settings()` para outros módulos
- Corrige falha de inicialização do serviço AI no Railway

O erro ocorria porque `routers/health.py` tentava importar `settings`
diretamente, mas o módulo só exportava `get_settings()`. Agora ambos
os métodos de importação são suportados.
```

## Versão Curta (se preferir)
```
fix(ai-service): adiciona exportação direta de settings para compatibilidade

Resolve ImportError no Railway ao importar settings diretamente.
Mantém compatibilidade com get_settings() existente.
```

