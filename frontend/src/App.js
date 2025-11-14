import React from 'react';
import MapView from './components/Map/MapView';
import './App.css';

function App() {
  return (
    <div className="App">
      <header style={{
        backgroundColor: '#2c5f2d',
        padding: '20px',
        color: 'white',
        textAlign: 'center'
      }}>
        <h1>🌾 Sistema de Inteligência de Arbitragem Agrícola</h1>
        <p>Protótipo v0.1 - Mapa de Oportunidades</p>
      </header>
      <MapView />
    </div>
  );
}

export default App;
