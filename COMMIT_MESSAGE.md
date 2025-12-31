feat: Adiciona suporte a múltiplas culturas e melhora visualização do mapa

🌾 Adiciona 20 maiores produtores de soja
- Coordenadas geográficas para todos os municípios
- Preços regionais por estado (MT, BA, GO, MS)
- Script auxiliar: backend/scripts/add_soybean_producers.js

🗺️ Melhora visualização do mapa
- Ícones diferenciados por produto (🍅 Tomate, 🌾 Soja, 🌽 Milho)
- Clustering otimizado com cores dinâmicas por cultura
- Legenda atualizada com produtos e ROI
- Filtro de produtos no Sidebar com checkboxes visuais

📊 Impacto
- Sistema suporta múltiplas culturas sem poluir o mapa
- UX mais clara e intuitiva
- Melhor performance com clustering otimizado

📝 Arquivos modificados
- backend/prisma/seed.js
- backend/scripts/add_soybean_producers.js (novo)
- frontend/src/data/mapIcons.js
- frontend/src/components/Map/MapView.jsx
- frontend/src/components/Sidebar/Sidebar.jsx
- PLANEJAMENTO_COMPLETO.md

🚀 Para adicionar soja ao banco: node backend/scripts/add_soybean_producers.js

