import React, { useState } from 'react';
import theme from '../../styles/theme';

// URL Base padronizada (Raiz do servidor)
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 🚀 CORREÇÃO: Adicionamos /api aqui para casar com o server.js
      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Sucesso! Salva o token
        localStorage.setItem('token', data.accessToken); // Backend retorna 'accessToken'
        
        // Se tiver refresh token, salva também
        if (data.refreshToken) {
            localStorage.setItem('refreshToken', data.refreshToken);
        }
        
        onLogin(data.user); 
      } else {
        setError(data.error || 'Falha na autenticação');
      }
    } catch (err) {
      console.error("Erro de conexão:", err);
      setError('Erro ao conectar com o servidor. Verifique se o Backend está rodando.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: `linear-gradient(135deg, ${theme.colors.background} 0%, #0f172a 100%)`,
      fontFamily: theme.font,
      color: theme.colors.textPrimary
    }}>
      <div style={{
        background: '#1e293b',
        padding: '40px',
        borderRadius: '24px',
        boxShadow: `0 20px 50px rgba(0,0,0,0.5), 0 0 0 1px ${theme.colors.border}`,
        width: '100%',
        maxWidth: '400px',
        textAlign: 'center'
      }}>
        <div style={{ marginBottom: '30px' }}>
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>🚀</div>
          <h1 style={{ margin: 0, fontSize: '24px', color: theme.colors.textPrimary }}>AgroArbitrage AI</h1>
          <p style={{ color: theme.colors.textMuted, marginTop: '5px' }}>Acesso Corporativo</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ textAlign: 'left' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', color: theme.colors.textMuted, fontWeight: 'bold', letterSpacing: '1px' }}>E-MAIL</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@agro.com"
              required
              style={{
                width: '100%',
                padding: '12px',
                background: theme.colors.background,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: '8px',
                color: 'white',
                outline: 'none',
                fontSize: '16px'
              }}
            />
          </div>

          <div style={{ textAlign: 'left' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', color: theme.colors.textMuted, fontWeight: 'bold', letterSpacing: '1px' }}>SENHA</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              required
              style={{
                width: '100%',
                padding: '12px',
                background: theme.colors.background,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: '8px',
                color: 'white',
                outline: 'none',
                fontSize: '16px'
              }}
            />
          </div>

          {error && (
            <div style={{ color: '#ef4444', fontSize: '14px', background: 'rgba(239,68,68,0.1)', padding: '10px', borderRadius: '6px' }}>
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            style={{
              padding: '14px',
              background: `linear-gradient(90deg, ${theme.colors.accent} 0%, #0099ff 100%)`,
              border: 'none',
              borderRadius: '8px',
              color: '#000',
              fontWeight: 'bold',
              fontSize: '16px',
              cursor: loading ? 'wait' : 'pointer',
              transition: 'transform 0.2s',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Entrando...' : 'Acessar Sistema'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;