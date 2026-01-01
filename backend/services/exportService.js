// backend/services/exportService.js
// ✅ FASE B - B1: Exportação Excel Premium

const ExcelJS = require('exceljs');
const logger = require('../utils/logger');

/**
 * Exporta oportunidades para Excel com formatação premium
 * @param {Array} opportunities - Array de oportunidades
 * @param {Object} options - Opções de exportação
 * @returns {Promise<Buffer>} - Buffer do arquivo Excel
 */
async function exportOpportunitiesToExcel(opportunities, options = {}) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Oportunidades');

  // ============================================
  // 1. ESTILOS E FORMATAÇÃO
  // ============================================
  
  // Estilo do cabeçalho
  const headerStyle = {
    font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 },
    fill: {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E40AF' } // Azul escuro
    },
    alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
    border: {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    }
  };

  // Estilo para ROI alto (verde)
  const highROIStyle = {
    font: { bold: true, color: { argb: 'FF006400' } }, // Verde escuro
    fill: {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF90EE90' } // Verde claro
    }
  };

  // Estilo para ROI baixo (vermelho)
  const lowROIStyle = {
    font: { bold: true, color: { argb: 'FF8B0000' } }, // Vermelho escuro
    fill: {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFB6C1' } // Vermelho claro
    }
  };

  // Estilo para ROI médio (amarelo)
  const mediumROIStyle = {
    font: { color: { argb: 'FF8B6914' } }, // Amarelo escuro
    fill: {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFFACD' } // Amarelo claro
    }
  };

  // ============================================
  // 2. CABEÇALHOS
  // ============================================
  
  const headers = [
    'ID',
    'Produto',
    'Categoria',
    'Cidade',
    'Estado',
    'Preço Compra (R$/kg)',
    'Preço Venda (R$/kg)',
    'Local Venda',
    'Volume',
    'ROI (%)',
    'Frete (R$)',
    'Nível Risco',
    'Clima',
    'Safra',
    'Descrição',
    'Data Criação'
  ];

  worksheet.columns = headers.map(header => ({
    header,
    key: header.toLowerCase().replace(/[^a-z0-9]/g, '_'),
    width: 15
  }));

  // Aplicar estilo ao cabeçalho
  const headerRow = worksheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.style = headerStyle;
  });

  // ============================================
  // 3. DADOS
  // ============================================
  
  opportunities.forEach((opp, index) => {
    const row = worksheet.addRow([
      opp.id,
      opp.product,
      opp.category,
      opp.city,
      opp.state,
      parseFloat(opp.buyPrice) || 0,
      parseFloat(opp.sellPrice) || 0,
      opp.sellLocation,
      opp.volume,
      opp.roi ? parseFloat(opp.roi).toFixed(2) : '0.00',
      opp.freight ? parseFloat(opp.freight).toFixed(2) : '0.00',
      opp.riskLevel,
      opp.climate,
      opp.season || '-',
      opp.description || '-',
      opp.createdAt ? new Date(opp.createdAt).toLocaleDateString('pt-BR') : '-'
    ]);

    // Formatação condicional baseada em ROI
    const roiCell = row.getCell(10); // Coluna ROI
    const roiValue = parseFloat(opp.roi) || 0;

    if (roiValue > 20) {
      roiCell.style = highROIStyle;
    } else if (roiValue < 10) {
      roiCell.style = lowROIStyle;
    } else {
      roiCell.style = mediumROIStyle;
    }

    // Formatação de números
    row.getCell(6).numFmt = '#,##0.00'; // Preço Compra
    row.getCell(7).numFmt = '#,##0.00'; // Preço Venda
    row.getCell(11).numFmt = '#,##0.00'; // Frete
  });

  // ============================================
  // 4. ANÁLISE ROI POR PRODUTO
  // ============================================
  
  if (opportunities.length > 0) {
    // Criar planilha de análise ROI
    const analysisSheet = workbook.addWorksheet('Análise ROI');
    
    // Cabeçalho
    analysisSheet.addRow(['Produto', 'ROI Médio (%)', 'Quantidade', 'ROI Máximo (%)', 'ROI Mínimo (%)']);
    const analysisHeaderRow = analysisSheet.getRow(1);
    analysisHeaderRow.eachCell((cell) => {
      cell.style = headerStyle;
    });
    
    // Agrupar por produto e calcular estatísticas
    const roiByProduct = {};
    opportunities.forEach(opp => {
      const product = opp.product;
      const roi = parseFloat(opp.roi) || 0;
      
      if (!roiByProduct[product]) {
        roiByProduct[product] = {
          total: 0,
          count: 0,
          max: roi,
          min: roi
        };
      }
      
      roiByProduct[product].total += roi;
      roiByProduct[product].count += 1;
      roiByProduct[product].max = Math.max(roiByProduct[product].max, roi);
      roiByProduct[product].min = Math.min(roiByProduct[product].min, roi);
    });

    // Adicionar dados à planilha
    Object.entries(roiByProduct)
      .sort((a, b) => (b[1].total / b[1].count) - (a[1].total / a[1].count)) // Ordenar por ROI médio
      .forEach(([product, data]) => {
        const avgROI = (data.total / data.count).toFixed(2);
        const row = analysisSheet.addRow([
          product,
          parseFloat(avgROI),
          data.count,
          data.max.toFixed(2),
          data.min.toFixed(2)
        ]);
        
        // Formatação de números
        row.getCell(2).numFmt = '#,##0.00'; // ROI Médio
        row.getCell(4).numFmt = '#,##0.00'; // ROI Máximo
        row.getCell(5).numFmt = '#,##0.00'; // ROI Mínimo
        
        // Formatação condicional
        const avgROICell = row.getCell(2);
        const avgROIValue = parseFloat(avgROI);
        if (avgROIValue > 20) {
          avgROICell.style = highROIStyle;
        } else if (avgROIValue < 10) {
          avgROICell.style = lowROIStyle;
        } else {
          avgROICell.style = mediumROIStyle;
        }
      });
    
    // Ajustar largura das colunas
    analysisSheet.columns = [
      { width: 20 }, // Produto
      { width: 15 }, // ROI Médio
      { width: 12 }, // Quantidade
      { width: 15 }, // ROI Máximo
      { width: 15 }  // ROI Mínimo
    ];
  }

  // ============================================
  // 5. RESUMO ESTATÍSTICO
  // ============================================
  
  const summarySheet = workbook.addWorksheet('Resumo');
  
  const totalOpps = opportunities.length;
  const avgROI = opportunities.reduce((sum, opp) => sum + (parseFloat(opp.roi) || 0), 0) / totalOpps || 0;
  const maxROI = Math.max(...opportunities.map(opp => parseFloat(opp.roi) || 0));
  const minROI = Math.min(...opportunities.map(opp => parseFloat(opp.roi) || 0));
  const highROICount = opportunities.filter(opp => (parseFloat(opp.roi) || 0) > 20).length;
  const lowROICount = opportunities.filter(opp => (parseFloat(opp.roi) || 0) < 10).length;

  summarySheet.addRow(['Métrica', 'Valor']);
  summarySheet.addRow(['Total de Oportunidades', totalOpps]);
  summarySheet.addRow(['ROI Médio (%)', avgROI.toFixed(2)]);
  summarySheet.addRow(['ROI Máximo (%)', maxROI.toFixed(2)]);
  summarySheet.addRow(['ROI Mínimo (%)', minROI.toFixed(2)]);
  summarySheet.addRow(['Oportunidades ROI > 20%', highROICount]);
  summarySheet.addRow(['Oportunidades ROI < 10%', lowROICount]);
  summarySheet.addRow(['Data de Exportação', new Date().toLocaleString('pt-BR')]);

  // Estilizar cabeçalho do resumo
  summarySheet.getRow(1).eachCell((cell) => {
    cell.style = headerStyle;
  });

  // ============================================
  // 6. GERAR BUFFER
  // ============================================
  
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

module.exports = {
  exportOpportunitiesToExcel
};

