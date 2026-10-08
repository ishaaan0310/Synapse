import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { getErrorMessage } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { ProgressRing, ProgressBar } from '../components/Charts';

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const scoreColor = (score) =>
  score === null || score === undefined
    ? 'var(--muted)'
    : score >= 75 ? 'var(--success)' : score >= 50 ? 'var(--warning)' : 'var(--danger)';

const BREAKDOWN_LABELS = {
  sleep: '😴 Sleep',
  activity: '🚶 Activity',
  hydration: '💧 Hydration',
  nutrition: '🍎 Nutrition',
  academic: '📚 Academic'
};

const MODULE_ICONS = {
  health: '❤️',
  nutrition: '🍎',
  academic: '📚',
  document: '📁',
  general: '🧠'
};

const daysText = (n) => (n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : `${n} days`);

function Dashboard() {
  const { user } = useAuth();
  const toast = useToast();

  const [data, setData] = useState(null);
  const [twin, setTwin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboard = useCallback(async () => {
    try {
      setError('');

      const [dashboardRes, twinRes] = await Promise.all([
        api.get('/dashboard'),
        api.get('/digital-twin').catch(() => null)
      ]);

      setData(dashboardRes.data);
      setTwin(twinRes?.data?.profile || null);
    } catch (err) {
      console.error('Dashboard error:', err);
      setError(getErrorMessage(err, 'Unable to load dashboard data'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const dismissRecommendation = async (recId) => {
    try {
      const response = await api.patch(`/digital-twin/recommendations/${recId}/dismiss`);
      setTwin(response.data.profile);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not dismiss suggestion'));
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="loading">
          <div className="spinner" />
          Loading your Synapse dashboard...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <h2>Dashboard</h2>
        <div className="error-message">{error}</div>
        <button className="btn" onClick={() => { setLoading(true); fetchDashboard(); }}>
          Try again
        </button>
      </div>
    );
  }

  const nutrition = data.todayNutrition || { totals: {}, goals: {} };
  const latest = data.latestHealth;
  const academic = data.academic || { upcomingDeadlines: [] };
  const recommendations = twin
    ? twin.recommendations.filter((r) => !r.dismissed)
    : (data.recommendations || []);

  const isNewUser =
    data.healthLogs === 0 && data.meals === 0 && data.goals === 0 && data.documents === 0;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>{greeting()}, {user?.name?.split(' ')[0] || 'there'} 👋</h2>
          <p className="muted">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        {data.streak > 0 && (
          <div className="streak-badge" title="Consecutive days with a health or meal log">
            🔥 {data.streak}-day streak
          </div>
        )}
      </div>

      {isNewUser && (
        <div className="card welcome-card">
          <h3>Welcome to Synapse! 🎉</h3>
          <p>Your digital twin learns from what you log. Start with any of these:</p>
          <div className="quick-actions">
            <Link to="/health" className="quick-action">❤️ Log health</Link>
            <Link to="/nutrition" className="quick-action">🍎 Log a meal</Link>
            <Link to="/academic" className="quick-action">📚 Add a goal</Link>
            <Link to="/documents" className="quick-action">📁 Upload a document</Link>
          </div>
        </div>
      )}

      {/* ============ ALERTS ============ */}
      {data.alerts?.length > 0 && (
        <div className="alerts">
          {data.alerts.map((alert, i) => (
            <div key={i} className={`alert alert-${alert.type}`}>
              {alert.text}
            </div>
          ))}
        </div>
      )}

      {/* ============ TOP ROW: SCORE + TODAY ============ */}
      <div className="dashboard-grid">
        <div className="card score-card">
          <h3>Wellness Score</h3>

          <ProgressRing
            value={data.wellnessScore ?? 0}
            max={100}
            size={150}
            stroke={12}
            color={scoreColor(data.wellnessScore)}
            label={data.wellnessScore ?? '–'}
            sublabel={data.wellnessScore === null ? 'needs data' : 'out of 100'}
          />

          <div className="breakdown">
            {Object.entries(data.scoreBreakdown || {}).map(([key, value]) => (
              <div key={key} className="breakdown-row">
                <span>{BREAKDOWN_LABELS[key]}</span>
                <div className="breakdown-bar">
                  <ProgressBar value={value ?? 0} max={100} color={scoreColor(value)} />
                </div>
                <strong>{value ?? '–'}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Today's Nutrition</h3>
            <Link to="/nutrition" className="link">Log meal →</Link>
          </div>

          <div className="rings-row">
            <ProgressRing
              value={nutrition.totals.calories || 0}
              max={nutrition.goals.calories || 2000}
              color="var(--primary)"
              label={Math.round(nutrition.totals.calories || 0)}
              sublabel={`/ ${nutrition.goals.calories} kcal`}
            />
            <ProgressRing
              value={nutrition.totals.protein || 0}
              max={nutrition.goals.protein || 100}
              color="var(--success)"
              label={`${Math.round(nutrition.totals.protein || 0)}g`}
              sublabel={`/ ${nutrition.goals.protein}g protein`}
            />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Latest Health</h3>
            <Link to="/health" className="link">Log →</Link>
          </div>

          {latest ? (
            <div className="mini-stats">
              <div><span>😴</span><strong>{latest.sleepHours ?? '–'}h</strong><small>Sleep</small></div>
              <div><span>🚶</span><strong>{latest.steps?.toLocaleString() ?? '–'}</strong><small>Steps</small></div>
              <div><span>❤️</span><strong>{latest.heartRate ?? '–'}</strong><small>BPM</small></div>
              <div><span>💧</span><strong>{latest.waterIntake ?? '–'}L</strong><small>Water</small></div>
            </div>
          ) : (
            <p className="muted">No health data yet.</p>
          )}

          {data.healthAverages?.sleep !== null && data.healthAverages?.sleep !== undefined && (
            <p className="muted small">
              7-day avg: {data.healthAverages.sleep}h sleep · {data.healthAverages.steps?.toLocaleString()} steps
              {data.healthAverages.weightTrend !== 'not enough data' && ` · weight ${data.healthAverages.weightTrend}`}
            </p>
          )}
        </div>
      </div>

      {/* ============ DIGITAL TWIN RECOMMENDATIONS ============ */}
      {recommendations.length > 0 && (
        <div className="card section">
          <div className="card-header">
            <h3>🧠 Your Twin Suggests</h3>
            <Link to="/chat" className="link">Ask your twin →</Link>
          </div>

          <div className="recommendations">
            {recommendations.slice(0, 5).map((rec, i) => (
              <div key={rec._id || i} className={`recommendation priority-${rec.priority}`}>
                <span className="rec-icon">{MODULE_ICONS[rec.module] || '🧠'}</span>
                <p>{rec.message}</p>
                {rec._id && (
                  <button
                    type="button"
                    className="icon-btn small"
                    onClick={() => dismissRecommendation(rec._id)}
                    title="Dismiss"
                    aria-label="Dismiss suggestion"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============ DEADLINES + EXPIRING DOCS ============ */}
      <div className="two-col section">
        <div className="card">
          <div className="card-header">
            <h3>📅 Upcoming Deadlines</h3>
            <Link to="/academic" className="link">All goals →</Link>
          </div>

          {academic.upcomingDeadlines.length === 0 ? (
            <p className="muted">
              {academic.overdue > 0 ? `No upcoming deadlines, but ${academic.overdue} overdue.` : 'No upcoming deadlines. 🎉'}
            </p>
          ) : (
            <ul className="list">
              {academic.upcomingDeadlines.map((goal) => (
                <li key={goal._id} className="list-item">
                  <div className="list-main">
                    <strong>{goal.title}</strong>
                    <ProgressBar value={goal.progress} color={goal.atRisk ? 'var(--danger)' : 'var(--primary)'} />
                  </div>
                  <span className={`pill ${goal.daysLeft <= 2 ? 'pill-danger' : goal.atRisk ? 'pill-warning' : ''}`}>
                    {daysText(goal.daysLeft)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3>📄 Expiring Documents</h3>
            <Link to="/documents" className="link">Vault →</Link>
          </div>

          {(data.expiringDocuments || []).length === 0 ? (
            <p className="muted">Nothing expires in the next 30 days. ✅</p>
          ) : (
            <ul className="list">
              {data.expiringDocuments.map((doc) => (
                <li key={doc._id} className="list-item">
                  <div className="list-main">
                    <strong>{doc.title}</strong>
                    <small className="muted">{doc.category}</small>
                  </div>
                  <span className={`pill ${doc.daysLeft <= 7 ? 'pill-danger' : 'pill-warning'}`}>
                    {daysText(doc.daysLeft)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ============ COUNTS ============ */}
      <div className="stats-grid section">
        <Link to="/academic" className="stat-card">
          <h3>Academic Goals</h3>
          <p className="stat-number" style={{ color: 'var(--primary)' }}>{data.goals}</p>
          <small className="muted">{academic.completed ?? 0} completed · {academic.avgProgress ?? 0}% avg</small>
        </Link>

        <Link to="/health" className="stat-card">
          <h3>Health Logs</h3>
          <p className="stat-number" style={{ color: 'var(--success)' }}>{data.healthLogs}</p>
          <small className="muted">all time</small>
        </Link>

        <Link to="/nutrition" className="stat-card">
          <h3>Meals Logged</h3>
          <p className="stat-number" style={{ color: 'var(--warning)' }}>{data.meals}</p>
          <small className="muted">all time</small>
        </Link>

        <Link to="/documents" className="stat-card">
          <h3>Documents</h3>
          <p className="stat-number" style={{ color: 'var(--purple)' }}>{data.documents}</p>
          <small className="muted">in your vault</small>
        </Link>
      </div>
    </div>
  );
}

export default Dashboard;
