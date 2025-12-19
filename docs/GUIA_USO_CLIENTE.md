# 📖 Guia de Uso - Agro-AI Prototype

Guia completo para usar a plataforma Agro-AI como cliente final.

---

## 🚀 Primeiros Passos

### 1. Acessar a Plataforma

1. Acesse a URL da aplicação (ex: `https://agro-ai.vercel.app`)
2. Faça login com suas credenciais
3. Você será redirecionado para o **Mapa de Oportunidades**

---

## 🗺️ Mapa de Oportunidades

### Visualização

O mapa mostra oportunidades de arbitragem como marcadores:
- **Verde**: Oportunidades com ROI alto
- **Amarelo**: Oportunidades com ROI médio
- **Vermelho**: Oportunidades com ROI baixo ou risco alto

### Interagir com o Mapa

1. **Zoom**: Use scroll do mouse ou botões +/- para aproximar/afastar
2. **Arrastar**: Clique e arraste para mover o mapa
3. **Marcadores**: Clique em um marcador para ver detalhes da oportunidade
4. **Clusters**: Marcadores próximos são agrupados automaticamente

### Filtros Avançados

Use a **Sidebar** (painel lateral) para filtrar oportunidades:

#### Filtros de ROI
- **ROI Mínimo**: Filtra oportunidades com ROI acima do valor
- **ROI Máximo**: Filtra oportunidades com ROI abaixo do valor

#### Filtros Geográficos
- **Estados**: Selecione estados específicos (ex: SP, MG, RJ)
- **Chuva**: Filtra por faixa de chuva acumulada

#### Filtros de Produto
- **Produtos**: Selecione produtos específicos (ex: Tomate, Soja, Milho)
- **Safras**: Filtra por época de safra (verão, outono, inverno, primavera)
- **Época de Plantio**: Filtra por época recomendada de plantio (ZARC)

#### Filtros de Risco
- **Nível de Risco**: Baixo, Médio, Alto

**Dica:** Os filtros são salvos automaticamente no navegador!

---

## 💬 Assistente Agronômico (Chat RAG)

### Como Usar

1. Clique na aba **"Chat Agronômico"** no menu superior
2. Digite sua pergunta sobre cultivo, clima, armazenagem, etc.
3. O assistente responderá baseado em documentos técnicos científicos

### Exemplos de Perguntas

- "Qual a temperatura ideal para cultivo de tomate?"
- "Quais são os custos de armazenagem de tomate?"
- "Qual a melhor época de plantio em São Paulo?"
- "Como calcular perdas durante armazenagem?"
- "Quais são os riscos climáticos para tomate?"

### Funcionalidades

- ✅ Respostas baseadas em documentos técnicos (Embrapa, UFG, ZARC)
- ✅ Citações de fontes (PDF, página)
- ✅ Contexto agronômico específico para tomate
- ✅ Linguagem natural e acessível

---

## 📊 Dashboard de Oportunidades

### Visualização

O dashboard mostra:
- **Tabela de Oportunidades**: Lista todas as oportunidades filtradas
- **Gráficos de Tendência**: Histórico de preços
- **Estatísticas**: ROI médio, total de oportunidades, etc.

### Ações Disponíveis

1. **Ordenar**: Clique nos cabeçalhos da tabela para ordenar
2. **Filtrar**: Use os filtros da sidebar
3. **Detalhes**: Clique em uma oportunidade para ver mais informações

---

## 🌡️ Análise Climática

### Aba Clima

Na aba **"Clima"**, você pode:

1. **Selecionar uma Oportunidade**: Clique em uma oportunidade no mapa
2. **Ver Dados Climáticos**:
   - Temperatura (máxima, mínima, média)
   - Chuva acumulada
   - Radiação solar
   - Eventos extremos (granizo, ciclones, etc.)

3. **Comparar Anos**: Veja comparação com ano anterior
4. **Previsões**: Visualize previsões climáticas para os próximos dias

---

## 💰 Simuladores

### Simulador de Produção

1. Acesse a aba **"Simulador"**
2. Preencha os campos:
   - Produto
   - Área (hectares)
   - Estado
   - Mês de plantio
3. Clique em **"Calcular"**
4. Veja o ROI estimado e análise detalhada

### Simulador de Arbitragem

1. No simulador, selecione **"Arbitragem"**
2. Preencha:
   - Origem (estado)
   - Destino (estado)
   - Produto
   - Área
3. Clique em **"Calcular"**
4. Veja ROI de arbitragem interestadual

---

## 🔍 Dicas de Uso

### Performance

- **Cache**: Dados são cacheados automaticamente (5 minutos)
- **Paginação**: Listas grandes são paginadas automaticamente
- **Filtros**: Use filtros para reduzir o número de oportunidades exibidas

### Filtros Salvos

- Os filtros são salvos automaticamente no navegador
- Ao recarregar a página, seus filtros são restaurados
- Use **"Limpar Filtros"** para resetar tudo

### Previsões de Preço

- As previsões usam **Prophet** (IA) quando há dados suficientes
- Fallback automático quando dados são insuficientes
- Previsões de 7 e 30 dias disponíveis

### Análise de Risco

- **Risco Baixo**: Condições climáticas favoráveis
- **Risco Médio**: Algumas condições desfavoráveis
- **Risco Alto**: Múltiplas condições desfavoráveis ou eventos extremos

---

## ❓ Perguntas Frequentes

### Como atualizar os dados de preços?

Os dados são atualizados automaticamente via ETL. Administradores podem iniciar ETL manualmente.

### As previsões são confiáveis?

As previsões usam Prophet (Facebook) quando há dados históricos suficientes (≥30 registros). Caso contrário, usa fallback baseado em tendência simples.

### Posso exportar os dados?

Funcionalidade de exportação está planejada para versões futuras.

### Como funciona o chat agronômico?

O chat usa RAG (Retrieval Augmented Generation):
1. Sua pergunta é convertida em vetor (embedding)
2. O sistema busca documentos similares no banco
3. Um LLM (GPT-4o-mini) gera resposta baseada nos documentos encontrados

### Os dados são atualizados em tempo real?

- **Preços CEASA**: Atualizados via ETL (horários agendados)
- **Clima**: Atualizados em tempo real via APIs externas
- **Dólar**: Atualizado em tempo real via AwesomeAPI

---

## 🆘 Suporte

### Problemas Comuns

**Mapa não carrega:**
- Verifique sua conexão com internet
- Recarregue a página (F5)

**Chat não responde:**
- Verifique se o serviço de IA está online
- Tente novamente em alguns segundos

**Filtros não funcionam:**
- Limpe os filtros e tente novamente
- Recarregue a página

### Contato

Para suporte técnico, entre em contato com a equipe de desenvolvimento.

---

**Última atualização:** Dezembro 2025

