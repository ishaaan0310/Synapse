import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';

function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quickActionMsg, setQuickActionMsg] = useState('');

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/dashboard');
      setData(response.data);
    } catch (err) {
      console.error('Dashboard error:', err);
      setError(
        err.response?.data?.message ||
        'Unable to load dashboard data'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleQuickWaterLog = async () => {
    try {
      await api.post('/health', {
        waterIntake: 0.5,
        notes: 'Quick +500ml water intake'
      });
      setQuickActionMsg('💧 Logged +500ml water!');
      await fetchDashboard();
      setTimeout(() => setQuickActionMsg(''), 3000);
    } catch (err) {
      console.error('Quick water log error:', err);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="loading">
          Loading your Synapse Digital Twin dashboard...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="page">
        <h2>Dashboard</h2>
        <div className="error-message">
          {error || 'Dashboard data not available'}
        </div>
      </div>
    );
  }

  const { goals, healthLogs, meals, documents, latestHealth, todayNutrition, alerts, recentActivity } = data;

  return (
    <div className="page">

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <h2>🧠 Synapse Executive Dashboard</h2>
        <span style={{ fontSize: '0.9rem', background: '#edf2f7', padding: '0.4rem 0.8rem', borderRadius: '20px', color: '#4a5568', fontWeight: 'bold' }}>
          Digital Twin Active
        </span>
      </div>

      {quickActionMsg && (
        <div style={{ padding: '0.75rem 1rem', background: '#e6fffa', color: '#234e52', borderRadius: '8px', marginBottom: '1.25rem', fontWeight: 'bold' }}>
          {quickActionMsg}
        </div>
      )}

      {/* ================================
          LIVE ALERTS BANNER
      ================================= */}
      {alerts && alerts.length > 0 && (
        <div className="card" style={{ borderLeft: '5px solid #ed8936', background: '#fffaf0', marginBottom: '1.5rem' }}>
          <h3 style={{ color: '#c05621', marginTop: 0 }}>🚨 Live Health & Nutrition Warnings</h3>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
            {alerts.map((a, idx) => (
              <div key={idx} style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', background: '#feebc8', color: '#7b341e', fontSize: '0.85rem', fontWeight: 'bold' }}>
                {a.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================================
          DIGITAL TWIN SUMMARY METRICS
      ================================= */}
      <h3 style={{ marginBottom: '1rem', color: '#2d3748' }}>📊 Digital Twin Overview</h3>
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>

        <div className="stat-card">
          <h3>Academic Goals</h3>
          <p className="stat-number" style={{ color: '#667eea' }}>
            {goals}
          </p>
          <span>Total Goals Tracked</span>
        </div>

        <div className="stat-card">
          <h3>Latest Sleep</h3>
          <p className="stat-number" style={{ color: '#48bb78' }}>
            {latestHealth?.sleepHours ? `${latestHealth.sleepHours}h` : '-'}
          </p>
          <span>{latestHealth?.sleepQuality ? `Quality: ${latestHealth.sleepQuality} (${healthLogs} total logs)` : `${healthLogs} Total Health Logs`}</span>
        </div>

        <div className="stat-card">
          <h3>Today's Calories</h3>
          <p className="stat-number" style={{ color: '#ed8936' }}>
            {todayNutrition?.totals?.calories || 0}
          </p>
          <span>/ {todayNutrition?.goals?.calories || 2000} kcal ({meals} meals total)</span>
        </div>

        <div className="stat-card">
          <h3>Vault Documents</h3>
          <p className="stat-number" style={{ color: '#9f7aea' }}>
            {documents}
          </p>
          <span>Stored Documents</span>
        </div>

      </div>

      {/* ================================
          QUICK ACTIONS CENTER
      ================================= */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3>⚡ Quick Action Shortcuts</h3>
        <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
          Perform instant data logging without navigating away.
        </p>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleQuickWaterLog}
            className="btn"
            style={{ background: '#3182ce', color: '#fff' }}
          >
            💧 Quick Log +500ml Water
          </button>

          <Link to="/health" style={{ textDecoration: 'none' }}>
            <button className="btn" style={{ background: '#48bb78', color: '#fff' }}>
              😴 Log Sleep & Fitness
            </button>
          </Link>

          <Link to="/nutrition" style={{ textDecoration: 'none' }}>
            <button className="btn" style={{ background: '#ed8936', color: '#fff' }}>
              🍽️ Log Meal & Macros
            </button>
          </Link>
        </div>
      </div>

      {/* ================================
          RECENT ACTIVITY STREAM
      ================================= */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>

        <div className="card">
          <h3>❤️ Recent Health Metrics</h3>
          {recentActivity?.health?.length > 0 ? (
            recentActivity.health.map(item => (
              <div key={item._id} style={{ padding: '0.75rem', borderBottom: '1px solid #edf2f7' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <strong>😴 {item.sleepHours || 0} hrs sleep</strong>
                  <span style={{ color: '#718096' }}>{new Date(item.date).toLocaleDateString('en-IN')}</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#4a5568', marginTop: '0.2rem' }}>
                  🚶 {item.steps?.toLocaleString() || 0} steps | ❤️ {item.heartRate || 0} BPM
                </div>
              </div>
            ))
          ) : (
            <p style={{ color: '#888' }}>No health metrics logged yet.</p>
          )}
        </div>

        <div className="card">
          <h3>🍎 Recent Meals Logged</h3>
          {recentActivity?.meals?.length > 0 ? (
            recentActivity.meals.map(item => (
              <div key={item._id} style={{ padding: '0.75rem', borderBottom: '1px solid #edf2f7' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <strong>🍽️ {item.foodName}</strong>
                  <span style={{ color: '#718096' }}>{item.calories} kcal</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#4a5568', marginTop: '0.2rem' }}>
                  Category: {item.mealType?.toUpperCase()} | Protein: {item.protein || 0}g
                </div>
              </div>
            ))
          ) : (
            <p style={{ color: '#888' }}>No meals logged yet.</p>
          )}
        </div>

      </div>

    </div>
  );
}

export default Dashboard;