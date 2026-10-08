import React, { useEffect, useRef, useState } from 'react';
import api, { getErrorMessage } from '../utils/api';
import { useToast } from '../components/Toast';

const SUGGESTIONS = [
  'How am I doing?',
  'How did I sleep?',
  'How many calories today?',
  'What deadlines are coming up?',
  "What's my weight trend?",
  'Any documents expiring?'
];

// Render **bold** and line breaks safely (no dangerouslySetInnerHTML)
function FormattedText({ text }) {
  return text.split('\n').map((line, lineIndex) => (
    <React.Fragment key={lineIndex}>
      {lineIndex > 0 && <br />}
      {line.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
        part.startsWith('**') && part.endsWith('**')
          ? <strong key={i}>{part.slice(2, -2)}</strong>
          : <React.Fragment key={i}>{part}</React.Fragment>
      )}
    </React.Fragment>
  ));
}

const formatTime = (date) =>
  new Date(date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

function Chat() {
  const toast = useToast();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // ==========================================
  // LOAD CHAT HISTORY
  // ==========================================

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await api.get('/chat');
        setMessages(response.data);
      } catch (err) {
        console.error('Chat history error:', err);
        setError(getErrorMessage(err, 'Unable to load conversation'));
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, []);

  // ==========================================
  // AUTO SCROLL
  // ==========================================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, sending]);

  // ==========================================
  // SEND MESSAGE
  // ==========================================

  const sendMessage = async (text) => {
    const content = (text ?? input).trim();

    if (!content || sending) return;

    // Show the user's message immediately
    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { _id: tempId, role: 'user', content, timestamp: new Date().toISOString(), pending: true }
    ]);
    setInput('');
    setSending(true);
    setError('');

    try {
      const response = await api.post('/chat', { content });

      setMessages((prev) => [
        ...prev.filter((m) => m._id !== tempId),
        response.data.userMessage,
        response.data.assistantMessage
      ]);
    } catch (err) {
      console.error('Chat send error:', err);
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
      setInput(content);
      setError(getErrorMessage(err, 'Unable to send message'));
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage();
  };

  const clearChat = async () => {
    if (!window.confirm('Clear your entire conversation with your twin?')) return;

    try {
      await api.delete('/chat');
      setMessages([]);
      toast.success('Conversation cleared');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not clear chat'));
    }
  };

  return (
    <div className="page chat-page">
      <div className="page-header">
        <h2>🤖 AI Twin</h2>
        {messages.length > 0 && (
          <button type="button" className="btn btn-secondary small" onClick={clearChat}>
            🧹 Clear chat
          </button>
        )}
      </div>

      <div className="card chat-card">
        <div className="chat-window">
          {loading ? (
            <div className="loading"><div className="spinner" />Loading your conversation...</div>
          ) : messages.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🧠</div>
              <h3>Your Digital Twin is ready</h3>
              <p className="muted">
                I learn from your health, nutrition, academic and document data.
                Try one of the suggestions below.
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message._id} className={`message-row ${message.role}`}>
                {message.role === 'assistant' && <div className="bot-avatar">🧠</div>}
                <div className={`bubble ${message.role} ${message.pending ? 'pending' : ''}`}>
                  <div className="bubble-text">
                    <FormattedText text={message.content} />
                  </div>
                  <div className="bubble-time">{formatTime(message.timestamp)}</div>
                </div>
              </div>
            ))
          )}

          {sending && (
            <div className="message-row assistant">
              <div className="bot-avatar">🧠</div>
              <div className="bubble assistant typing" aria-label="Twin is typing">
                <span /><span /><span />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="chips">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              className="chip"
              disabled={sending}
              onClick={() => sendMessage(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="chat-input">
          <input
            ref={inputRef}
            type="text"
            placeholder="Ask your Digital Twin..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength="1000"
            autoFocus
          />

          <button type="submit" className="btn" disabled={sending || !input.trim()}>
            {sending ? '…' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Chat;
