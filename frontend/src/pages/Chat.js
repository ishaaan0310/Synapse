import React, { useEffect, useState, useRef } from 'react';
import api from '../utils/api';

function Chat() {

  const [messages, setMessages] = useState([]);

  const [input, setInput] = useState('');

  const [loading, setLoading] = useState(true);

  const [sending, setSending] = useState(false);

  const [error, setError] = useState('');

  const messagesEndRef = useRef(null);

  // ==========================================
  // LOAD CHAT HISTORY
  // ==========================================

  const fetchMessages = async () => {

    try {

      setLoading(true);

      const response = await api.get('/chat');

      setMessages(response.data);

    } catch (err) {

      console.error('Chat history error:', err);

      setError(
        err.response?.data?.message ||
        'Unable to load conversation'
      );

    } finally {

      setLoading(false);

    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  // ==========================================
  // AUTO SCROLL
  // ==========================================

  useEffect(() => {

    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth'
    });

  }, [messages]);

  // ==========================================
  // SEND MESSAGE
  // ==========================================

  const sendMessage = async (e) => {

    e.preventDefault();

    if (!input.trim() || sending) {
      return;
    }

    try {

      setSending(true);

      setError('');

      const response = await api.post('/chat', {
        content: input.trim()
      });

      setMessages(prev => [
        ...prev,
        response.data.userMessage,
        response.data.assistantMessage
      ]);

      setInput('');

    } catch (err) {

      console.error('Chat send error:', err);

      setError(
        err.response?.data?.message ||
        'Unable to send message'
      );

    } finally {

      setSending(false);

    }
  };

  return (

    <div className="page">

      <h2>🤖 AI Twin</h2>

      <div
        className="card"
        style={{
          maxWidth: '900px',
          margin: '0 auto'
        }}
      >

        {/* ====================================
            CHAT AREA
        ===================================== */}

        <div
          style={{
            height: '500px',
            overflowY: 'auto',
            padding: '1rem',
            marginBottom: '1rem',
            background: '#f7f7ff',
            borderRadius: '12px'
          }}
        >

          {loading ? (

            <p>Loading your conversation...</p>

          ) : messages.length === 0 ? (

            <div
              style={{
                textAlign: 'center',
                padding: '5rem 1rem'
              }}
            >

              <div
                style={{
                  fontSize: '4rem'
                }}
              >
                🧠
              </div>

              <h3>
                Your Digital Twin is ready
              </h3>

              <p>
                Ask me about your health,
                nutrition or academic progress.
              </p>

            </div>

          ) : (

            messages.map((message) => (

              <div
                key={message._id}
                style={{
                  display: 'flex',
                  justifyContent:
                    message.role === 'user'
                      ? 'flex-end'
                      : 'flex-start',
                  marginBottom: '1rem'
                }}
              >

                <div
                  style={{
                    maxWidth: '75%',
                    padding: '0.9rem 1.1rem',
                    borderRadius: '16px',
                    background:
                      message.role === 'user'
                        ? '#667eea'
                        : '#ffffff',
                    color:
                      message.role === 'user'
                        ? 'white'
                        : '#222',
                    boxShadow:
                      '0 2px 8px rgba(0,0,0,0.08)'
                  }}
                >

                  <div
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 'bold',
                      marginBottom: '0.3rem',
                      opacity: 0.7
                    }}
                  >
                    {message.role === 'user'
                      ? 'You'
                      : '🧠 Synapse'}
                  </div>

                  <div>
                    {message.content}
                  </div>

                </div>

              </div>

            ))

          )}

          <div ref={messagesEndRef} />

        </div>

        {/* ====================================
            ERROR
        ===================================== */}

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* ====================================
            INPUT
        ===================================== */}

        <form
          onSubmit={sendMessage}
          style={{
            display: 'flex',
            gap: '0.75rem'
          }}
        >

          <input
            type="text"
            placeholder="Ask your Digital Twin..."
            value={input}
            onChange={(e) =>
              setInput(e.target.value)
            }
            disabled={sending}
            style={{
              marginBottom: 0
            }}
          />

          <button
            type="submit"
            className="btn"
            disabled={
              sending ||
              !input.trim()
            }
          >
            {sending
              ? '...'
              : 'Send'}
          </button>

        </form>

        {/* ====================================
            SUGGESTIONS
        ===================================== */}

        <div
          style={{
            marginTop: '1rem',
            display: 'flex',
            gap: '0.5rem',
            flexWrap: 'wrap'
          }}
        >

          {[
            'How is my health?',
            'How many calories did I eat today?',
            'What should I study next?'
          ].map((suggestion) => (

            <button
              key={suggestion}
              type="button"
              onClick={() =>
                setInput(suggestion)
              }
              style={{
                padding: '0.5rem 0.8rem',
                borderRadius: '20px',
                border: '1px solid #ddd',
                background: '#fff',
                cursor: 'pointer'
              }}
            >
              {suggestion}
            </button>

          ))}

        </div>

      </div>

    </div>
  );
}

export default Chat;