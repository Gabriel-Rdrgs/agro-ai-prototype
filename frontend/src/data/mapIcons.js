import L from 'leaflet';
import theme from '../styles/theme';

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

  // Cria um ícone SVG customizado
  const svgIcon = `
    <svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 0C7.163 0 0 7.163 0 16c0 13 16 26 16 26s16-13 16-26c0-8.837-7.163-16-16-16z" 
            fill="${color}" 
            stroke="#fff" 
            stroke-width="2"/>
      <circle cx="16" cy="16" r="6" fill="#fff"/>
    </svg>
  `;

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
export function createRiskIcon(roi, riskLevel, hasExtremeEvents = false, extremeEventSeverity = null) {
  let color;
  
  if (roi >= 100) {
    color = '#22c55e';
  } else if (roi >= 50) {
    color = theme.colors.secondary; // roxo
  } else {
    color = theme.colors.warning; // vermelho
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

  // Badge de evento extremo (canto superior direito)
  const extremeBadge = hasExtremeEvents ? `
    <circle cx="26" cy="8" r="6" fill="${strokeColor}" stroke="#fff" stroke-width="1.5"/>
    <text x="26" y="11" text-anchor="middle" fill="#fff" font-size="10" font-weight="bold">
      ${extremeEventSeverity === 'extreme' ? '!' : '⚠'}
    </text>
  ` : '';

  const svgIcon = `
    <svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 0C7.163 0 0 7.163 0 16c0 13 16 26 16 26s16-13 16-26c0-8.837-7.163-16-16-16z" 
            fill="${color}" 
            stroke="${strokeColor}" 
            stroke-width="${strokeWidth}"/>
      <circle cx="16" cy="16" r="6" fill="#fff"/>
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
