import React, { useEffect, useState } from 'react';
import api from '../utils/api';

function Health() {
  const [form, setForm] = useState({
    weight: '',
    sleepHours: '',
    steps: '',
    heartRate: ''
  });

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // =====================================
  // FETCH HEALTH LOGS
  // =====================================
  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.get('/health');

      setLogs(response.data);
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
        weight: Number(form.weight),
        sleepHours: Number(form.sleepHours),
        steps: Number(form.steps),
        heartRate: Number(form.heartRate)
      });

      // Clear form
      setForm({
        weight: '',
        sleepHours: '',
        steps: '',
        heartRate: ''
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

      <h2>Health & Fitness</h2>

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

          <input
            type="number"
            name="weight"
            placeholder="Weight (kg)"
            value={form.weight}
            onChange={handleChange}
            required
          />

          <input
            type="number"
            name="sleepHours"
            placeholder="Sleep Hours"
            value={form.sleepHours}
            onChange={handleChange}
            required
          />

          <input
            type="number"
            name="steps"
            placeholder="Steps"
            value={form.steps}
            onChange={handleChange}
            required
          />

          <input
            type="number"
            name="heartRate"
            placeholder="Heart Rate (BPM)"
            value={form.heartRate}
            onChange={handleChange}
            required
          />

          <button
            type="submit"
            className="btn"
            disabled={saving}
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
                  padding: '1rem',
                  marginBottom: '1rem',
                  borderRadius: '12px',
                  background: '#f7f7ff',
                  border: '1px solid #e5e5e5'
                }}
              >

                <strong>
                  {formatDate(log.date)}
                </strong>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      'repeat(auto-fit, minmax(150px, 1fr))',
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
                    {log.sleepHours || '-'} hours
                  </div>

                  <div>
                    🚶 <strong>Steps</strong>
                    <br />
                    {log.steps
                      ? log.steps.toLocaleString()
                      : '-'}
                  </div>

                  <div>
                    ⚖️ <strong>Weight</strong>
                    <br />
                    {log.weight || '-'} kg
                  </div>

                </div>

              </div>
            ))}

          </div>
        )}

      </div>

    </div>
  );
}

export default Health;