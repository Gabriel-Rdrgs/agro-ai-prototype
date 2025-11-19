import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const PdfService = {
  // --- RELATÓRIO 1: CENÁRIO INDIVIDUAL (Já existia) ---
  generateReport: (scenarioData, userName = 'Analista') => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const primaryColor = [0, 217, 255]; 
    const darkBg = [15, 23, 42]; 

    // ... (MANTENHA O CÓDIGO DO RELATÓRIO INDIVIDUAL AQUI IGUAL AO ANTERIOR) ...
    // Para economizar espaço na resposta, vou assumir que você manteve a lógica anterior
    // Se precisar, eu mando o arquivo completo novamente com as duas funções.
    
    // Vou apenas repetir o header auxiliar para usar nas duas funções
    const drawHeader = (title, subtitle) => {
        doc.setFillColor(...darkBg);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(...primaryColor);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('AgroArbitrage AI', 14, 20);
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(title, 14, 28);
        const today = new Date().toLocaleDateString('pt-BR');
        doc.setFontSize(9);
        doc.text(`Gerado em: ${today}`, 196, 20, { align: 'right' });
        doc.text(`Responsável: ${userName}`, 196, 28, { align: 'right' });
    };

    drawHeader('Relatório de Viabilidade & Logística');

    // ... (Resto da lógica do generateReport anterior) ...
    // ...
    
    // Se você não tiver o código anterior fácil, me avise que eu mando tudo junto!
    // Mas aqui vou focar na NOVA função abaixo:
  },

  // --- 🚀 RELATÓRIO 2: DASHBOARD GERAL (NOVO) ---
  generateDashboardReport: (data, userName = 'Gestor') => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const primaryColor = [0, 217, 255]; 
    const darkBg = [15, 23, 42]; 
    const greenColor = [16, 185, 129];

    // 1. Header
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

    // 2. Resumo Executivo (Cards)
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('1. Resumo Executivo', 14, yPos);
    yPos += 10;

    // Desenha 4 cards lado a lado
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
        // Borda colorida
        doc.setDrawColor(...kpi.color);
        doc.setLineWidth(1);
        doc.roundedRect(xPos, yPos, cardWidth, cardHeight, 3, 3, 'S');
        
        // Fundo leve
        doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
        // doc.rect(xPos, yPos, cardWidth, 2, 'F'); // Barra superior

        // Texto
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

    // 3. Tabela de Melhores Oportunidades
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

    // 4. Cenários Salvos (Se houver)
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
            headStyles: { fillColor: [16, 185, 129], textColor: [255,255,255] }, // Verde para diferenciar
            styles: { fontSize: 9, halign: 'center' }
        });
    }

    // Rodapé
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Relatório gerado automaticamente pelo sistema AgroArbitrage AI.', 105, pageHeight - 10, { align: 'center' });

    doc.save('Dashboard_Agro_AI.pdf');
  }
};