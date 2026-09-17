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
    <div className="page">

      <h2>Academic Goals</h2>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="card">
        <h3>Create New Goal</h3>

        <form onSubmit={handleSubmit}>

          <input
            type="text"
            placeholder="Goal Title"
            value={form.title}
            onChange={(e) =>
              setForm({
                ...form,
                title: e.target.value
              })
            }
            required
          />

          <textarea
            placeholder="Description"
            value={form.description}
            onChange={(e) =>
              setForm({
                ...form,
                description: e.target.value
              })
            }
            rows="4"
          />

          <select
            value={form.category}
            onChange={(e) =>
              setForm({
                ...form,
                category: e.target.value
              })
            }
          >
            <option value="exam">Exam</option>
            <option value="project">Project</option>
            <option value="assignment">Assignment</option>
            <option value="course">Course</option>
          </select>

          <input
            type="date"
            value={form.deadline}
            onChange={(e) =>
              setForm({
                ...form,
                deadline: e.target.value
              })
            }
            required
          />

          <select
            value={form.priority}
            onChange={(e) =>
              setForm({
                ...form,
                priority: e.target.value
              })
            }
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>

          <button
            type="submit"
            className="btn"
            disabled={saving}
          >
            {saving ? 'Creating...' : 'Create Goal'}
          </button>

        </form>
      </div>

      <div style={{ marginTop: '2rem' }}>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem'
          }}
        >
          <h3>Your Goals</h3>

          <span>
            At risk: <strong>{atRisk}</strong>
          </span>
        </div>

        {loading ? (
          <div className="loading">
            Loading academic goals...
          </div>
        ) : goals.length === 0 ? (
          <div className="card">
            <p>
              No academic goals yet. Create your first goal above.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gap: '1rem'
            }}
          >
            {goals.map((goal) => (

              <div className="card" key={goal._id}>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '1rem'
                  }}
                >
                  <div>
                    <h3>{goal.title}</h3>

                    {goal.description && (
                      <p>{goal.description}</p>
                    )}
                  </div>

                  <strong>
                    {goal.priority.toUpperCase()}
                  </strong>
                </div>

                <p>
                  Category: {goal.category}
                </p>

                <p>
                  Deadline:{' '}
                  {new Date(
                    goal.deadline
                  ).toLocaleDateString()}
                </p>

                <p>
                  Status: {goal.status}
                </p>

                <div style={{ marginTop: '1rem' }}>

                  <label>
                    Progress: {goal.progress}%
                  </label>

                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={goal.progress}
                    onChange={(e) =>
                      updateProgress(
                        goal._id,
                        e.target.value
                      )
                    }
                  />

                </div>

              </div>

            ))}
          </div>
        )}

      </div>

    </div>
  );
}

export default Academic;