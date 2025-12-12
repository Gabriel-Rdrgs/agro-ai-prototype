import React, { useState } from 'react';
import { supabase } from '../../services/supabase'; // Importamos o cliente que acabamos de criar
import theme from '../../styles/theme';

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
      // 🚀 LOGIN VIA SUPABASE (Padrão Moderno)
      // O frontend fala direto com o Auth Provider, sem sobrecarregar seu backend
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        throw error;
      }

      if (data.user && data.session) {
        // Sucesso! O token JWT do Supabase é o que seu backend espera agora
        const token = data.session.access_token;
        
        // Salvamos no localStorage para persistência
        localStorage.setItem('token', token);
        
        // Opcional: Salvar refresh token se precisar
        if (data.session.refresh_token) {
          localStorage.setItem('refreshToken', data.session.refresh_token);
        }

        console.log("✅ Login realizado com sucesso:", data.user.email);
        
        // Atualiza o estado global da aplicação
        onLogin({
            id: data.user.id,
            email: data.user.email,
            role: data.user.user_metadata?.role || 'user'
        });
      }
    } catch (err) {
      console.error("Erro de login:", err.message);
      setError(err.message === 'Invalid login credentials' 
        ? 'E-mail ou senha incorretos.' 
        : 'Erro ao fazer login. Tente novamente.');
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
          <p style={{ color: theme.colors.textMuted, marginTop: '5px' }}>Acesso via Supabase</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ textAlign: 'left' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', color: theme.colors.textMuted, fontWeight: 'bold', letterSpacing: '1px' }}>E-MAIL</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
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
            {loading ? 'Validando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;