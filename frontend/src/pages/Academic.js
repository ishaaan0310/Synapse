import React, { useEffect, useState } from 'react';
import api from '../utils/api';

function Academic() {
  const emptyForm = {
    title: '',
    description: '',
    category: 'exam',
    deadline: '',
    priority: 'medium'
  };

  const [form, setForm] = useState(emptyForm);
  const [goals, setGoals] = useState([]);
  const [atRisk, setAtRisk] = useState(0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchGoals = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.get('/academic');

      setGoals(response.data.goals || []);
      setAtRisk(response.data.atRisk || 0);

    } catch (err) {
      console.error('Fetch academic goals error:', err);

      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Unable to load academic goals'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError('');

      await api.post('/academic', form);

      setForm(emptyForm);

      await fetchGoals();

    } catch (err) {
      console.error('Create goal error:', err);

      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Unable to create goal'
      );
    } finally {
      setSaving(false);
    }
  };

  const updateProgress = async (id, progress) => {
    try {
      await api.patch(`/academic/${id}/progress`, {
        progress: Number(progress)
      });

      await fetchGoals();

    } catch (err) {
      console.error('Update progress error:', err);

      setError(
        err.response?.data?.error ||
        'Unable to update progress'
      );
    }
  };

  return (
    <div className="page" style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem', fontFamily: '"Inter", system-ui, sans-serif' }}>

      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h2 style={{ fontSize: '2.25rem', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>Academic Goals</h2>
          <p style={{ color: '#64748b', margin: '0.5rem 0 0 0', fontSize: '0.95rem' }}>Track and manage your coursework and milestones.</p>
        </div>
        <div style={{ background: '#fef2f2', color: '#ef4444', padding: '0.5rem 1.25rem', borderRadius: '9999px', fontWeight: '600', fontSize: '0.875rem', boxShadow: '0 2px 10px rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ display: 'block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444' }}></span>
          At Risk: {atRisk}
        </div>
      </div>

      {error && (
        <div className="error-message" style={{ background: '#fef2f2', borderLeft: '4px solid #ef4444', color: '#991b1b', padding: '1rem 1.5rem', marginBottom: '2rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Form Section */}
      <div className="card" style={{ background: '#ffffff', padding: '2.5rem', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)', marginBottom: '3rem', border: '1px solid #f1f5f9' }}>
        <h3 style={{ fontSize: '1.25rem', color: '#1e293b', marginBottom: '1.5rem', fontWeight: '700' }}>Create New Goal</h3>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>Goal Title</label>
            <input
              type="text"
              placeholder="e.g., Final Physics Exam Preparation"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              style={{ width: '100%', padding: '0.875rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s', fontSize: '0.95rem' }}
              onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'; }}
              onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>Description</label>
            <textarea
              placeholder="Brief details about your goal..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows="3"
              style={{ width: '100%', padding: '0.875rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', resize: 'vertical', fontSize: '0.95rem' }}
              onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'; }}
              onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              style={{ width: '100%', padding: '0.875rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#fff', fontSize: '0.95rem', cursor: 'pointer' }}
            >
              <option value="exam">Exam</option>
              <option value="project">Project</option>
              <option value="assignment">Assignment</option>
              <option value="course">Course</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>Deadline</label>
            <input
              type="date"
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              required
              style={{ width: '100%', padding: '0.875rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem', color: '#334155' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>Priority</label>
            <select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              style={{ width: '100%', padding: '0.875rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#fff', fontSize: '0.95rem', cursor: 'pointer' }}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button
              type="submit"
              className="btn"
              disabled={saving}
              style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: 'white', padding: '0.875rem 2.5rem', borderRadius: '8px', border: 'none', fontWeight: '600', fontSize: '1rem', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, transition: 'transform 0.2s, box-shadow 0.2s', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)' }}
              onMouseEnter={(e) => { if (!saving) e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { if (!saving) e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {saving ? 'Creating...' : '+ Create Goal'}
            </button>
          </div>
        </form>
      </div>

      {/* Goals Display Section */}
      <div>
        <h3 style={{ fontSize: '1.75rem', color: '#0f172a', marginBottom: '2rem', fontWeight: '700' }}>Your Goals</h3>

        {loading ? (
          <div className="loading" style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
            <p style={{ fontSize: '1.1rem' }}>Loading academic goals...</p>
          </div>
        ) : goals.length === 0 ? (
          <div className="card" style={{ background: '#f8fafc', padding: '4rem 2rem', textAlign: 'center', borderRadius: '16px', border: '2px dashed #cbd5e1', color: '#64748b' }}>
            <h4 style={{ fontSize: '1.25rem', color: '#475569', marginBottom: '0.5rem' }}>No goals found</h4>
            <p>You haven't set any academic goals yet. Create your first goal above!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem' }}>
            {goals.map((goal) => (

              /* Goal Card */
              <div className="card" key={goal._id} style={{ background: '#ffffff', padding: '1.75rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)', border: '1px solid #f1f5f9', borderTop: `5px solid ${goal.priority === 'high' ? '#ef4444' : goal.priority === 'medium' ? '#f59e0b' : '#10b981'}`, display: 'flex', flexDirection: 'column', transition: 'transform 0.2s ease, box-shadow 0.2s ease', cursor: 'default' }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 12px 20px -5px rgba(0, 0, 0, 0.08)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)'; }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', gap: '1rem' }}>
                  <h3 style={{ fontSize: '1.25rem', color: '#0f172a', margin: 0, fontWeight: '700', lineHeight: 1.3 }}>{goal.title}</h3>
                  <span style={{ fontSize: '0.7rem', fontWeight: '700', padding: '0.25rem 0.6rem', borderRadius: '9999px', textTransform: 'uppercase', letterSpacing: '0.05em', backgroundColor: goal.priority === 'high' ? '#fee2e2' : goal.priority === 'medium' ? '#fef3c7' : '#d1fae5', color: goal.priority === 'high' ? '#b91c1c' : goal.priority === 'medium' ? '#b45309' : '#047857' }}>
                    {goal.priority}
                  </span>
                </div>

                {goal.description && (
                  <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.25rem', flexGrow: 1, lineHeight: 1.5 }}>{goal.description}</p>
                )}

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                  <span style={{ fontSize: '0.8rem', background: '#f1f5f9', color: '#475569', padding: '0.35rem 0.75rem', borderRadius: '6px', fontWeight: '500' }}>
                    📁 {goal.category.charAt(0).toUpperCase() + goal.category.slice(1)}
                  </span>
                  <span style={{ fontSize: '0.8rem', background: '#f1f5f9', color: '#475569', padding: '0.35rem 0.75rem', borderRadius: '6px', fontWeight: '500' }}>
                    🕒 {new Date(goal.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>

                {/* Progress Bar Area */}
                <div style={{ marginTop: 'auto', background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.875rem', fontWeight: '600', color: '#334155' }}>
                    <span>Progress</span>
                    <span style={{ color: '#3b82f6' }}>{goal.progress}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={goal.progress}
                    onChange={(e) => updateProgress(goal._id, e.target.value)}
                    style={{ width: '100%', cursor: 'pointer', accentColor: '#3b82f6' }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
