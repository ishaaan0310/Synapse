import React, { useEffect, useState } from 'react';
import api from '../utils/api';

function Dashboard() {
  const [stats, setStats] = useState({
    goals: 0,
    healthLogs: 0,
    meals: 0,
    documents: 0
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await api.get('/dashboard');

        setStats(response.data);
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

    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="page">
        <div className="loading">
          Loading your Synapse dashboard...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <h2>Dashboard</h2>

        <div className="error-message">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h2>Dashboard</h2>

      <div className="stats-grid">

        <div className="stat-card">
          <h3>Academic Goals</h3>

          <p
            className="stat-number"
            style={{ color: '#667eea' }}
          >
            {stats.goals}
          </p>
        </div>

        <div className="stat-card">
          <h3>Health Logs</h3>

          <p
            className="stat-number"
            style={{ color: '#48bb78' }}
          >
            {stats.healthLogs}
          </p>
        </div>

        <div className="stat-card">
          <h3>Meals Logged</h3>

          <p
            className="stat-number"
            style={{ color: '#ed8936' }}
          >
            {stats.meals}
          </p>
        </div>

        <div className="stat-card">
          <h3>Documents</h3>

          <p
            className="stat-number"
            style={{ color: '#9f7aea' }}
          >
            {stats.documents}
          </p>
        </div>

      </div>
    </div>
  );
}

export default Dashboard;