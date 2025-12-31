# Google Maps Distance Matrix API

**Versão:** 1.0  
**Última Atualização:** Dezembro 2025  
**Status:** Implementado e Pronto para Ativação

---

## 1. Visão Geral

O sistema está preparado para usar Google Maps Distance Matrix API, mas funciona perfeitamente sem ele usando o cálculo Haversine como fallback.

### 1.1. Como Funciona Atualmente

**Sem `GOOGLE_MAPS_API_KEY` configurada:**
- Sistema usa Haversine (cálculo matemático de distância em linha reta)
- Aplica fator de sinuosidade (1.35x) para aproximar distância real
- Funciona 100% sem custos adicionais

**Com `GOOGLE_MAPS_API_KEY` configurada:**
- Sistema usa Google Maps Distance Matrix API (distâncias reais de rota)
- Mais preciso para cálculo de frete e tempo de viagem
- Fallback automático para Haversine se API falhar

---

## 2. Implementação

### 2.1. Serviço de Distance Matrix

**Arquivo:** `ai-service/services/distance_matrix.py`

**Funcionalidades:**
- Rate limiting (10 req/s)
- Retry com backoff exponencial
- Cache em memória (30 dias)
- Fallback automático para Haversine

**Classe Principal:**
```python
class DistanceMatrixService:
    def get_distance_matrix(
        self,
        origin: Tuple[float, float],  # (lat, lng)
        destination: Tuple[float, float],  # (lat, lng)
        mode: str = 'driving',
        avoid: Optional[str] = None,
        traffic_model: Optional[str] = None
    ) -> Dict:
        """
        Returns:
            {
                'distance_km': float,
                'duration_seconds': int,
                'duration_text': str,
                'status': str,
                'cached': bool
            }
        """
```

### 2.2. Integração com Logistics

**Arquivo:** `ai-service/services/logistics.py`

**Comportamento:**
- Usa `distance_matrix_service` se chave disponível
- Fallback automático para Haversine se não houver chave
- Logs indicam qual método foi usado

---

## 3. Custos e Limites

### 3.1. Créditos Gratuitos

- **$200 USD em créditos gratuitos por mês** (equivalente a ~28.000 carregamentos de mapa)

### 3.2. Principais APIs e Custos

#### Distance Matrix API (Crítico para Cálculo de Frete)

- **Distância e tempo:** $5 por 1.000 requisições
- **Com tráfego:** $7 por 1.000 requisições
- **Permite múltiplas origens/destinos:** Até 25 origens × 25 destinos por requisição
- **Retorna:** Distância real de rota (não linha reta), tempo de viagem, status da rota

#### Outras APIs

- **Maps JavaScript API:** $7 por 1.000 carregamentos
- **Places API:** $32 por 1.000 requisições (Text Search)
- **Geocoding API:** $5 por 1.000 requisições
- **Directions API:** $5 por 1.000 requisições (rota simples)

### 3.3. Estimativa de Custos

**Cenário Conservador (100 usuários ativos/dia):**
- Distance Matrix: ~1.000/mês → **GRÁTIS** (dentro dos créditos)

**Cenário Médio (500 usuários ativos/dia):**
- Distance Matrix: ~5.000/mês → **GRÁTIS**

**Cenário Alto (2.000+ usuários/dia):**
- Distance Matrix: ~60.000/mês → **~$300/mês** (após créditos)

---

## 4. Ativação

### 4.1. Checklist de Ativação

#### Passo 1: Obter a Chave da API

1. Acesse [Google Cloud Console](https://console.cloud.google.com)
2. Crie um projeto ou selecione existente
3. Ative Distance Matrix API
4. Gere a chave de API
5. Configure restrições de segurança (recomendado)

**Tempo estimado:** 15-20 minutos

#### Passo 2: Adicionar ao Ambiente

**Opção A: Railway (Produção)**

1. Acesse Railway: https://railway.app/
2. Vá em **AI Service** → **Variables**
3. Adicione:
   - **Nome:** `GOOGLE_MAPS_API_KEY`
   - **Valor:** `sua_chave_aqui`
4. O serviço reiniciará automaticamente

**Opção B: Local (.env)**

1. Abra `ai-service/.env`
2. Adicione:
   ```env
   GOOGLE_MAPS_API_KEY=sua_chave_aqui
   ```
3. Reinicie o serviço Python

**Tempo estimado:** 2 minutos

#### Passo 3: Verificar Funcionamento

1. Execute um cálculo de frete no sistema
2. Verifique os logs do AI Service:
   ```bash
   # Deve aparecer:
   ✅ Distância calculada via Google Maps: 850.23 km
   ```
3. Se aparecer `⚠️ Distância calculada via Haversine`, verifique a chave

---

## 5. Comparação: Haversine vs Google Maps

### 5.1. Precisão

| Método | Precisão | Quando Usar |
|--------|----------|-------------|
| **Haversine** | ±10-15% (linha reta × 1.35) | Desenvolvimento, testes, baixo volume |
| **Google Maps** | ±2-5% (rota real) | Produção, cálculos críticos, alto volume |

### 5.2. Performance

| Método | Latência | Custo |
|--------|----------|-------|
| **Haversine** | <1ms (cálculo local) | Grátis |
| **Google Maps** | 50-200ms (API externa) | $5 por 1.000 requisições |

### 5.3. Exemplo Prático

**Rota:** São Paulo, SP → Belo Horizonte, MG

- **Haversine:** ~580 km (linha reta × 1.35)
- **Google Maps:** ~585 km (rota real)
- **Diferença:** ~1% (margem aceitável para maioria dos casos)

**Rota:** Manaus, AM → Porto Alegre, RS

- **Haversine:** ~3.200 km (linha reta × 1.35)
- **Google Maps:** ~3.800 km (rota real com estradas)
- **Diferença:** ~19% (significativo para cálculos de frete)

---

## 6. Configuração de Restrições

### 6.1. Restrições de Aplicativo (Recomendado)

1. Acesse Google Cloud Console → APIs & Services → Credentials
2. Clique na chave de API
3. Em "Application restrictions", selecione:
   - **HTTP referrers (web sites)**: Adicione domínios permitidos
   - **IP addresses (web servers)**: Adicione IPs do Railway (se conhecidos)

### 6.2. Restrições de API

1. Em "API restrictions", selecione:
   - **Restrict key**: Marque apenas "Distance Matrix API"
   - Isso evita uso não autorizado de outras APIs

---

## 7. Monitoramento de Uso

### 7.1. Google Cloud Console

1. Acesse APIs & Services → Dashboard
2. Veja métricas de uso:
   - Requisições por dia
   - Custos acumulados
   - Erros e limites

### 7.2. Logs do Sistema

O sistema loga cada requisição:
```python
logger.info(f"✅ Distância calculada via Google Maps: {distance_km} km")
logger.warning(f"⚠️ Distância calculada via Haversine (fallback)")
```

---

## 8. Troubleshooting

### 8.1. Erro: "API key not valid"

**Causa:** Chave inválida ou restrições muito restritivas

**Solução:**
1. Verifique se a chave está correta
2. Verifique restrições de aplicativo/IP
3. Verifique se Distance Matrix API está ativada

### 8.2. Erro: "OVER_QUERY_LIMIT"

**Causa:** Limite de requisições excedido

**Solução:**
1. Verifique rate limiting (10 req/s)
2. Aumente cache TTL se necessário
3. Considere upgrade do plano Google Cloud

### 8.3. Sistema Usando Haversine Mesmo com Chave Configurada

**Causa:** Chave não está sendo lida corretamente

**Solução:**
1. Verifique variável de ambiente `GOOGLE_MAPS_API_KEY`
2. Reinicie o serviço Python
3. Verifique logs para mensagens de erro

---

## 9. Alternativas Futuras

### 9.1. Routes API (Recomendação Google)

**Status:** Distance Matrix API está em status LEGACY

**Migração Futura:**
- Google recomenda migrar para Routes API
- Mais recursos (pedágios, rotas otimizadas)
- Mesma estrutura de custos

### 9.2. OpenRouteService (Open Source)

**Alternativa Gratuita:**
- API open source baseada em OpenStreetMap
- Sem custos (com limites de uso)
- Precisão similar ao Google Maps

---

## 10. Referências

- [Guia Obter Google Maps API Key](./GUIA_OBTER_GOOGLE_MAPS_API_KEY.md) - Passo a passo detalhado
- [Implementação Distance Matrix](./IMPLEMENTACAO_DISTANCE_MATRIX.md) - Detalhes técnicos
- [Pesquisa Google Maps](./PESQUISA_GOOGLE_MAPS.md) - Análise de custos e alternativas
- [Análise Exaustiva Google Maps](./ANALISE_EXAUSTIVA_GOOGLE_MAPS.md) - Análise completa

---

**Última atualização:** Dezembro 2025

