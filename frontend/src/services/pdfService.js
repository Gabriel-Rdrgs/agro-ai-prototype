import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const PdfService = {
  // --- RELATÓRIO 1: CENÁRIO INDIVIDUAL (SIMULADOR) ---
  generateReport: (scenarioData, userName = 'Analista') => {
    const doc = new jsPDF('p', 'mm', 'a4');
    
    // Cores da marca
    const primaryColor = [0, 217, 255]; // #00d9ff
    const darkBg = [15, 23, 42]; // #0f172a
    
    // --- CABEÇALHO ---
    doc.setFillColor(...darkBg);
    doc.rect(0, 0, 210, 40, 'F'); // Fundo do header
    
    // Título
    doc.setTextColor(...primaryColor);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('AgroArbitrage AI', 14, 20);
    
    // Subtítulo
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Relatório de Viabilidade & Logística', 14, 28);
    
    // Data e Usuário
    const today = new Date().toLocaleDateString('pt-BR');
    doc.setFontSize(9);
    doc.text(`Gerado em: ${today}`, 196, 20, { align: 'right' });
    doc.text(`Responsável: ${userName}`, 196, 28, { align: 'right' });

    // Exibe cotação do dólar se houver
    if (scenarioData.currentDollar) {
        doc.text(`Cotação Base USD: R$ ${scenarioData.currentDollar.toFixed(4)}`, 196, 36, { align: 'right' });
    }

    // --- CORPO DO RELATÓRIO ---
    let yPos = 55;
    
    // 1. Definição da Operação
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('1. Definição da Operação', 14, yPos);
    
    yPos += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    doc.text(`Produto: ${scenarioData.input.product}`, 14, yPos);
    doc.text(`Volume: ${scenarioData.input.volume} toneladas`, 100, yPos);
    
    yPos += 7;
    doc.text(`Origem: ${scenarioData.origin?.name || 'Origem Padrão'}`, 14, yPos);
    doc.text(`Destino: ${scenarioData.input.destinationName}`, 100, yPos);
    
    yPos += 7;
    const dist = scenarioData.result.details?.distanceKm || 0;
    doc.text(`Distância Rodoviária Est.: ${Math.round(dist)} km`, 14, yPos);
// ========== NOVO: SEÇÃO DE COMBUSTÍVEL ==========
if (scenarioData.result.details?.fuel_breakdown) {
  yPos += 10;
  
  // Título da seção
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 150, 200);
  doc.text('⛽ Detalhamento de Combustível', 14, yPos);
  
  yPos += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  
  const fuel = scenarioData.result.details.fuel_breakdown;
  
  // Preços nas pontas
  doc.text(`Diesel Origem (${fuel.origin_price.state}): R$ ${fuel.origin_price.price_per_liter.toFixed(2)}/L`, 14, yPos);
  doc.text(`Diesel Destino (${fuel.dest_price.state}): R$ ${fuel.dest_price.price_per_liter.toFixed(2)}/L`, 110, yPos);
  
  yPos += 7;
  
  // Consumo
  doc.text(`Litros necessários: ${fuel.fuel_liters.toFixed(1)}L`, 14, yPos);
  doc.text(`Preço médio ponderado: R$ ${fuel.weighted_price_liter.toFixed(2)}/L`, 110, yPos);
  
  yPos += 7;
  
  // Total
  doc.setFont('helvetica', 'bold');
  doc.text(`💰 Custo total combustível: R$ ${fuel.total_fuel_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 14, yPos);
  doc.setFont('helvetica', 'normal');
  
  yPos += 3;
  
  // Info de atualização
  if (fuel.data_coleta) {
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Atualizado: ${fuel.data_coleta}`, 14, yPos);
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
  }
}
// ========== FIM DA SEÇÃO DE COMBUSTÍVEL ==========

    // 2. Tabela Financeira
    yPos += 15;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('2. Detalhamento Financeiro', 14, yPos);

    const formatMoney = (val) => `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    
    const formatUSD = (val) => {
        if (!scenarioData.currentDollar || !val) return '-';
        const usdVal = val / scenarioData.currentDollar;
        return `US$ ${usdVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    };

    // Prepara os dados da tabela
    const grossRevenue = (scenarioData.result.profit || 0) + (scenarioData.result.totalCost || 0);
    const costGoods = (scenarioData.input.buyPrice || 0) * (scenarioData.input.volume || 0) * 1000;
    
    const tableBody = [
      ['Receita Bruta Estimada', formatMoney(grossRevenue), formatUSD(grossRevenue)],
      ['(-) Custo da Mercadoria', formatMoney(costGoods), formatUSD(costGoods)],
      ['(-) Frete Logístico', formatMoney(scenarioData.result.details.freightCost), formatUSD(scenarioData.result.details.freightCost)],
      ['(-) Perdas/Quebra', formatMoney(scenarioData.result.details.spoilageLoss), formatUSD(scenarioData.result.details.spoilageLoss)],
      ['(-) Armazenagem', formatMoney(scenarioData.result.details.storageCost), formatUSD(scenarioData.result.details.storageCost)],
      [
        { content: 'LUCRO LÍQUIDO PROJETADO', styles: { fontStyle: 'bold', fillColor: [220, 252, 231] } }, 
        { content: formatMoney(scenarioData.result.profit), styles: { fontStyle: 'bold', textColor: [21, 128, 61] } },
        { content: formatUSD(scenarioData.result.profit), styles: { fontStyle: 'bold', textColor: [21, 128, 61] } }
      ],
    ];

    autoTable(doc, {
      startY: yPos + 5,
      head: [['Item', 'Valor (R$)', 'Valor (USD)']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: darkBg, textColor: primaryColor },
      styles: { fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 90 },
        1: { cellWidth: 50, halign: 'right' },
        2: { cellWidth: 50, halign: 'right' },
      },
    });

    // 3. KPIs e Risco
    yPos = doc.lastAutoTable.finalY + 20;
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0); 
    doc.text('3. Indicadores de Performance (KPIs)', 14, yPos);

    yPos += 10;
    
    // Card ROI
    const roi = scenarioData.result.roi;
    doc.setFillColor(roi >= 20 ? 220 : 254, roi >= 20 ? 252 : 242, roi >= 20 ? 231 : 242); 
    doc.roundedRect(14, yPos, 85, 25, 3, 3, 'F');
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Retorno sobre Investimento (ROI)', 20, yPos + 8);
    
    doc.setFontSize(16);
    doc.setTextColor(roi >= 20 ? 21 : 185, roi >= 20 ? 128 : 28, roi >= 20 ? 61 : 28);
    doc.text(`${roi}%`, 20, yPos + 18);

    // Card Risco
    const isHighRisk = scenarioData.result.isHighRisk;
    doc.setFillColor(isHighRisk ? 254 : 224, isHighRisk ? 226 : 242, isHighRisk ? 226 : 254);
    doc.roundedRect(105, yPos, 85, 25, 3, 3, 'F');

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Classificação de Risco', 111, yPos + 8);

    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text(isHighRisk ? 'ALTO RISCO' : 'MODERADO / BAIXO', 111, yPos + 18);

    // Rodapé
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('AgroArbitrage AI © 2025 - Relatório gerado automaticamente.', 105, pageHeight - 10, { align: 'center' });

    // Salva
    doc.save(`Relatorio_Agro_${scenarioData.input.product}_${Date.now()}.pdf`);
  },

// --- RELATÓRIO 2: DASHBOARD GERAL (PANORAMA) ---
  generateDashboardReport: (data, userName = 'Gestor') => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const primaryColor = [0, 217, 255]; 
    const darkBg = [15, 23, 42]; 

    // Header
    doc.setFillColor(...darkBg);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(...primaryColor);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('AgroArbitrage AI', 14, 20);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Panorama de Mercado (Dashboard)', 14, 28);
    
    const today = new Date().toLocaleDateString('pt-BR');
    doc.setFontSize(9);
    doc.text(`Data: ${today}`, 196, 20, { align: 'right' });
    doc.text(`Solicitante: ${userName}`, 196, 28, { align: 'right' });

    if (data.market) {
        doc.text(`Dólar: R$ ${data.market.dollar.toFixed(3)} | Diesel Médio (BR): R$ ${data.market.dieselAvg.toFixed(2)}`, 196, 36, { align: 'right' });
    }

    let yPos = 50;

    // --- 1. Resumo Executivo (KPIs) ---
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('1. Resumo Executivo', 14, yPos);
    yPos += 10;

    const cardWidth = 40;
    const cardHeight = 25;
    const gap = 5;
    let xPos = 14;

    const kpis = [
        { title: 'Oportunidades', value: data.kpis.total, color: [0, 217, 255] },
        { title: 'ROI Médio', value: `${data.kpis.avgROI}%`, color: [167, 139, 250] },
        { title: 'Alto Risco', value: data.kpis.highRisk, color: [239, 68, 68] },
        { title: 'Volume Total', value: `${parseInt(data.kpis.volume).toLocaleString()}`, color: [16, 185, 129] }
    ];

    kpis.forEach(kpi => {
        doc.setDrawColor(...kpi.color);
        doc.setLineWidth(1);
        doc.roundedRect(xPos, yPos, cardWidth, cardHeight, 3, 3, 'S');
        
        doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(kpi.title, xPos + 5, yPos + 8);

        doc.setFontSize(14);
        doc.setTextColor(...darkBg);
        doc.setFont('helvetica', 'bold');
        doc.text(String(kpi.value), xPos + 5, yPos + 18);

        xPos += cardWidth + gap;
    });

    yPos += 35;

    // --- 2. Cotação do Diesel (Tabela) ---
    if (data.market && data.market.fuelByState) {
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text('2. Cotação do Diesel por Estado (S-10)', 14, yPos);
        
        const fuelRows = data.market.fuelByState.labels.map((label, index) => [
            label,
            `R$ ${data.market.fuelByState.values[index].toFixed(2)}`
        ]);

        autoTable(doc, {
            startY: yPos + 5,
            head: [['Estado', 'Preço Médio (R$/L)']],
            body: fuelRows,
            theme: 'striped',
            headStyles: { fillColor: [59, 130, 246], textColor: [255,255,255] },
            styles: { fontSize: 10, halign: 'center' },
            columnStyles: { 0: { halign: 'left' } }
        });
        
        yPos = doc.lastAutoTable.finalY + 15;
    }

    // --- 3. Top 5 Oportunidades ---
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('3. Top 5 Oportunidades (Maior ROI)', 14, yPos);
    
    const top5Rows = data.top5.map(opp => {
        // Extração segura dos dados
        const financial = opp.financials || {};
        const origin = opp.origin || {};
        const dest = opp.destination || {};
        
        const buyPrice = financial.buyPrice || 0;
        const sellPrice = financial.sellPrice || 0;
        const roi = (financial.roi !== null && financial.roi !== undefined && !isNaN(financial.roi) && typeof financial.roi === 'number') 
            ? parseFloat(financial.roi) 
            : 0;
        
        // Cálculo de lucro estimado (Baseado em 1000kg/1ton)
        const estimatedProfit = (sellPrice - buyPrice) * 1000;
        
        return [
            opp.product || '-',
            origin.name || origin.ceasaName || `${origin.city || ''} - ${origin.state || ''}` || '-',
            dest.name || dest.city || opp.sellLocation || '-',
            `R$ ${buyPrice.toFixed(2)}`,
            `R$ ${sellPrice.toFixed(2)}`,
            `R$ ${estimatedProfit.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
            `${roi.toFixed(1)}%`
        ];
    });

    autoTable(doc, {
        startY: yPos + 5,
        head: [['Produto', 'Origem', 'Destino', 'Compra', 'Venda', 'Lucro Liq.', 'ROI']],
        body: top5Rows,
        theme: 'grid',
        headStyles: { fillColor: darkBg, textColor: primaryColor },
        styles: { fontSize: 9, halign: 'center' },
        columnStyles: { 
            0: { halign: 'left' }, 
            1: { halign: 'left' }, 
            2: { halign: 'left' },
            5: { halign: 'right' },
            6: { halign: 'center' }
        }
    });

    // --- 4. Tendências de Mercado ---
    yPos = doc.lastAutoTable.finalY + 15;
    
    // Verifica se há espaço na página, se não, cria nova página
    if (yPos > 250) {
        doc.addPage();
        yPos = 20;
    }
    
    if (data.marketTrends && data.marketTrends.statistics) {
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.text('4. Tendências de Mercado', 14, yPos);
        yPos += 10;
        
        const stats = data.marketTrends.statistics;
        const trend = data.marketTrends.trend || {};
        
        // Estatísticas principais (CORRIGIDO: usando nomes corretos dos campos)
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        
        const statsData = [
            ['Métrica', 'Valor'],
            ['Preço Atual', `R$ ${(stats.current || 0).toFixed(2)}`],
            ['Preço Médio', `R$ ${(stats.average || 0).toFixed(2)}`],
            ['Preço Mínimo', `R$ ${(stats.min || 0).toFixed(2)}`],
            ['Preço Máximo', `R$ ${(stats.max || 0).toFixed(2)}`],
            ['Volatilidade', `${(stats.volatility || 0).toFixed(2)}%`],
            ['Tendência', trend.direction === 'up' ? '📈 Alta' : trend.direction === 'down' ? '📉 Baixa' : '➡️ Estável'],
            ['Variação 7d vs 30d', `${(trend.changePercent || 0).toFixed(2)}%`]
        ];
        
        autoTable(doc, {
            startY: yPos + 5,
            head: [statsData[0]],
            body: statsData.slice(1),
            theme: 'striped',
            headStyles: { fillColor: darkBg, textColor: primaryColor },
            styles: { fontSize: 9, halign: 'left' },
            columnStyles: { 
                0: { halign: 'left', fontStyle: 'bold' }, 
                1: { halign: 'right' }
            }
        });
        
        yPos = doc.lastAutoTable.finalY + 15;
        
        // Informações adicionais
        if (data.marketTrends.chart && data.marketTrends.chart.labels) {
            doc.setFontSize(9);
            doc.setTextColor(100, 100, 100);
            doc.setFont('helvetica', 'italic');
            doc.text(`Período analisado: ${data.marketTrends.chart.labels.length} pontos de dados`, 14, yPos);
            yPos += 5;
            doc.text(`Produto: ${data.marketTrends.product || 'Tomate'} | Região: ${data.marketTrends.region || 'Total (Brasil)'}`, 14, yPos);
            yPos += 10;
        }
        
        // Gráfico de Tendências (imagem ou tabela)
        if (data.marketTrends.chart && data.marketTrends.chart.labels && data.marketTrends.chart.datasets) {
            // Verifica se há espaço, se não, cria nova página
            if (yPos > 200) {
                doc.addPage();
                yPos = 20;
            }
            
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'bold');
            doc.text('Gráfico de Evolução de Preços', 14, yPos);
            yPos += 8;
            
            // Se temos a imagem do gráfico, adiciona ela (com compressão)
            if (data.marketTrendsChartImage) {
                try {
                    const imgWidth = 180; // mm
                    const imgHeight = 80; // mm (mantém proporção)
                    
                    // ✅ Adiciona imagem com compressão (JPEG já vem comprimido)
                    doc.addImage(
                        data.marketTrendsChartImage,
                        'JPEG', // ✅ Mudado de PNG para JPEG (menor tamanho)
                        14,
                        yPos,
                        imgWidth,
                        imgHeight,
                        undefined, // alias
                        'FAST' // ✅ Modo FAST para compressão adicional
                    );
                    yPos += imgHeight + 10;
                } catch (imgError) {
                    console.warn('Erro ao adicionar imagem do gráfico:', imgError);
                    // Fallback para tabela se a imagem falhar
                    yPos += 5;
                }
            }
            
            // Tabela com últimos 10 pontos (sempre incluída como complemento)
            if (yPos > 240) {
                doc.addPage();
                yPos = 20;
            }
            
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'bold');
            doc.text('Dados Detalhados (Últimos 10 pontos)', 14, yPos);
            yPos += 6;
            
            // Pega os últimos 10 pontos de dados
            const labels = data.marketTrends.chart.labels.slice(-10);
            const historical = data.marketTrends.chart.datasets.historical.slice(-10);
            const ma7 = data.marketTrends.chart.datasets.ma7 ? data.marketTrends.chart.datasets.ma7.slice(-10) : [];
            
            const chartRows = labels.map((label, index) => [
                label,
                `R$ ${historical[index].toFixed(2)}`,
                ma7[index] ? `R$ ${ma7[index].toFixed(2)}` : '-'
            ]);
            
            autoTable(doc, {
                startY: yPos + 3,
                head: [['Data', 'Preço Histórico', 'Média Móvel 7d']],
                body: chartRows,
                theme: 'grid',
                headStyles: { fillColor: darkBg, textColor: primaryColor },
                styles: { fontSize: 8, halign: 'center' },
                columnStyles: { 
                    0: { halign: 'left' },
                    1: { halign: 'right' },
                    2: { halign: 'right' }
                }
            });
            
            yPos = doc.lastAutoTable.finalY + 10;
        }
    }
    
    // --- 5. Insights Preditivos (IA Prophet) ---
    if (data.predictiveInsights && (data.predictiveInsights.topProjected7d?.length > 0 || data.predictiveInsights.topProjected30d?.length > 0)) {
        // Verifica se há espaço na página, se não, cria nova página
        if (yPos > 250) {
            doc.addPage();
            yPos = 20;
        }
        
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.text('5. Insights Preditivos (IA Prophet)', 14, yPos);
        yPos += 10;
        
        // Gráfico preditivo (se disponível)
        if (data.predictiveChartImage) {
            try {
                const imgWidth = 180;
                const imgHeight = 80;
                doc.addImage(
                    data.predictiveChartImage,
                    'JPEG',
                    14,
                    yPos,
                    imgWidth,
                    imgHeight,
                    undefined,
                    'FAST'
                );
                yPos += imgHeight + 10;
            } catch (imgError) {
                console.warn('Erro ao adicionar gráfico preditivo:', imgError);
                yPos += 5;
            }
        }
        
        // Top Oportunidades Projetadas (7 dias)
        if (data.predictiveInsights.topProjected7d && data.predictiveInsights.topProjected7d.length > 0) {
            if (yPos > 240) {
                doc.addPage();
                yPos = 20;
            }
            
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'bold');
            doc.text('Top 5 Oportunidades - Projeção +7 dias', 14, yPos);
            yPos += 8;
            
            const projected7dRows = data.predictiveInsights.topProjected7d.map(opp => {
                const origin = opp.origin || {};
                const trend = opp.change > 0 ? '📈' : opp.change < 0 ? '📉' : '➡️';
                return [
                    opp.product || '-',
                    `${origin.city || 'N/A'}, ${origin.state || ''}`,
                    `${opp.currentROI.toFixed(1)}%`,
                    `${opp.projectedROI.toFixed(1)}%`,
                    `${opp.change >= 0 ? '+' : ''}${opp.change.toFixed(1)}%`,
                    trend
                ];
            });
            
            autoTable(doc, {
                startY: yPos + 3,
                head: [['Produto', 'Origem', 'ROI Atual', 'ROI Proj. (+7d)', 'Variação', 'Tendência']],
                body: projected7dRows,
                theme: 'grid',
                headStyles: { fillColor: darkBg, textColor: primaryColor },
                styles: { fontSize: 8, halign: 'center' },
                columnStyles: { 
                    0: { halign: 'left' },
                    1: { halign: 'left' },
                    2: { halign: 'right' },
                    3: { halign: 'right' },
                    4: { halign: 'right' },
                    5: { halign: 'center' }
                }
            });
            
            yPos = doc.lastAutoTable.finalY + 10;
        }
        
        // Top Oportunidades Projetadas (30 dias)
        if (data.predictiveInsights.topProjected30d && data.predictiveInsights.topProjected30d.length > 0) {
            if (yPos > 240) {
                doc.addPage();
                yPos = 20;
            }
            
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'bold');
            doc.text('Top 5 Oportunidades - Projeção +30 dias', 14, yPos);
            yPos += 8;
            
            const projected30dRows = data.predictiveInsights.topProjected30d.map(opp => {
                const origin = opp.origin || {};
                const trend = opp.change > 0 ? '📈' : opp.change < 0 ? '📉' : '➡️';
                return [
                    opp.product || '-',
                    `${origin.city || 'N/A'}, ${origin.state || ''}`,
                    `${opp.currentROI.toFixed(1)}%`,
                    `${opp.projectedROI.toFixed(1)}%`,
                    `${opp.change >= 0 ? '+' : ''}${opp.change.toFixed(1)}%`,
                    trend
                ];
            });
            
            autoTable(doc, {
                startY: yPos + 3,
                head: [['Produto', 'Origem', 'ROI Atual', 'ROI Proj. (+30d)', 'Variação', 'Tendência']],
                body: projected30dRows,
                theme: 'grid',
                headStyles: { fillColor: darkBg, textColor: primaryColor },
                styles: { fontSize: 8, halign: 'center' },
                columnStyles: { 
                    0: { halign: 'left' },
                    1: { halign: 'left' },
                    2: { halign: 'right' },
                    3: { halign: 'right' },
                    4: { halign: 'right' },
                    5: { halign: 'center' }
                }
            });
            
            yPos = doc.lastAutoTable.finalY + 10;
        }
    }
    
    // --- 6. Resumo Completo de Oportunidades (Opcional) ---
    if (data.saved && data.saved.length > 0) {
        // Verifica se há espaço na página, se não, cria nova página
        if (yPos > 250) {
            doc.addPage();
            yPos = 20;
        }
        
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.text('5. Resumo Completo de Oportunidades', 14, yPos);
        yPos += 10;
        
        // Limita a 20 oportunidades para não sobrecarregar o PDF
        const allOppsRows = data.saved.slice(0, 20).map(opp => {
            const financial = opp.financials || {};
            const origin = opp.origin || {};
            const dest = opp.destination || {};
            
            const buyPrice = financial.buyPrice || 0;
            const sellPrice = financial.sellPrice || 0;
            const roi = (financial.roi !== null && financial.roi !== undefined && !isNaN(financial.roi) && typeof financial.roi === 'number') 
                ? parseFloat(financial.roi) 
                : 0;
            
            const estimatedProfit = (sellPrice - buyPrice) * 1000;
            
            return [
                opp.product || '-',
                origin.name || origin.ceasaName || `${origin.city || ''} - ${origin.state || ''}` || '-',
                dest.name || dest.city || opp.sellLocation || '-',
                `R$ ${buyPrice.toFixed(2)}`,
                `R$ ${sellPrice.toFixed(2)}`,
                `R$ ${estimatedProfit.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
                `${roi.toFixed(1)}%`
            ];
        });
        
        if (allOppsRows.length > 0) {
            autoTable(doc, {
                startY: yPos + 5,
                head: [['Produto', 'Origem', 'Destino', 'Compra', 'Venda', 'Lucro Liq.', 'ROI']],
                body: allOppsRows,
                theme: 'striped',
                headStyles: { fillColor: darkBg, textColor: primaryColor },
                styles: { fontSize: 8, halign: 'center' },
                columnStyles: { 
                    0: { halign: 'left' }, 
                    1: { halign: 'left' }, 
                    2: { halign: 'left' },
                    5: { halign: 'right' },
                    6: { halign: 'center' }
                }
            });
            
            if (data.saved.length > 20) {
                yPos = doc.lastAutoTable.finalY + 5;
                doc.setFontSize(9);
                doc.setTextColor(100, 100, 100);
                doc.setFont('helvetica', 'italic');
                doc.text(`* Mostrando 20 de ${data.saved.length} oportunidades totais`, 14, yPos);
            }
        }
    }

    // Rodapé
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('AgroArbitrage AI - Panorama de Mercado.', 105, pageHeight - 10, { align: 'center' });

    doc.save(`Dashboard_Agro_${Date.now()}.pdf`);
  },

    // --- RELATÓRIO 3: ROI ARBITRAGEM (RoiCalculator) ---
generateRoiReport: (apiData, userName = 'Produtor') => {
    // ---------------------------------------------------------------------------
    // 🛡️ ADAPTER SÊNIOR: Padroniza os dados antes de gerar o relatório
    // ---------------------------------------------------------------------------
    // Aqui transformamos a resposta da API (Python) ou Local na estrutura que o seu PDF espera
    const roiData = {
        product: apiData.product || apiData.product_name || '-',
        
        // 1. Análise & Rotas
        analysis: apiData.analysis || {
            origin: apiData.originState,
            destination: apiData.destState,
            distance_km: apiData.details?.distanceKm
        },

        // 2. Produção
        production: apiData.production || {
            productivity_ha: apiData.productivity,
            total_volume: apiData.volume
        },
        // O Python manda no root, o Local manda no details. Garantimos um número.
        total_production_cost: apiData.total_production_cost ?? apiData.production?.cost_total ?? 0,

        // 3. Logística (O Pulo do Gato para o Combustível)
        logistics: {
            total_logistics_cost: apiData.logistics?.total_logistics_cost ?? apiData.details?.freightCost ?? 0,
            fuel_breakdown: apiData.logistics?.fuel_breakdown || {
                // Fallback inteligente se não vier detalhado
                origin_price: { state: apiData.originState || 'Origem', price_per_liter: apiData.logistics?.diesel_price_ref ?? 0 },
                dest_price: { state: apiData.destState || 'Destino', price_per_liter: apiData.logistics?.diesel_price_ref ?? 0 },
                fuel_liters: apiData.logistics?.liters_consumed ?? 0,
                total_fuel_cost: apiData.logistics?.fuel_cost ?? 0,
                data_coleta: new Date().toLocaleString()
            }
        },

        // 4. Lucratividade (Mapeamento Crítico)
        // O seu código usa 'profitability', mas a API manda 'market' e 'financial'
        profitability: {
            gross_revenue: apiData.market?.gross_revenue ?? apiData.grossRevenue ?? 0,
            net_profit: apiData.financial?.net_profit ?? apiData.profit ?? 0,
            roi_percent: apiData.financial?.roi ?? apiData.roi ?? 0
        },
        
        // Custo total geral
        total_cost: apiData.financial?.total_cost ?? apiData.totalCost ?? 0
    };
    // ---------------------------------------------------------------------------
    const doc = new jsPDF('p', 'mm', 'a4');
    
    // Cores da marca
    const primaryColor = [0, 217, 255]; 
    const darkBg = [15, 23, 42]; 
    
    // --- CABEÇALHO ---
    doc.setFillColor(...darkBg);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(...primaryColor);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('AgroArbitrage AI', 14, 20);
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Análise de Arbitragem Agrícola', 14, 28);
    
    const today = new Date().toLocaleDateString('pt-BR');
    doc.setFontSize(9);
    doc.text(`Gerado em: ${today}`, 196, 20, { align: 'right' });
    doc.text(`Responsável: ${userName}`, 196, 28, { align: 'right' });
    
    // --- CORPO ---
    let yPos = 55;
    
    // 1. Operação
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('1. Definição da Operação', 14, yPos);
    
    yPos += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const analysis = roiData.analysis || {};
    doc.text(`Produto: ${roiData.product}`, 14, yPos);
    doc.text(`Origem: ${analysis.origin || '-'}`, 100, yPos);
    
    yPos += 7;
    doc.text(`Destino: ${analysis.destination || '-'}`, 14, yPos);
    doc.text(`Distância: ${analysis.distance_km ? Number(analysis.distance_km).toFixed(1) + ' km' : '-' }`, 100, yPos);
    
    yPos += 10;
    
    // 2. Produção
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('2. Custos de Produção', 14, yPos);
    
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const production = roiData.production || {};
    doc.text(`Produtividade: ${production.productivity_ha ? Number(production.productivity_ha).toFixed(1) + ' un/ha' : '-' }`, 14, yPos);
    doc.text(`Volume Total: ${production.total_volume ? Number(production.total_volume).toFixed(1) + ' un' : '-' }`, 100, yPos);
    
    yPos += 7;
    if (roiData.total_production_cost !== undefined) {
      doc.text(
        `Custo Total Produção: R$ ${Number(roiData.total_production_cost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        14,
        yPos
      );
      yPos += 10;
    }
    
    // 3. Logística + Combustível
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('3. Logística & Combustível', 14, yPos);
    
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const logistics = roiData.logistics || {};
    const fuel = logistics.fuel_breakdown || {};
    
    if (fuel.origin_price) {
      doc.text(
        `Diesel Origem (${fuel.origin_price.state || 'Origem'}): R$ ${Number(fuel.origin_price.price_per_liter).toFixed(2)}/L`,
        14,
        yPos
      );
      doc.text(
        `Diesel Destino (${fuel.dest_price.state || 'Destino'}): R$ ${Number(fuel.dest_price.price_per_liter).toFixed(2)}/L`,
        110,
        yPos
      );
      yPos += 7;
    }
    
    doc.text(
      `Litros Diesel: ${fuel.fuel_liters ? Number(fuel.fuel_liters).toFixed(1) + ' L' : '-'}`,
      14,
      yPos
    );
    doc.text(
      `Custo Combustível: R$ ${fuel.total_fuel_cost ? Number(fuel.total_fuel_cost).toLocaleString('pt-BR') : '-'}`,
      110,
      yPos
    );
    yPos += 7;
    
    doc.text(
      `Custo Total Logística: R$ ${logistics.total_logistics_cost ? Number(logistics.total_logistics_cost).toLocaleString('pt-BR') : '-'}`,
      14,
      yPos
    );
    yPos += 10;
    
    if (fuel.data_coleta) {
      doc.setFontSize(8);
      doc.text(`Dados Petrobras: ${fuel.data_coleta}`, 14, yPos);
      doc.setFontSize(10);
      yPos += 8;
    }
    
    // 4. Lucratividade
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('4. Lucratividade Projetada', 14, yPos);
    
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    // Aqui usamos o objeto traduzido lá em cima
    const profitability = roiData.profitability; 
    
    const tableData = [
      ['Receita Bruta', `R$ ${profitability.gross_revenue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`],
      ['Custo Total', `R$ ${roiData.total_cost.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`],
      ['Lucro Líquido', `R$ ${profitability.net_profit.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`],
      ['ROI', `${profitability.roi_percent.toFixed(2)}%`]
    ];
    
    autoTable(doc, {
      startY: yPos,
      head: [['Indicador', 'Valor']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: darkBg, textColor: primaryColor },
      styles: { fontSize: 10 },
      columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 100, halign: 'right' } }
    });
    
    yPos = doc.lastAutoTable.finalY + 15;
    
    // Recomendação
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    const roi = profitability.roi_percent || 0;
    let recommendation = '';
    
    if (roi > 25) {
      recommendation = 'RECOMENDAÇÃO: ALTAMENTE VIÁVEL ✓';
      doc.setTextColor(16, 185, 129); // Verde
    } else if (roi > 10) {
      recommendation = 'RECOMENDAÇÃO: VIÁVEL COM ATENÇÃO';
      doc.setTextColor(245, 158, 11); // Laranja
    } else {
      recommendation = 'RECOMENDAÇÃO: NÃO RECOMENDADO';
      doc.setTextColor(239, 68, 68); // Vermelho
    }

    doc.text(recommendation, 14, yPos);
    doc.setTextColor(0, 0, 0); // Reset cor
    
    // Rodapé
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('AgroArbitrage AI © 2025 - Análise Automatizada.', 105, pageHeight - 10, { align: 'center' });
    
    doc.save(`ROI_${roiData.product || 'Analise'}_${today.replace(/\//g, '-')}.pdf`);
}
};
