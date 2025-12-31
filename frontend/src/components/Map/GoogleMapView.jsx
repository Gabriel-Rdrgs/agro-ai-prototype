// frontend/src/components/Map/GoogleMapView.jsx
/**
 * 🗺️ Protótipo: Google Maps View
 * 
 * Este é um protótipo básico do Google Maps para comparação com Leaflet.
 * NÃO substitui o MapView.jsx atual - é apenas para testes e avaliação.
 * 
 * Para usar:
 * 1. Adicione REACT_APP_GOOGLE_MAPS_API_KEY no .env.local
 * 2. Importe este componente onde quiser testar
 * 3. Compare funcionalidades e performance com Leaflet
 */

import React, { useEffect, useRef, useState } from 'react';

// ⚠️ IMPORTANTE: Google Maps precisa ser carregado via script tag
// Adicione no index.html ou carregue dinamicamente
const loadGoogleMapsScript = (apiKey) => {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.maps) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Erro ao carregar Google Maps'));
    document.head.appendChild(script);
  });
};

const GoogleMapView = ({ 
  opportunities = [], 
  center = { lat: -15.7975, lng: -47.8919 }, // Centro do Brasil
  zoom = 5,
  onMarkerClick = null 
}) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);

  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!apiKey) {
      setError('REACT_APP_GOOGLE_MAPS_API_KEY não configurada');
      return;
    }

    loadGoogleMapsScript(apiKey)
      .then(() => {
        setIsLoaded(true);
      })
      .catch((err) => {
        setError(err.message);
      });
  }, [apiKey]);

  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;

    // Inicializa o mapa
    const map = new window.google.maps.Map(mapRef.current, {
      center: center,
      zoom: zoom,
      mapTypeId: 'roadmap',
      styles: [
        // Estilo escuro similar ao Leaflet
        { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
        {
          featureType: 'water',
          elementType: 'geometry',
          stylers: [{ color: '#17263c' }]
        }
      ]
    });

    mapInstanceRef.current = map;

    // Limpa marcadores anteriores
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Adiciona marcadores para cada oportunidade
    opportunities.forEach((opp) => {
      if (!opp.coords || !opp.coords.lat || !opp.coords.lng) return;

      const marker = new window.google.maps.Marker({
        position: { lat: opp.coords.lat, lng: opp.coords.lng },
        map: map,
        title: `${opp.product} - ${opp.origin?.city || 'N/A'}`,
        icon: {
          url: opp.financials?.roi > 50 
            ? 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
            : opp.financials?.roi > 20
            ? 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png'
            : 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
          scaledSize: new window.google.maps.Size(32, 32)
        }
      });

      // Info Window com dados da oportunidade
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="color: #000; padding: 8px;">
            <h3 style="margin: 0 0 8px 0;">${opp.product}</h3>
            <p style="margin: 4px 0;"><strong>Origem:</strong> ${opp.origin?.city || 'N/A'}, ${opp.origin?.state || ''}</p>
            <p style="margin: 4px 0;"><strong>ROI:</strong> ${opp.financials?.roi ? `${opp.financials.roi.toFixed(1)}%` : 'N/A'}</p>
            <p style="margin: 4px 0;"><strong>Preço Compra:</strong> R$ ${opp.financials?.buyPrice?.toFixed(2) || 'N/A'}</p>
            <p style="margin: 4px 0;"><strong>Preço Venda:</strong> R$ ${opp.financials?.sellPrice?.toFixed(2) || 'N/A'}</p>
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
        if (onMarkerClick) {
          onMarkerClick(opp);
        }
      });

      markersRef.current.push(marker);
    });
  }, [isLoaded, opportunities, center, zoom, onMarkerClick]);

  if (error) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        color: '#ef4444',
        background: 'rgba(239, 68, 68, 0.1)',
        borderRadius: '12px',
        border: '1px solid rgba(239, 68, 68, 0.3)'
      }}>
        <h3>⚠️ Erro ao carregar Google Maps</h3>
        <p>{error}</p>
        <p style={{ fontSize: '0.9rem', marginTop: '10px', color: '#94a3b8' }}>
          Configure REACT_APP_GOOGLE_MAPS_API_KEY no .env.local
        </p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        color: '#94a3b8',
        background: 'rgba(15, 23, 42, 0.5)',
        borderRadius: '12px',
        border: '1px solid rgba(148, 163, 184, 0.1)'
      }}>
        <div style={{ fontSize: '24px', marginBottom: '12px' }}>⏳</div>
        <div>Carregando Google Maps...</div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div 
        ref={mapRef} 
        style={{ 
          width: '100%', 
          height: '600px',
          borderRadius: '12px',
          border: '1px solid rgba(148, 163, 184, 0.1)'
        }} 
      />
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        background: 'rgba(15, 23, 42, 0.9)',
        padding: '8px 12px',
        borderRadius: '6px',
        color: '#e2e8f0',
        fontSize: '0.85rem',
        border: '1px solid rgba(148, 163, 184, 0.2)'
      }}>
        🗺️ Google Maps (Protótipo)
      </div>
    </div>
  );
};

export default GoogleMapView;

