import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { getErrorMessage } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { ProgressBar, TwinCore, Skeleton } from '../components/Charts';
import Icon from '../components/Icons';

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

// The five parts of the wellness score, each with its own colour
const CORE_LABELS = {
  sleep: 'Sleep',
  activity: 'Activity',
  hydration: 'Hydration',
  nutrition: 'Nutrition',
  academic: 'Academic'
};

const CORE_COLORS = {
  sleep: 'var(--sleep)',
  activity: 'var(--health)',
  hydration: 'var(--water)',
  nutrition: 'var(--nutrition)',
  academic: 'var(--academic)'
};

const MODULE_ICONS = {
  health: 'health',
  nutrition: 'nutrition',
  academic: 'academic',
  document: 'documents',
  general: 'twin'
};

const ALERT_ICONS = { danger: 'alert', warning: 'alert', info: 'info' };

// Server alert text starts with an emoji; the icon replaces it here
const stripEmoji = (text = '') => text.replace(/^[^\p{L}\p{N}"“]+/u, '');

const daysText = (n) => (n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : `${n} days`);

function Dashboard() {
  const { user } = useAuth();
  const toast = useToast();

  const [data, setData] = useState(null);
  const [twin, setTwin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loggingWater, setLoggingWater] = useState(false);

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

  // Quick action: log a glass of water (500 ml) without leaving the dashboard
  const quickLogWater = async () => {
    try {
      setLoggingWater(true);
      await api.post('/health', { waterIntake: 0.5, notes: 'Quick +500 ml water' });
      toast.success('Logged 500 ml of water');
      await fetchDashboard();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not log water'));
    } finally {
      setLoggingWater(false);
    }
  };

  if (loading) {
    return (
      <div className="page" aria-busy="true">
        <Skeleton height={44} />
        <div className="hero section">
          <div className="hero-core"><Skeleton height={220} /></div>
          <div className="hero-today"><Skeleton lines={5} /></div>
        </div>
        <div className="two-col section">
          <div className="card"><Skeleton lines={4} /></div>
          <div className="card"><Skeleton lines={4} /></div>
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

  const calories = Math.round(nutrition.totals.calories || 0);
  const protein = Math.round(nutrition.totals.protein || 0);

  return (
    <div className="page dashboard">
      <header className="page-header">
        <div>
          <h2 className="greeting">{greeting()}, {user?.name?.split(' ')[0] || 'there'}</h2>
          <p className="muted">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        {data.streak > 0 && (
          <div className="streak-badge" title="Days in a row with a health or meal log">
            <Icon name="flame" size={18} />
            {data.streak}-day streak
          </div>
        )}
      </header>

      {isNewUser && (
        <section className="card welcome-card">
          <h3>Your twin learns from what you log</h3>
          <p>Add something in any area and your dashboard will fill in.</p>
          <div className="quick-actions">
            <Link to="/health" className="quick-action mod-health"><Icon name="health" size={18} />Log health</Link>
            <Link to="/nutrition" className="quick-action mod-nutrition"><Icon name="nutrition" size={18} />Log a meal</Link>
            <Link to="/academic" className="quick-action mod-academic"><Icon name="academic" size={18} />Add a goal</Link>
            <Link to="/documents" className="quick-action mod-documents"><Icon name="documents" size={18} />Upload a document</Link>
          </div>
        </section>
      )}

      {/* ============ HERO: TWIN CORE + TODAY ============ */}
      <section className="hero">
        <div className="hero-core">
          <TwinCore
            score={data.wellnessScore}
            breakdown={data.scoreBreakdown}
            labels={CORE_LABELS}
            colors={CORE_COLORS}
          />

          <ul className="core-legend">
            {Object.entries(CORE_LABELS).map(([key, label]) => (
              <li key={key}>
                <span className="legend-dot" style={{ background: CORE_COLORS[key] }} />
                <span>{label}</span>
                <strong>{data.scoreBreakdown?.[key] ?? '–'}</strong>
              </li>
            ))}
          </ul>
        </div>

        <div className="hero-today">
          <div className="today-block">
            <div className="block-header">
              <h3>Today's food</h3>
              <Link to="/nutrition" className="link">Log a meal</Link>
            </div>

            <div className="today-meter mod-nutrition">
              <div className="meter-row">
                <span><Icon name="flame" size={16} /> Calories</span>
                <span className="num"><strong>{calories}</strong> / {nutrition.goals.calories} kcal</span>
              </div>
              <ProgressBar value={calories} max={nutrition.goals.calories || 2000} color="var(--nutrition)" />
            </div>

            <div className="today-meter">
              <div className="meter-row">
                <span><Icon name="protein" size={16} /> Protein</span>
                <span className="num"><strong>{protein}</strong> / {nutrition.goals.protein} g</span>
              </div>
              <ProgressBar value={protein} max={nutrition.goals.protein || 100} color="var(--brand)" />
            </div>
          </div>

          <div className="today-block">
            <div className="block-header">
              <h3>Latest health log</h3>
              <div className="block-actions">
                <button type="button" className="chip water-chip" onClick={quickLogWater} disabled={loggingWater}>
                  <Icon name="water" size={15} />{loggingWater ? 'Logging…' : '+500 ml water'}
                </button>
                <Link to="/health" className="link">Log health</Link>
              </div>
            </div>

            {latest ? (
              <div className="vitals">
                <div className="vital" style={{ '--tone': 'var(--sleep)' }}>
                  <Icon name="sleep" size={18} />
                  <strong className="num">{latest.sleepHours ?? '–'}<small>h</small></strong>
                  <span>Sleep</span>
                </div>
                <div className="vital" style={{ '--tone': 'var(--health)' }}>
                  <Icon name="steps" size={18} />
                  <strong className="num">{latest.steps?.toLocaleString() ?? '–'}</strong>
                  <span>Steps</span>
                </div>
                <div className="vital" style={{ '--tone': 'var(--health)' }}>
                  <Icon name="heart" size={18} />
                  <strong className="num">{latest.heartRate ?? '–'}<small>bpm</small></strong>
                  <span>Heart rate</span>
                </div>
                <div className="vital" style={{ '--tone': 'var(--water)' }}>
                  <Icon name="water" size={18} />
                  <strong className="num">{latest.waterIntake ?? '–'}<small>L</small></strong>
                  <span>Water</span>
                </div>
              </div>
            ) : (
              <p className="muted">No health data yet. Log sleep, steps or water to see it here.</p>
            )}

            {data.healthAverages?.sleep !== null && data.healthAverages?.sleep !== undefined && (
              <p className="muted small">
                Last 7 days: {data.healthAverages.sleep}h sleep and {data.healthAverages.steps?.toLocaleString()} steps on average
                {data.healthAverages.weightTrend !== 'not enough data' && `, weight ${data.healthAverages.weightTrend}`}.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ============ ALERTS ============ */}
      {data.alerts?.length > 0 && (
        <section className="alerts section" aria-label="Alerts">
          {data.alerts.map((alert, i) => (
            <div key={i} className={`alert alert-${alert.type}`}>
              <Icon name={ALERT_ICONS[alert.type] || 'info'} size={18} />
              <span>{stripEmoji(alert.text)}</span>
            </div>
          ))}
        </section>
      )}

      {/* ============ DIGITAL TWIN SUGGESTIONS ============ */}
      {recommendations.length > 0 && (
        <section className="card section twin-card">
          <div className="card-header">
            <h3><Icon name="sparkle" size={20} className="title-icon" /> Your twin suggests</h3>
            <Link to="/chat" className="link">Ask your twin</Link>
          </div>

          <ul className="recommendations">
            {recommendations.slice(0, 5).map((rec, i) => (
              <li key={rec._id || i} className={`recommendation priority-${rec.priority} mod-${rec.module === 'document' ? 'documents' : rec.module}`}>
                <span className="rec-icon"><Icon name={MODULE_ICONS[rec.module] || 'twin'} size={18} /></span>
                <p>{rec.message}</p>
                {rec._id && (
                  <button
                    type="button"
                    className="icon-btn small ghost"
                    onClick={() => dismissRecommendation(rec._id)}
                    title="Dismiss"
                    aria-label="Dismiss suggestion"
                  >
                    <Icon name="x" size={16} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ============ DEADLINES + EXPIRING DOCS ============ */}
      <div className="two-col section">
        <section className="card mod-academic">
          <div className="card-header">
            <h3><Icon name="calendar" size={20} className="title-icon" /> Upcoming deadlines</h3>
            <Link to="/academic" className="link">All goals</Link>
          </div>

          {academic.upcomingDeadlines.length === 0 ? (
            <p className="muted">
              {academic.overdue > 0 ? `No upcoming deadlines, but ${academic.overdue} goal(s) are overdue.` : 'No upcoming deadlines.'}
            </p>
          ) : (
            <ul className="list">
              {academic.upcomingDeadlines.map((goal) => (
                <li key={goal._id} className="list-item">
                  <div className="list-main">
                    <strong>{goal.title}</strong>
                    <ProgressBar value={goal.progress} color={goal.atRisk ? 'var(--danger)' : 'var(--academic)'} />
                  </div>
                  <span className={`pill ${goal.daysLeft <= 2 ? 'pill-danger' : goal.atRisk ? 'pill-warning' : ''}`}>
                    {daysText(goal.daysLeft)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card mod-documents">
          <div className="card-header">
            <h3><Icon name="file" size={20} className="title-icon" /> Expiring documents</h3>
            <Link to="/documents" className="link">Open vault</Link>
          </div>

          {(data.expiringDocuments || []).length === 0 ? (
            <p className="muted">Nothing expires in the next 30 days.</p>
          ) : (
            <ul className="list">
              {data.expiringDocuments.map((doc) => (
                <li key={doc._id} className="list-item">
                  <div className="list-main">
                    <strong>{doc.title}</strong>
                    <small className="muted cap">{doc.category === 'id' ? 'ID' : doc.category}</small>
                  </div>
                  <span className={`pill ${doc.daysLeft <= 7 ? 'pill-danger' : 'pill-warning'}`}>
                    {daysText(doc.daysLeft)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* ============ RECENT ACTIVITY ============ */}
      <div className="two-col section">
        <section className="card mod-health">
          <div className="card-header">
            <h3><Icon name="health" size={20} className="title-icon" /> Recent health logs</h3>
            <Link to="/health" className="link">All logs</Link>
          </div>
          {data.recentActivity?.health?.length > 0 ? (
            <ul className="activity">
              {data.recentActivity.health.map((item) => (
                <li key={item._id}>
                  <div>
                    <strong>
                      {[
                        item.sleepHours != null && `${item.sleepHours}h sleep`,
                        item.steps != null && `${item.steps.toLocaleString()} steps`,
                        item.waterIntake != null && `${item.waterIntake}L water`
                      ].filter(Boolean).join(', ') || 'Health entry'}
                    </strong>
                    {item.heartRate != null && <small className="muted">{item.heartRate} bpm resting heart rate</small>}
                  </div>
                  <time className="muted small">{new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</time>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No health logs yet.</p>
          )}
        </section>

        <section className="card mod-nutrition">
          <div className="card-header">
            <h3><Icon name="nutrition" size={20} className="title-icon" /> Recent meals</h3>
            <Link to="/nutrition" className="link">All meals</Link>
          </div>
          {data.recentActivity?.meals?.length > 0 ? (
            <ul className="activity">
              {data.recentActivity.meals.map((item) => (
                <li key={item._id}>
                  <div>
                    <strong>{item.foodName}</strong>
                    <small className="muted cap">{item.mealType}, {item.protein || 0}g protein</small>
                  </div>
                  <span className="num small"><strong>{item.calories}</strong> kcal</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No meals logged yet.</p>
          )}
        </section>
      </div>

      {/* ============ COUNTS ============ */}
      <div className="stats-grid section">
        <Link to="/academic" className="stat-card mod-academic">
          <span className="stat-icon"><Icon name="academic" size={18} /></span>
          <h3>Academic goals</h3>
          <p className="stat-number">{data.goals}</p>
          <small className="muted">{academic.completed ?? 0} completed, {academic.avgProgress ?? 0}% average progress</small>
        </Link>

        <Link to="/health" className="stat-card mod-health">
          <span className="stat-icon"><Icon name="health" size={18} /></span>
          <h3>Health logs</h3>
          <p className="stat-number">{data.healthLogs}</p>
          <small className="muted">All time</small>
        </Link>

        <Link to="/nutrition" className="stat-card mod-nutrition">
          <span className="stat-icon"><Icon name="nutrition" size={18} /></span>
          <h3>Meals logged</h3>
          <p className="stat-number">{data.meals}</p>
          <small className="muted">All time</small>
        </Link>

        <Link to="/documents" className="stat-card mod-documents">
          <span className="stat-icon"><Icon name="documents" size={18} /></span>
          <h3>Documents</h3>
          <p className="stat-number">{data.documents}</p>
          <small className="muted">In your vault</small>
        </Link>
      </div>
    </div>
  );
}

export default Dashboard;
