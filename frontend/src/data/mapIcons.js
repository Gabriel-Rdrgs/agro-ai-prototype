import L from 'leaflet';
import theme from '../styles/theme';

// ✅ NOVO: Função para obter cor e emoji baseado no produto
function getProductStyle(product) {
  const productLower = (product || '').toLowerCase();
  
  if (productLower.includes('tomate')) {
    return { 
      emoji: '🍅', 
      baseColor: '#ef4444', // Vermelho para tomate
      category: 'hortifruti'
    };
  } else if (productLower.includes('soja')) {
    return { 
      emoji: '🌾', 
      baseColor: '#fbbf24', // Amarelo/dourado para soja
      category: 'graos'
    };
  } else if (productLower.includes('milho')) {
    return { 
      emoji: '🌽', 
      baseColor: '#f59e0b', // Laranja para milho
      category: 'graos'
    };
  } else {
    return { 
      emoji: '🌱', 
      baseColor: '#22c55e', // Verde genérico
      category: 'outros'
    };
  }
}

// Função para criar ícone colorido baseado no ROI
export const createColoredIcon = (roi) => {
  let color;
  
  if (roi >= 100) {
    color = '#22c55e'; // Verde (ROI alto)
  } else if (roi >= 50) {
    color = '#f59e0b'; // Amarelo/Laranja (ROI médio)
  } else {
    color = '#ef4444'; // Vermelho (ROI baixo)
  }

  // Ícone SVG futurista (você pode customizar ainda mais!)
  return L.divIcon({
    className: '',
    html: `<div style="width:24px;height:24px;border-radius:50%;background:${color};box-shadow:0 0 12px ${color}77;border:2px solid #fff"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24]
  });
}

// Ícone para oportunidades de risco alto (adiciona borda vermelha)
export function createRiskIcon(roi, riskLevel, hasExtremeEvents = false, extremeEventSeverity = null, product = null) {
  // ✅ NOVO: Ajusta cor baseada no produto
  const productStyle = getProductStyle(product);
  let color;
  
  if (roi >= 100) {
    color = '#22c55e'; // Verde para ROI alto (sobrescreve cor do produto)
  } else if (roi >= 50) {
    color = productStyle.baseColor; // Usa cor do produto para ROI médio
  } else {
    color = theme.colors.warning; // Vermelho para ROI baixo
  }

  // Se há eventos extremos, ajusta cor e borda
  let strokeColor = riskLevel === 3 ? '#dc2626' : '#fff';
  let strokeWidth = riskLevel === 3 ? '3' : '2';
  
  if (hasExtremeEvents) {
    if (extremeEventSeverity === 'extreme') {
      strokeColor = '#dc2626'; // Vermelho para extremo
      strokeWidth = '4';
    } else if (extremeEventSeverity === 'high') {
      strokeColor = '#fb923c'; // Laranja para alto
      strokeWidth = '3';
    } else {
      strokeColor = '#facc15'; // Amarelo para moderado
      strokeWidth = '2';
    }
  }

  // ✅ MELHORADO: Badge de evento extremo (canto superior direito) - mais visível
  const extremeBadge = hasExtremeEvents ? `
    <circle cx="26" cy="8" r="8" fill="${strokeColor}" stroke="#fff" stroke-width="2" opacity="0.95"/>
    <text x="26" y="12" text-anchor="middle" fill="#fff" font-size="11" font-weight="bold" font-family="Arial, sans-serif">
      ${extremeEventSeverity === 'extreme' ? '!' : extremeEventSeverity === 'high' ? '⚠' : '⚡'}
    </text>
    <circle cx="26" cy="8" r="10" fill="none" stroke="${strokeColor}" stroke-width="1.5" opacity="0.6" stroke-dasharray="2,2">
      <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite"/>
    </circle>
  ` : '';

  // ✅ NOVO: Emoji do produto no centro do marcador
  const productEmoji = productStyle.emoji;

  const svgIcon = `
    <svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 0C7.163 0 0 7.163 0 16c0 13 16 26 16 26s16-13 16-26c0-8.837-7.163-16-16-16z" 
            fill="${color}" 
            stroke="${strokeColor}" 
            stroke-width="${strokeWidth}"/>
      <text x="16" y="20" text-anchor="middle" font-size="14" font-family="Arial, sans-serif">${productEmoji}</text>
      ${extremeBadge}
    </svg>
  `;

  return L.divIcon({
    html: svgIcon,
    className: 'custom-marker',
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -42]
  });
};

// Legenda de cores (para usar no futuro na UI)
export const legendColors = {
  high: { color: '#3cff00ff', label: 'ROI Alto (>100%)' },
  medium: { color: '#fbff00ff', label: 'ROI Médio (50-100%)' },
  low: { color: '#ff0000ff', label: 'ROI Baixo (<50%)' }
};
