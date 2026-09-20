import React, { useEffect, useState } from 'react';
import api from '../utils/api';

function Health() {
  const [form, setForm] = useState({
    weight: '',
    height: '',
    sleepHours: '',
    sleepQuality: 'good',
    steps: '',
    heartRate: '',
    waterIntake: '',
    source: 'manual',
    notes: ''
  });

  const [logs, setLogs] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [trends, setTrends] = useState({ last7Days: null, last30Days: null });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [syncSuccess, setSyncSuccess] = useState('');

  // =====================================
  // FETCH HEALTH LOGS, ALERTS & TRENDS
  // =====================================
  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError('');

      const [logsRes, alertsRes, trendsRes] = await Promise.all([
        api.get('/health'),
        api.get('/health/alerts'),
        api.get('/health/trends')
      ]);

      setLogs(logsRes.data);
      setAlerts(alertsRes.data.alerts || []);
      setTrends(trendsRes.data || { last7Days: null, last30Days: null });
    } catch (err) {
      console.error('Failed to fetch health logs:', err);

      setError(
        err.response?.data?.message ||
        'Unable to load health logs'
      );
    } finally {
      setLoading(false);
    }
  };

  // Fetch logs when page opens
  useEffect(() => {
    fetchLogs();
  }, []);

  // =====================================
  // SYNC WEARABLE DEVICE MOCK
  // =====================================
  const handleWearableSync = async (provider) => {
    try {
      setSyncing(true);
      setError('');
      setSyncSuccess('');

      const response = await api.post('/health/sync-wearable', { provider });

      setSyncSuccess(response.data.message);
      await fetchLogs();

      setTimeout(() => setSyncSuccess(''), 4000);
    } catch (err) {
      console.error('Sync wearable error:', err);
      setError(err.response?.data?.message || 'Failed to sync wearable data');
    } finally {
      setSyncing(false);
    }
  };

  // =====================================
  // HANDLE FORM CHANGE
  // =====================================
  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  // =====================================
  // SAVE HEALTH LOG
  // =====================================
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError('');

      await api.post('/health', {
        weight: form.weight ? Number(form.weight) : undefined,
        height: form.height ? Number(form.height) : undefined,
        sleepHours: Number(form.sleepHours),
        sleepQuality: form.sleepQuality,
        steps: Number(form.steps),
        heartRate: Number(form.heartRate),
        waterIntake: form.waterIntake ? Number(form.waterIntake) : undefined,
        source: form.source,
        notes: form.notes
      });

      // Clear form
      setForm({
        weight: '',
        height: '',
        sleepHours: '',
        sleepQuality: 'good',
        steps: '',
        heartRate: '',
        waterIntake: '',
        source: 'manual',
        notes: ''
      });

      // Refresh logs
      await fetchLogs();

    } catch (err) {
      console.error('Health save error:', err);

      setError(
        err.response?.data?.message ||
        'Failed to save health metric'
      );
    } finally {
      setSaving(false);
    }
  };

  // =====================================
  // FORMAT DATE
  // =====================================
  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  return (
    <div className="page">

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <h2>Health & Fitness</h2>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn"
            disabled={syncing}
            onClick={() => handleWearableSync('healthkit')}
            style={{ background: '#ff2d55', color: '#fff', fontSize: '0.85rem', padding: '0.5rem 1rem' }}
          >
            {syncing ? 'Syncing...' : '🍏 Sync Apple Health'}
          </button>

          <button
            type="button"
            className="btn"
            disabled={syncing}
            onClick={() => handleWearableSync('fitbit')}
            style={{ background: '#00b0b9', color: '#fff', fontSize: '0.85rem', padding: '0.5rem 1rem' }}
          >
            {syncing ? 'Syncing...' : '⌚ Sync Fitbit'}
          </button>
        </div>
      </div>

      {syncSuccess && (
        <div style={{ padding: '0.85rem 1.25rem', background: '#e6fffa', border: '1px solid #319795', color: '#234e52', borderRadius: '10px', marginBottom: '1.5rem', fontWeight: 'bold' }}>
          ✅ {syncSuccess}
        </div>
      )}

      {/* ================================
          HEALTH ALERTS BANNER
      ================================= */}
      {alerts.length > 0 && (
        <div className="card" style={{ borderLeft: '5px solid #ed8936', background: '#fffaf0', marginBottom: '1.5rem' }}>
          <h3 style={{ color: '#c05621', marginTop: 0 }}>🚨 Health Alerts & Recommendations</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
            {alerts.map((alert, idx) => (
              <div
                key={idx}
                style={{
                  padding: '0.6rem 1rem',
                  borderRadius: '8px',
                  background: alert.type === 'warning' ? '#feebc8' : alert.type === 'danger' ? '#fed7d7' : '#ebf8ff',
                  color: alert.type === 'warning' ? '#7b341e' : alert.type === 'danger' ? '#9b2c2c' : '#2b6cb0',
                  fontWeight: '500',
                  fontSize: '0.9rem'
                }}
              >
                {alert.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================================
          HEALTH TRENDS ANALYTICS
      ================================= */}
      {(trends.last7Days || trends.last30Days) && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3>📊 Health & Fitness Analytics (Aggregated Trends)</h3>
          <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1rem' }}>
            MongoDB aggregation statistics computed across your historical logs.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>

            {trends.last7Days && (
              <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 0.75rem 0', color: '#475569' }}>📅 Past 7 Days</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.9rem' }}>
                  <div>😴 <strong>Avg Sleep:</strong> {trends.last7Days.avgSleep} hrs</div>
                  <div>🚶 <strong>Avg Steps:</strong> {trends.last7Days.avgSteps.toLocaleString()}</div>
                  <div>❤️ <strong>Avg HR:</strong> {trends.last7Days.avgHeartRate} BPM</div>
                  <div>💧 <strong>Avg Water:</strong> {trends.last7Days.avgWater} L</div>
                </div>
                <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#64748b' }}>
                  Logs recorded: {trends.last7Days.totalLogs}
                </div>
              </div>
            )}

            {trends.last30Days && (
              <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 0.75rem 0', color: '#475569' }}>📆 Past 30 Days</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.9rem' }}>
                  <div>😴 <strong>Avg Sleep:</strong> {trends.last30Days.avgSleep} hrs</div>
                  <div>🚶 <strong>Avg Steps:</strong> {trends.last30Days.avgSteps.toLocaleString()}</div>
                  <div>❤️ <strong>Avg HR:</strong> {trends.last30Days.avgHeartRate} BPM</div>
                  <div>💧 <strong>Avg Water:</strong> {trends.last30Days.avgWater} L</div>
                </div>
                <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#64748b' }}>
                  Logs recorded: {trends.last30Days.totalLogs}
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ================================
          LOG FORM
      ================================= */}
      <div className="card">

        <h3>Log Health Metric</h3>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 'bold' }}>Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                name="weight"
                placeholder="e.g. 70.5"
                value={form.weight}
                onChange={handleChange}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 'bold' }}>Height (cm)</label>
              <input
                type="number"
                name="height"
                placeholder="e.g. 175"
                value={form.height}
                onChange={handleChange}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 'bold' }}>Sleep Hours *</label>
              <input
                type="number"
                step="0.5"
                name="sleepHours"
                placeholder="e.g. 7.5"
                value={form.sleepHours}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 'bold' }}>Sleep Quality</label>
              <select
                name="sleepQuality"
                value={form.sleepQuality}
                onChange={handleChange}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ccc' }}
              >
                <option value="poor">Poor 😴</option>
                <option value="fair">Fair 😐</option>
                <option value="good">Good 🙂</option>
                <option value="excellent">Excellent 🌟</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 'bold' }}>Daily Steps *</label>
              <input
                type="number"
                name="steps"
                placeholder="e.g. 8500"
                value={form.steps}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 'bold' }}>Heart Rate (BPM) *</label>
              <input
                type="number"
                name="heartRate"
                placeholder="e.g. 72"
                value={form.heartRate}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 'bold' }}>Water Intake (L)</label>
              <input
                type="number"
                step="0.1"
                name="waterIntake"
                placeholder="e.g. 2.5"
                value={form.waterIntake}
                onChange={handleChange}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 'bold' }}>Data Source</label>
              <select
                name="source"
                value={form.source}
                onChange={handleChange}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ccc' }}
              >
                <option value="manual">Manual Entry ✍️</option>
                <option value="fitbit">Fitbit ⌚</option>
                <option value="healthkit">Apple HealthKit 🍏</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 'bold' }}>Notes</label>
            <input
              type="text"
              name="notes"
              placeholder="e.g. Morning workout included 30m cardio"
              value={form.notes}
              onChange={handleChange}
            />
          </div>

          <button
            type="submit"
            className="btn"
            disabled={saving}
            style={{ marginTop: '1rem' }}
          >
            {saving ? 'Saving...' : 'Log Metric'}
          </button>

        </form>

      </div>

      {/* ================================
          HEALTH LOGS
      ================================= */}
      <div className="card">

        <h3>Recent Health Logs</h3>

        {loading ? (
          <p>Loading health logs...</p>
        ) : logs.length === 0 ? (
          <p>No health logs yet. Add your first metric above.</p>
        ) : (
          <div>

            {logs.map((log) => (
              <div
                key={log._id}
                style={{
                  padding: '1.25rem',
                  marginBottom: '1rem',
                  borderRadius: '12px',
                  background: '#f7f7ff',
                  border: '1px solid #e5e5e5'
                }}
              >

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>
                    📅 {formatDate(log.date)}
                  </strong>
                  <span style={{
                    fontSize: '0.8rem',
                    padding: '0.25rem 0.6rem',
                    borderRadius: '20px',
                    background: log.source === 'fitbit' ? '#00b0b9' : log.source === 'healthkit' ? '#ff2d55' : '#667eea',
                    color: '#fff',
                    textTransform: 'uppercase',
                    fontWeight: 'bold'
                  }}>
                    {log.source || 'manual'}
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: '0.75rem',
                    marginTop: '1rem'
                  }}
                >

                  <div>
                    ❤️ <strong>Heart Rate</strong>
                    <br />
                    {log.heartRate || '-'} BPM
                  </div>

                  <div>
                    😴 <strong>Sleep</strong>
                    <br />
                    {log.sleepHours || '-'} hrs ({log.sleepQuality || 'good'})
                  </div>

                  <div>
                    🚶 <strong>Steps</strong>
                    <br />
                    {log.steps ? log.steps.toLocaleString() : '-'}
                  </div>

                  <div>
                    ⚖️ <strong>Weight / Height</strong>
                    <br />
                    {log.weight ? `${log.weight} kg` : '-'} {log.height ? `/ ${log.height} cm` : ''}
                  </div>

                  <div>
                    💧 <strong>Water Intake</strong>
                    <br />
                    {log.waterIntake ? `${log.waterIntake} L` : '-'}
                  </div>

                </div>

                {log.notes && (
                  <div style={{ marginTop: '0.75rem', fontSize: '0.9rem', fontStyle: 'italic', color: '#555' }}>
                    📝 Note: {log.notes}
                  </div>
                )}

              </div>
            ))}

          </div>
        )}

      </div>

    </div>
  );
}

export default Health;