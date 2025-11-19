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

    // 2. Tabela Financeira
    yPos += 15;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('2. Detalhamento Financeiro', 14, yPos);

    const formatMoney = (val) => `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

    // Prepara os dados da tabela
    const grossRevenue = (scenarioData.result.profit || 0) + (scenarioData.result.totalCost || 0);
    const costGoods = (scenarioData.input.buyPrice || 0) * (scenarioData.input.volume || 0) * 1000;
    
    const tableBody = [
      ['Receita Bruta Estimada', formatMoney(grossRevenue)],
      ['(-) Custo da Mercadoria', formatMoney(costGoods)],
      ['(-) Frete Logístico', formatMoney(scenarioData.result.details.freightCost)],
      ['(-) Perdas/Quebra', formatMoney(scenarioData.result.details.spoilageLoss)],
      ['(-) Armazenagem', formatMoney(scenarioData.result.details.storageCost)],
      [
        { content: 'LUCRO LÍQUIDO PROJETADO', styles: { fontStyle: 'bold', fillColor: [220, 252, 231] } }, 
        { content: formatMoney(scenarioData.result.profit), styles: { fontStyle: 'bold', textColor: [21, 128, 61] } }
      ],
    ];

    autoTable(doc, {
      startY: yPos + 5,
      head: [['Item', 'Valor']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: darkBg, textColor: primaryColor },
      styles: { fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 130 },
        1: { cellWidth: 40, halign: 'right' },
      },
    });

    // 3. KPIs e Risco
    yPos = doc.lastAutoTable.finalY + 20;
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0); // Garante preto para o título
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

    let yPos = 50;

    // 1. Resumo Executivo (Cards)
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
        { title: 'Volume Total', value: `${data.kpis.volume}t`, color: [16, 185, 129] }
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

    // 2. Top 5 Oportunidades
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('2. Top 5 Oportunidades (Maior ROI)', 14, yPos);
    
    const top5Rows = data.top5.map(opp => [
        opp.product,
        `${opp.city} - ${opp.state}`,
        opp.sellLocation,
        `R$ ${opp.buyPrice.toFixed(2)}`,
        `R$ ${opp.sellPrice.toFixed(2)}`,
        `${opp.roi}%`
    ]);

    autoTable(doc, {
        startY: yPos + 5,
        head: [['Produto', 'Origem', 'Destino', 'Compra', 'Venda', 'ROI']],
        body: top5Rows,
        theme: 'grid',
        headStyles: { fillColor: darkBg, textColor: primaryColor },
        styles: { fontSize: 9, halign: 'center' },
        columnStyles: {
            0: { halign: 'left' },
            1: { halign: 'left' },
            2: { halign: 'left' }
        }
    });

    // 3. Cenários Salvos
    if (data.saved && data.saved.length > 0) {
        yPos = doc.lastAutoTable.finalY + 20;
        doc.setFontSize(14);
        doc.text('3. Simulações Recentes (Salvas)', 14, yPos);

        const savedRows = data.saved.map(s => [
            new Date(s.savedAt).toLocaleDateString(),
            s.input.product,
            s.input.destinationName,
            `R$ ${s.result.profit.toLocaleString('pt-BR')}`,
            `${s.result.roi}%`
        ]);

        autoTable(doc, {
            startY: yPos + 5,
            head: [['Data', 'Produto', 'Destino', 'Lucro Liq.', 'ROI Calculado']],
            body: savedRows,
            theme: 'striped',
            headStyles: { fillColor: [16, 185, 129], textColor: [255,255,255] },
            styles: { fontSize: 9, halign: 'center' }
        });
    }

    // Rodapé
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('AgroArbitrage AI - Panorama de Mercado.', 105, pageHeight - 10, { align: 'center' });

    doc.save('Dashboard_Agro_AI.pdf');
  }
};