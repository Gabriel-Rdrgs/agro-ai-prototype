// frontend/src/components/Chat/AgronomicChat.jsx
import React, { useState, useRef, useEffect } from 'react';
import { chatService } from '../../services/api';
import './AgronomicChat.css'; // Vamos criar esse CSS logo abaixo

const AgronomicChat = () => {
  const [messages, setMessages] = useState([
    { 
      id: 1, 
      type: 'bot', 
      text: 'Olá! Sou seu Consultor Agronômico IA. 🍅\nPosso responder dúvidas sobre manuais técnicos, clima e manejo.\n\nComo posso ajudar hoje?' 
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll para o final
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    // 1. Adiciona pergunta do usuário
    const userMsg = { id: Date.now(), type: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // 2. Chama a API
      const data = await chatService.askAgronomist(userMsg.text);
      
      // 3. Adiciona resposta da IA
      const botMsg = { 
        id: Date.now() + 1, 
        type: 'bot', 
        text: data.answer,
        sources: data.sources 
      };
      setMessages(prev => [...prev, botMsg]);

    } catch (error) {
      setMessages(prev => [...prev, { 
        id: Date.now() + 1, 
        type: 'bot', 
        text: "Desculpe, tive um problema de conexão. Tente novamente." 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h3>🌱 Consultor IA (Beta)</h3>
      </div>

      <div className="chat-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.type}`}>
            <div className="message-bubble">
              {/* Renderiza quebras de linha (\n) corretamente */}
              <p style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</p>
              
              {msg.sources && msg.sources.length > 0 && (
                <div className="message-sources">
                  <small>📚 Fonte: {msg.sources.join(', ')}</small>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="message bot">
            <div className="message-bubble loading">
              Thinking... 🧠
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-area" onSubmit={handleSend}>
        <input
          type="text"
          placeholder="Ex: Qual a temperatura ideal para tomate?"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        <button type="submit" disabled={loading || !input.trim()}>
          ➤
        </button>
      </form>
    </div>
  );
};

export default AgronomicChat;