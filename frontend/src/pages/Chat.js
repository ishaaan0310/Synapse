import React, { useEffect, useRef, useState } from 'react';
import api, { getErrorMessage } from '../utils/api';
import { useToast } from '../components/Toast';

const BASIC_SUGGESTIONS = [
  'How am I doing?',
  'How did I sleep?',
  'How many calories today?',
  'What deadlines are coming up?',
  "What's my weight trend?",
  'Any documents expiring?'
];

// When the Gemini agent is on, it can also take actions
const AGENT_SUGGESTIONS = [
  'How am I doing this week?',
  'I had 2 rotis and dal for lunch',
  'Plan my prep for my next exam',
  'Why might I be feeling tired?',
  'I slept 6 hours and drank 2L water',
  'What should I focus on today?'
];

const TOOL_ICONS = {
  log_meal: '🍽️',
  log_health_metric: '❤️',
  create_goal: '🎯',
  add_milestones: '🧩',
  set_milestone_status: '☑️',
  update_goal: '✏️',
  set_nutrition_goals: '🍎'
};

const STATUS_LABELS = {
  confirmed: '✅ Done',
  cancelled: 'Cancelled',
  failed: '⚠️ Failed',
  expired: 'Expired',
  executing: 'Applying…'
};

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

// A change the AI wants to make, waiting for the user's OK
function ActionCard({ action, busy, onConfirm, onCancel }) {
  const pending = action.status === 'pending';

  return (
    <div className={`action-card status-${action.status}`}>
      <div className="action-header">
        <span className="action-icon">{TOOL_ICONS[action.tool] || '⚡'}</span>
        <strong>{action.summary}</strong>
      </div>

      {action.details?.length > 0 && (
        <ul className="action-details">
          {action.details.map((detail, i) => <li key={i}>{detail}</li>)}
        </ul>
      )}

      {pending ? (
        <div className="action-buttons">
          <button type="button" className="btn small" disabled={busy} onClick={() => onConfirm(action)}>
            {busy ? 'Saving…' : '✓ Confirm'}
          </button>
          <button type="button" className="btn btn-secondary small" disabled={busy} onClick={() => onCancel(action)}>
            Cancel
          </button>
        </div>
      ) : (
        <div className="action-status">{STATUS_LABELS[action.status] || action.status}</div>
      )}
    </div>
  );
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
  const [agent, setAgent] = useState({ enabled: false });
  const [busyAction, setBusyAction] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // ==========================================
  // LOAD CHAT HISTORY + AGENT STATUS
  // ==========================================

  useEffect(() => {
    const load = async () => {
      try {
        const [historyRes, statusRes] = await Promise.all([
          api.get('/chat'),
          api.get('/agent/status').catch(() => ({ data: { enabled: false } }))
        ]);
        setMessages(historyRes.data);
        setAgent(statusRes.data);
      } catch (err) {
        console.error('Chat history error:', err);
        setError(getErrorMessage(err, 'Unable to load conversation'));
      } finally {
        setLoading(false);
      }
    };

    load();
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

  // ==========================================
  // CONFIRM / CANCEL AGENT ACTIONS
  // ==========================================

  const replaceAction = (updated) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.actions?.some((a) => a._id === updated._id)
          ? { ...m, actions: m.actions.map((a) => (a._id === updated._id ? updated : a)) }
          : m
      )
    );
  };

  const resolveAction = async (action, decision) => {
    try {
      setBusyAction(action._id);
      const response = await api.post(`/agent/actions/${action._id}/${decision}`);
      replaceAction(response.data.action);

      if (response.data.message) {
        setMessages((prev) => [...prev, response.data.message]);
      }

      if (decision === 'confirm') {
        if (response.data.action.status === 'confirmed') toast.success(response.data.action.resultMessage || 'Saved');
        else toast.error(response.data.action.resultMessage || 'Could not apply change');
      }
    } catch (err) {
      if (err.response?.data?.action) replaceAction(err.response.data.action);
      toast.error(getErrorMessage(err, 'Could not update this action'));
    } finally {
      setBusyAction(null);
    }
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

  const suggestions = agent.enabled ? AGENT_SUGGESTIONS : BASIC_SUGGESTIONS;

  return (
    <div className="page chat-page">
      <div className="page-header">
        <div>
          <h2>🤖 AI Twin</h2>
          <span
            className={`pill ${agent.enabled ? 'pill-success' : ''}`}
            title={agent.enabled ? `Powered by ${agent.model}` : 'Add GEMINI_API_KEY to backend/.env to enable the AI agent'}
          >
            {agent.enabled ? `✨ AI agent · ${agent.model}` : 'Basic mode'}
          </span>
        </div>
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
                {agent.enabled
                  ? 'Ask me anything about your health, food, studies or documents. I can also log meals, create study plans and update goals for you. You confirm every change.'
                  : 'I learn from your health, nutrition, academic and document data. Try one of the suggestions below.'}
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

                  {message.actions?.length > 0 && (
                    <div className="action-list">
                      {message.actions.map((action) => (
                        <ActionCard
                          key={action._id}
                          action={action}
                          busy={busyAction === action._id}
                          onConfirm={(a) => resolveAction(a, 'confirm')}
                          onCancel={(a) => resolveAction(a, 'cancel')}
                        />
                      ))}
                    </div>
                  )}

                  <div className="bubble-time">
                    {message.source === 'agent' && message.role === 'assistant' && <span title="AI agent">✨ </span>}
                    {formatTime(message.timestamp)}
                  </div>
                </div>
              </div>
            ))
          )}

          {sending && (
            <div className="message-row assistant">
              <div className="bot-avatar">🧠</div>
              <div className="bubble assistant typing" aria-label="Twin is thinking">
                <span /><span /><span />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="chips">
          {suggestions.map((suggestion) => (
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
            placeholder={agent.enabled ? 'Ask or tell your twin anything…' : 'Ask your Digital Twin...'}
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
