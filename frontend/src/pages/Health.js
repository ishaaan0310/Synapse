import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api, { getErrorMessage, toDateInput } from '../utils/api';
import { useToast } from '../components/Toast';
import { LineChart } from '../components/Charts';

const EMPTY_FORM = {
  date: '',
  weight: '',
  height: '',
  sleepHours: '',
  sleepQuality: '',
  steps: '',
  heartRate: '',
  waterIntake: '',
  notes: ''
};

const METRICS = {
  sleepHours: { label: 'Sleep', unit: 'h', color: 'var(--primary)', target: 7, targetLabel: 'Goal 7h' },
  steps: { label: 'Steps', unit: 'steps', color: 'var(--success)', target: 8000, targetLabel: 'Goal 8k' },
  weight: { label: 'Weight', unit: 'kg', color: 'var(--purple)' },
  heartRate: { label: 'Heart Rate', unit: 'BPM', color: 'var(--danger)' },
  waterIntake: { label: 'Water', unit: 'L', color: 'var(--info)', target: 2.5, targetLabel: 'Goal 2.5L' }
};

const RANGES = [7, 30, 90];

function Health() {
  const toast = useToast();

  const [form, setForm] = useState(EMPTY_FORM);
  const [showMore, setShowMore] = useState(false);

  const [logs, setLogs] = useState([]);
  const [trends, setTrends] = useState(null);
  const [alerts, setAlerts] = useState([]);

  const [metric, setMetric] = useState('sleepHours');
  const [range, setRange] = useState(30);
  const [visibleCount, setVisibleCount] = useState(8);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState('');
  const [error, setError] = useState('');

  // =====================================
  // FETCH LOGS + TRENDS + ALERTS
  // =====================================
  const fetchAll = useCallback(async () => {
    try {
      setError('');

      const [logsRes, trendsRes, alertsRes] = await Promise.all([
        api.get('/health', { params: { days: 90 } }),
        api.get('/health/trends'),
        api.get('/health/alerts')
      ]);

      // The API returns { success, count, metrics } (not a plain array)
      setLogs(logsRes.data.metrics || []);
      setTrends(trendsRes.data);
      setAlerts(alertsRes.data.alerts || []);
    } catch (err) {
      console.error('Failed to fetch health data:', err);
      setError(getErrorMessage(err, 'Unable to load health logs'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // =====================================
  // SAVE HEALTH LOG
  // =====================================
  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {};
    ['weight', 'height', 'sleepHours', 'steps', 'heartRate', 'waterIntake'].forEach((field) => {
      if (form[field] !== '') payload[field] = Number(form[field]);
    });
    if (form.sleepQuality) payload.sleepQuality = form.sleepQuality;
    if (form.notes.trim()) payload.notes = form.notes.trim();

    // Back-dated entry: store it at midday local time on that date
    if (form.date && form.date !== toDateInput()) {
      payload.date = new Date(`${form.date}T12:00:00`).toISOString();
    }

    if (Object.keys(payload).filter((k) => !['notes', 'date', 'sleepQuality'].includes(k)).length === 0) {
      setError('Enter at least one metric.');
      return;
    }

    try {
      setSaving(true);
      setError('');

      await api.post('/health', payload);

      setForm(EMPTY_FORM);
      toast.success('Health metric logged');
      await fetchAll();
    } catch (err) {
      console.error('Health save error:', err);
      setError(getErrorMessage(err, 'Failed to save health metric'));
    } finally {
      setSaving(false);
    }
  };

  // =====================================
  // WEARABLE SYNC (demo data from backend)
  // =====================================
  const syncWearable = async (provider) => {
    try {
      setSyncing(provider);
      const response = await api.post('/health/sync-wearable', { provider });
      toast.success(response.data.message || 'Synced');
      await fetchAll();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Sync failed'));
    } finally {
      setSyncing('');
    }
  };

  // =====================================
  // DELETE
  // =====================================
  const deleteLog = async (id) => {
    if (!window.confirm('Delete this health log?')) return;

    try {
      await api.delete(`/health/${id}`);
      setLogs((current) => current.filter((log) => log._id !== id));
      toast.success('Health log deleted');
      // Trends/alerts depend on the logs
      fetchAll();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not delete log'));
    }
  };

  // =====================================
  // CHART DATA
  // =====================================
  const chartData = useMemo(() => {
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - (range - 1));

    return logs
      .filter((log) => new Date(log.date) >= since && typeof log[metric] === 'number')
      .slice()
      .reverse()
      .map((log) => ({
        label: new Date(log.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        value: log[metric]
      }));
  }, [logs, metric, range]);

  const latestBmi = useMemo(() => {
    const withBoth = logs.find((log) => log.weight && log.height);
    if (!withBoth) return null;
    const bmi = withBoth.weight / ((withBoth.height / 100) ** 2);
    let category = 'Normal';
    if (bmi < 18.5) category = 'Underweight';
    else if (bmi >= 25 && bmi < 30) category = 'Overweight';
    else if (bmi >= 30) category = 'Obese';
    return { value: bmi.toFixed(1), category };
  }, [logs]);

  const formatDate = (date) =>
    new Date(date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

  const t7 = trends?.last7Days;
  const t30 = trends?.last30Days;

  return (
    <div className="page">
      <div className="page-header">
        <h2>❤️ Health & Fitness</h2>

        <div className="button-row">
          <button className="btn btn-secondary" disabled={!!syncing} onClick={() => syncWearable('fitbit')}>
            {syncing === 'fitbit' ? 'Syncing…' : '⌚ Sync Fitbit'}
          </button>
          <button className="btn btn-secondary" disabled={!!syncing} onClick={() => syncWearable('healthkit')}>
            {syncing === 'healthkit' ? 'Syncing…' : '🍏 Sync HealthKit'}
          </button>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="alerts">
          {alerts.map((alert, i) => (
            <div key={i} className={`alert alert-${alert.type}`}>{alert.text}</div>
          ))}
        </div>
      )}

      {/* ============ TRENDS ============ */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>😴 Avg Sleep</h3>
          <p className="stat-number">{t7 ? `${t7.avgSleep}h` : '–'}</p>
          <small className="muted">7 days{t30 ? ` · 30d: ${t30.avgSleep}h` : ''}</small>
        </div>
        <div className="stat-card">
          <h3>🚶 Avg Steps</h3>
          <p className="stat-number">{t7 ? t7.avgSteps.toLocaleString() : '–'}</p>
          <small className="muted">7 days{t30 ? ` · 30d: ${t30.avgSteps.toLocaleString()}` : ''}</small>
        </div>
        <div className="stat-card">
          <h3>💧 Avg Water</h3>
          <p className="stat-number">{t7 ? `${t7.avgWater}L` : '–'}</p>
          <small className="muted">7 days{t30 ? ` · 30d: ${t30.avgWater}L` : ''}</small>
        </div>
        <div className="stat-card">
          <h3>⚖️ BMI</h3>
          <p className="stat-number">{latestBmi ? latestBmi.value : '–'}</p>
          <small className="muted">{latestBmi ? latestBmi.category : 'log weight + height'}</small>
        </div>
      </div>

      {/* ============ CHART ============ */}
      <div className="card section">
        <div className="card-header wrap">
          <div className="tabs">
            {Object.entries(METRICS).map(([key, m]) => (
              <button
                key={key}
                type="button"
                className={`tab ${metric === key ? 'active' : ''}`}
                onClick={() => setMetric(key)}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="tabs">
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                className={`tab ${range === r ? 'active' : ''}`}
                onClick={() => setRange(r)}
              >
                {r}d
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="loading"><div className="spinner" /></div>
        ) : (
          <LineChart
            data={chartData}
            color={METRICS[metric].color}
            unit={METRICS[metric].unit}
            target={METRICS[metric].target}
            targetLabel={METRICS[metric].targetLabel}
          />
        )}
      </div>

      {/* ============ LOG FORM ============ */}
      <div className="card section">
        <h3>Log Health Metric</h3>
        <p className="muted small">Fill in whatever you have. Every field is optional.</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>
              Sleep (hours)
              <input type="number" name="sleepHours" placeholder="e.g. 7.5" step="0.1" min="0" max="24"
                value={form.sleepHours} onChange={handleChange} />
            </label>

            <label>
              Sleep quality
              <select name="sleepQuality" value={form.sleepQuality} onChange={handleChange}>
                <option value="">–</option>
                <option value="poor">Poor</option>
                <option value="fair">Fair</option>
                <option value="good">Good</option>
                <option value="excellent">Excellent</option>
              </select>
            </label>

            <label>
              Steps
              <input type="number" name="steps" placeholder="e.g. 8000" min="0"
                value={form.steps} onChange={handleChange} />
            </label>

            <label>
              Water (litres)
              <input type="number" name="waterIntake" placeholder="e.g. 2.5" step="0.1" min="0" max="15"
                value={form.waterIntake} onChange={handleChange} />
            </label>

            <label>
              Heart rate (BPM)
              <input type="number" name="heartRate" placeholder="e.g. 72" min="20" max="250"
                value={form.heartRate} onChange={handleChange} />
            </label>

            <label>
              Weight (kg)
              <input type="number" name="weight" placeholder="e.g. 68.5" step="0.1" min="1" max="400"
                value={form.weight} onChange={handleChange} />
            </label>
          </div>

          <button type="button" className="link-btn" onClick={() => setShowMore((s) => !s)}>
            {showMore ? '− Fewer options' : '+ Height, date & notes'}
          </button>

          {showMore && (
            <div className="form-grid">
              <label>
                Height (cm)
                <input type="number" name="height" placeholder="e.g. 172" min="30" max="260"
                  value={form.height} onChange={handleChange} />
              </label>

              <label>
                Date
                <input type="date" name="date" max={toDateInput()} value={form.date} onChange={handleChange} />
              </label>

              <label className="full">
                Notes
                <textarea name="notes" rows="2" maxLength="500" placeholder="How are you feeling?"
                  value={form.notes} onChange={handleChange} />
              </label>
            </div>
          )}

          <button type="submit" className="btn" disabled={saving}>
            {saving ? 'Saving...' : 'Log Metric'}
          </button>
        </form>
      </div>

      {/* ============ HISTORY ============ */}
      <div className="card section">
        <h3>Recent Health Logs</h3>

        {loading ? (
          <p className="muted">Loading health logs...</p>
        ) : logs.length === 0 ? (
          <div className="empty-state small">
            <div className="empty-icon">📈</div>
            <p>No health logs yet. Add your first metric above, or try a wearable sync.</p>
          </div>
        ) : (
          <>
            {logs.slice(0, visibleCount).map((log) => (
              <div key={log._id} className="entry">
                <div className="entry-header">
                  <strong>{formatDate(log.date)}</strong>
                  <div className="entry-actions">
                    {log.source && log.source !== 'manual' && (
                      <span className="pill">{log.source === 'fitbit' ? '⌚ Fitbit' : '🍏 HealthKit'}</span>
                    )}
                    <button type="button" className="icon-btn small danger" onClick={() => deleteLog(log._id)}
                      title="Delete" aria-label="Delete log">🗑️</button>
                  </div>
                </div>

                <div className="entry-grid">
                  <div>😴 <strong>Sleep</strong><br />{log.sleepHours ?? '–'} h{log.sleepQuality ? ` (${log.sleepQuality})` : ''}</div>
                  <div>🚶 <strong>Steps</strong><br />{log.steps ? log.steps.toLocaleString() : '–'}</div>
                  <div>💧 <strong>Water</strong><br />{log.waterIntake ?? '–'} L</div>
                  <div>❤️ <strong>Heart Rate</strong><br />{log.heartRate ?? '–'} BPM</div>
                  <div>⚖️ <strong>Weight</strong><br />{log.weight ?? '–'} kg</div>
                </div>

                {log.notes && <p className="entry-notes">📝 {log.notes}</p>}
              </div>
            ))}

            {logs.length > visibleCount && (
              <button type="button" className="btn btn-secondary" onClick={() => setVisibleCount((c) => c + 10)}>
                Show more ({logs.length - visibleCount} left)
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Health;
