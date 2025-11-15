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
export function createRiskIcon(roi, riskLevel) {
  let color;
  
  if (roi >= 100) {
    color = '#22c55e';
  } else if (roi >= 50) {
    color = theme.colors.secondary; // roxo
  } else {
    color = theme.colors.warning; // vermelho
  }

  const strokeColor = riskLevel === 3 ? '#dc2626' : '#fff';
  const strokeWidth = riskLevel === 3 ? '3' : '2';

  const svgIcon = `
    <svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 0C7.163 0 0 7.163 0 16c0 13 16 26 16 26s16-13 16-26c0-8.837-7.163-16-16-16z" 
            fill="${color}" 
            stroke="${strokeColor}" 
            stroke-width="${strokeWidth}"/>
      <circle cx="16" cy="16" r="6" fill="#fff"/>
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
  high: { color: '#22c55e', label: 'ROI Alto (>100%)' },
  medium: { color: '#f59e0b', label: 'ROI Médio (50-100%)' },
  low: { color: '#ef4444', label: 'ROI Baixo (<50%)' }
};
