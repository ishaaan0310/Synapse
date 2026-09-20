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
    <div className="page" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '2.25rem', fontWeight: '800', margin: 0 }}>Synapse Dashboard</h2>
          <p style={{ color: 'var(--text-muted)', margin: '0.5rem 0 0' }}>Welcome back. Here is your overview.</p>
        </div>
        <span style={{ fontSize: '0.85rem', background: '#dcfce7', padding: '0.5rem 1rem', borderRadius: '9999px', color: '#166534', fontWeight: '700' }}>
          ● Digital Twin Active
        </span>
      </div>

      {quickActionMsg && (
        <div style={{ padding: '1rem', background: '#ecfdf5', borderLeft: '4px solid #10b981', color: '#065f46', borderRadius: '8px', marginBottom: '1.5rem', fontWeight: '600' }}>
          {quickActionMsg}
        </div>
      )}

      {alerts && alerts.length > 0 && (
        <div className="card" style={{ borderLeft: '4px solid #f59e0b', background: '#fffbeb', marginBottom: '2rem' }}>
          <h3 style={{ color: '#b45309', margin: '0 0 1rem 0' }}>🚨 Active Alerts</h3>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {alerts.map((a, idx) => (
              <div key={idx} style={{ padding: '0.5rem 1rem', borderRadius: '6px', background: '#fef3c7', color: '#92400e', fontSize: '0.875rem', fontWeight: '600' }}>
                {a.text}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="dashboard-container">
        
        {/* ROW 1: ACADEMIC | HEALTH | NUTRITION */}
        <div className="card dashboard-col-1" style={{ borderTop: '4px solid var(--primary)' }}>
          <h3 style={{ color: 'var(--text-muted)', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Academic Progress</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: '800', margin: '1rem 0 0.5rem', color: 'var(--primary)' }}>{goals}</p>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: '500' }}>Active Goals Tracked</span>
        </div>

        <div className="card dashboard-col-1" style={{ borderTop: '4px solid #10b981' }}>
          <h3 style={{ color: 'var(--text-muted)', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Health Metrics</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: '800', margin: '1rem 0 0.5rem', color: '#10b981' }}>
            {latestHealth?.sleepHours ? `${latestHealth.sleepHours}h` : '0h'}
          </p>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: '500' }}>
            Sleep • {latestHealth?.steps?.toLocaleString() || 0} Steps
          </span>
          <button 
            onClick={handleQuickWaterLog}
            style={{ marginTop: '1rem', display: 'block', width: '100%', padding: '0.5rem', background: '#ecfdf5', color: '#059669', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', transition: 'background 0.2s' }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#d1fae5'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#ecfdf5'}
          >
            💧 Quick Log Water (+500ml)
          </button>
        </div>

        <div className="card dashboard-col-1" style={{ borderTop: '4px solid #f59e0b' }}>
          <h3 style={{ color: 'var(--text-muted)', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nutrition Calories</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: '800', margin: '1rem 0 0.5rem', color: '#f59e0b' }}>
            {todayNutrition?.totals?.calories || 0}
          </p>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: '500' }}>
            / {todayNutrition?.goals?.calories || 2000} kcal today
          </span>
        </div>

        {/* ROW 2: GOALS */}
        <div className="card dashboard-full">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Goals Overview</h3>
            <Link to="/academic" style={{ textDecoration: 'none' }}>
              <button className="btn" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>Manage Goals</button>
            </Link>
          </div>
          <div style={{ background: 'var(--bg-color)', padding: '2rem', borderRadius: '12px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <p style={{ margin: 0, fontWeight: '500' }}>You have {goals} academic goals currently being tracked by the digital twin.</p>
          </div>
        </div>

        {/* ROW 3: RECENT ACTIVITY */}
        <div className="card dashboard-full">
          <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem' }}>Recent Activity</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            
            {/* Health Activity */}
            <div>
              <h4 style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Health & Fitness</h4>
              {recentActivity?.health?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {recentActivity.health.map(item => (
                    <div key={item._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-color)', padding: '1rem', borderRadius: '8px' }}>
                      <div>
                        <strong style={{ display: 'block', color: 'var(--text-main)', marginBottom: '0.25rem' }}>😴 {item.sleepHours || 0} hrs sleep</strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>🚶 {item.steps?.toLocaleString() || 0} steps</span>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                        {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No recent health activity.</p>
              )}
            </div>

            {/* Nutrition Activity */}
            <div>
              <h4 style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Nutrition & Meals</h4>
              {recentActivity?.meals?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {recentActivity.meals.map(item => (
                    <div key={item._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-color)', padding: '1rem', borderRadius: '8px' }}>
                      <div>
                        <strong style={{ display: 'block', color: 'var(--text-main)', marginBottom: '0.25rem' }}>🍽️ {item.foodName}</strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.mealType?.toUpperCase()} • {item.protein || 0}g protein</span>
                      </div>
                      <span style={{ fontSize: '0.875rem', color: '#f59e0b', fontWeight: '700' }}>
                        {item.calories} kcal
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No recent nutrition activity.</p>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

export default Dashboard;