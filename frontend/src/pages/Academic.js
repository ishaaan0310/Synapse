import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api, { getErrorMessage, toDateInput } from '../utils/api';
import { useToast } from '../components/Toast';
import { ProgressBar, Skeleton } from '../components/Charts';
import Icon from '../components/Icons';

const EMPTY_FORM = {
  title: '',
  description: '',
  category: 'exam',
  deadline: '',
  priority: 'medium',
  milestones: ''
};

const CATEGORY_ICONS = { exam: 'edit', project: 'bolt', assignment: 'file', course: 'academic' };
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };
const STATUS_LABELS = {
  'not-started': 'Not started',
  'in-progress': 'In progress',
  completed: 'Completed',
  overdue: 'Overdue'
};

const daysLeftText = (goal) => {
  if (goal.status === 'completed') return 'Done';
  const n = goal.daysLeft;
  if (n < 0) return `${Math.abs(n)}d overdue`;
  if (n === 0) return 'Due today';
  if (n === 1) return 'Due tomorrow';
  return `${n} days left`;
};

const daysLeftClass = (goal) => {
  if (goal.status === 'completed') return 'pill-success';
  if (goal.daysLeft < 0 || goal.daysLeft <= 2) return 'pill-danger';
  if (goal.atRisk || goal.daysLeft <= 7) return 'pill-warning';
  return '';
};

// =====================================
// ONE GOAL CARD
// =====================================

function GoalCard({ goal, onChanged, onDeleted }) {
  const toast = useToast();

  const [progress, setProgress] = useState(goal.progress);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [newMilestone, setNewMilestone] = useState('');
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(goal.milestones.length > 0 && goal.status !== 'completed');

  // Keep slider in sync when the goal is refreshed from the server
  useEffect(() => {
    setProgress(goal.progress);
  }, [goal.progress]);

  const hasMilestones = goal.milestones.length > 0;

  const run = async (action, successMessage) => {
    try {
      setBusy(true);
      const response = await action();
      if (response?.data?._id) onChanged(response.data);
      if (successMessage) toast.success(successMessage);
      return true;
    } catch (err) {
      toast.error(getErrorMessage(err, 'Something went wrong'));
      setProgress(goal.progress);
      return false;
    } finally {
      setBusy(false);
    }
  };

  // Only save when the user lets go of the slider (not on every pixel)
  const commitProgress = () => {
    if (Number(progress) === goal.progress) return;
    run(
      () => api.patch(`/academic/${goal._id}/progress`, { progress: Number(progress) }),
      Number(progress) === 100 ? 'Goal completed' : null
    );
  };

  const markComplete = () =>
    run(() => api.patch(`/academic/${goal._id}/progress`, { progress: 100 }), 'Goal completed');

  const toggleMilestone = (milestone) =>
    run(() => api.patch(`/academic/${goal._id}/milestones/${milestone._id}`, { completed: !milestone.completed }));

  const deleteMilestone = (milestone) =>
    run(() => api.delete(`/academic/${goal._id}/milestones/${milestone._id}`));

  const addMilestone = async (e) => {
    e.preventDefault();
    if (!newMilestone.trim()) return;
    const ok = await run(() => api.post(`/academic/${goal._id}/milestones`, { title: newMilestone.trim() }));
    if (ok) setNewMilestone('');
  };

  const startEditing = () => {
    setEditForm({
      title: goal.title,
      description: goal.description || '',
      category: goal.category,
      priority: goal.priority,
      deadline: toDateInput(goal.deadline)
    });
    setEditing(true);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    const ok = await run(() => api.put(`/academic/${goal._id}`, editForm), 'Goal updated');
    if (ok) setEditing(false);
  };

  const remove = async () => {
    if (!window.confirm(`Delete "${goal.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/academic/${goal._id}`);
      onDeleted(goal._id);
      toast.success('Goal deleted');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not delete goal'));
    }
  };

  if (editing) {
    return (
      <div className="card goal-card">
        <form onSubmit={saveEdit}>
          <div className="form-grid">
            <label className="full">Title
              <input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} required />
            </label>
            <label className="full">Description
              <textarea rows="2" value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
            </label>
            <label>Category
              <select value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}>
                <option value="exam">Exam</option>
                <option value="project">Project</option>
                <option value="assignment">Assignment</option>
                <option value="course">Course</option>
              </select>
            </label>
            <label>Priority
              <select value={editForm.priority} onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
            <label>Deadline
              <input type="date" value={editForm.deadline}
                onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })} required />
            </label>
          </div>
          <div className="button-row">
            <button type="submit" className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
            <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className={`card goal-card status-${goal.status} ${goal.atRisk ? 'at-risk' : ''}`}>
      <div className="goal-top">
        <div className="goal-title">
          <span className="goal-icon"><Icon name={CATEGORY_ICONS[goal.category]} size={20} /></span>
          <div>
            <h3>{goal.title}</h3>
            {goal.description && <p className="muted">{goal.description}</p>}
          </div>
        </div>

        <div className="goal-badges">
          <span className={`pill priority-pill-${goal.priority}`}>{goal.priority.toUpperCase()}</span>
          <span className={`pill ${daysLeftClass(goal)}`}>{daysLeftText(goal)}</span>
        </div>
      </div>

      <div className="goal-meta muted small">
        <span>{goal.category}</span>
        <span>· Due {new Date(goal.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        <span>· {STATUS_LABELS[goal.status]}</span>
        {goal.atRisk && <span className="text-danger at-risk-label"><Icon name="alert" size={14} />At risk</span>}
      </div>

      <div className="goal-progress">
        <div className="macro-header">
          <strong>Progress</strong>
          <span>{progress}%{hasMilestones && ` · ${goal.milestones.filter((m) => m.completed).length}/${goal.milestones.length} milestones`}</span>
        </div>

        {hasMilestones ? (
          <ProgressBar value={goal.progress} color={goal.status === 'completed' ? 'var(--success)' : 'var(--primary)'} />
        ) : (
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={progress}
            disabled={busy}
            onChange={(e) => setProgress(Number(e.target.value))}
            onMouseUp={commitProgress}
            onTouchEnd={commitProgress}
            onKeyUp={commitProgress}
            aria-label="Progress"
          />
        )}
      </div>

      {expanded && (
        <div className="milestones">
          {goal.milestones.map((m) => (
            <div key={m._id} className={`milestone ${m.completed ? 'done' : ''}`}>
              <label>
                <input type="checkbox" checked={m.completed} disabled={busy} onChange={() => toggleMilestone(m)} />
                <span>{m.title}</span>
              </label>
              <button type="button" className="icon-btn small" onClick={() => deleteMilestone(m)}
                aria-label="Delete milestone" title="Delete milestone">×</button>
            </div>
          ))}

          <form onSubmit={addMilestone} className="inline-form">
            <input
              value={newMilestone}
              onChange={(e) => setNewMilestone(e.target.value)}
              placeholder="Add a milestone (e.g. Finish chapter 3)"
              maxLength="120"
            />
            <button type="submit" className="btn small" disabled={busy || !newMilestone.trim()}>Add</button>
          </form>
          {!hasMilestones && (
            <p className="muted small">Once you add milestones, progress updates automatically as you tick them off.</p>
          )}
        </div>
      )}

      <div className="goal-actions">
        <button type="button" className="link-btn" onClick={() => setExpanded((v) => !v)}>
          {expanded ? '▲ Hide milestones' : `▼ Milestones${hasMilestones ? ` (${goal.milestones.length})` : ''}`}
        </button>

        <div className="button-row">
          {goal.status !== 'completed' && !hasMilestones && (
            <button type="button" className="btn btn-secondary small" onClick={markComplete} disabled={busy}>
              <Icon name="check" size={16} /> Mark complete
            </button>
          )}
          <button type="button" className="icon-btn small" onClick={startEditing} title="Edit" aria-label="Edit goal"><Icon name="edit" size={16} /></button>
          <button type="button" className="icon-btn small danger" onClick={remove} title="Delete" aria-label="Delete goal"><Icon name="trash" size={16} /></button>
        </div>
      </div>
    </div>
  );
}

// =====================================
// PAGE
// =====================================

function Academic() {
  const toast = useToast();

  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [goals, setGoals] = useState([]);
  const [stats, setStats] = useState(null);

  const [statusFilter, setStatusFilter] = useState('active');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('deadline');
  const [search, setSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchGoals = useCallback(async () => {
    try {
      setError('');

      const response = await api.get('/academic');

      setGoals(response.data.goals || []);
      setStats(response.data.stats || null);
    } catch (err) {
      console.error('Fetch academic goals error:', err);
      setError(getErrorMessage(err, 'Unable to load academic goals'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError('');

      await api.post('/academic', {
        ...form,
        milestones: form.milestones
          .split('\n')
          .map((m) => m.trim())
          .filter(Boolean)
      });

      setForm(EMPTY_FORM);
      setShowForm(false);
      toast.success('Goal created');

      await fetchGoals();
    } catch (err) {
      console.error('Create goal error:', err);
      setError(getErrorMessage(err, 'Unable to create goal'));
    } finally {
      setSaving(false);
    }
  };

  // Replace one goal in place, then refresh stats quietly
  const handleChanged = (updated) => {
    setGoals((list) => list.map((g) => (g._id === updated._id ? updated : g)));
    fetchGoals();
  };

  const handleDeleted = (id) => {
    setGoals((list) => list.filter((g) => g._id !== id));
    fetchGoals();
  };

  const visibleGoals = useMemo(() => {
    const term = search.trim().toLowerCase();

    return goals
      .filter((g) => {
        if (statusFilter === 'active') return g.status !== 'completed';
        if (statusFilter === 'all') return true;
        return g.status === statusFilter;
      })
      .filter((g) => categoryFilter === 'all' || g.category === categoryFilter)
      .filter((g) => !term || g.title.toLowerCase().includes(term) || (g.description || '').toLowerCase().includes(term))
      .sort((a, b) => {
        if (sortBy === 'priority') return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || new Date(a.deadline) - new Date(b.deadline);
        if (sortBy === 'progress') return a.progress - b.progress;
        return new Date(a.deadline) - new Date(b.deadline);
      });
  }, [goals, statusFilter, categoryFilter, sortBy, search]);

  const atRisk = goals.filter((g) => g.atRisk).length;

  return (
    <div className="page mod-academic">
      <div className="page-header">
        <h2><span className="page-icon"><Icon name="academic" size={22} /></span>Academic goals</h2>
        <button type="button" className="btn" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Close' : <><Icon name="plus" size={18} /> New goal</>}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {stats && stats.total > 0 && (
        <div className="stats-grid">
          <div className="stat-card"><h3>Total</h3><p className="stat-number">{stats.total}</p></div>
          <div className="stat-card"><h3>Completed</h3><p className="stat-number" style={{ color: 'var(--success)' }}>{stats.completed}</p></div>
          <div className="stat-card"><h3>At risk</h3><p className="stat-number" style={{ color: 'var(--warning)' }}>{atRisk}</p></div>
          <div className="stat-card"><h3>Overdue</h3><p className="stat-number" style={{ color: 'var(--danger)' }}>{stats.overdue}</p></div>
        </div>
      )}

      {(showForm || (!loading && goals.length === 0)) && (
        <div className="card section">
          <h3>Create a goal</h3>

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <label className="full">Title
                <input type="text" placeholder="e.g. DBMS mid-sem exam" value={form.title} maxLength="120"
                  onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </label>

              <label className="full">Description
                <textarea placeholder="Optional details" value={form.description} rows="2"
                  onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </label>

              <label>Category
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  <option value="exam">Exam</option>
                  <option value="project">Project</option>
                  <option value="assignment">Assignment</option>
                  <option value="course">Course</option>
                </select>
              </label>

              <label>Priority
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>

              <label>Deadline
                <input type="date" value={form.deadline} min={toDateInput()}
                  onChange={(e) => setForm({ ...form, deadline: e.target.value })} required />
              </label>

              <label className="full">Milestones <span className="muted">(optional, one per line)</span>
                <textarea rows="3" placeholder={'Revise units 1–2\nSolve past papers\nMock test'}
                  value={form.milestones} onChange={(e) => setForm({ ...form, milestones: e.target.value })} />
              </label>
            </div>

            <button type="submit" className="btn" disabled={saving}>
              {saving ? 'Creating…' : 'Create goal'}
            </button>
          </form>
        </div>
      )}

      {goals.length > 0 && (
        <div className="toolbar section">
          <div className="tabs">
            {[
              ['active', 'Active'],
              ['overdue', 'Overdue'],
              ['completed', 'Completed'],
              ['all', 'All']
            ].map(([value, label]) => (
              <button key={value} type="button" className={`tab ${statusFilter === value ? 'active' : ''}`}
                onClick={() => setStatusFilter(value)}>
                {label}
              </button>
            ))}
          </div>

          <input type="search" placeholder="Search goals" value={search} onChange={(e) => setSearch(e.target.value)} />

          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} aria-label="Category">
            <option value="all">All categories</option>
            <option value="exam">Exams</option>
            <option value="project">Projects</option>
            <option value="assignment">Assignments</option>
            <option value="course">Courses</option>
          </select>

          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Sort by">
            <option value="deadline">Sort: Deadline</option>
            <option value="priority">Sort: Priority</option>
            <option value="progress">Sort: Least progress</option>
          </select>
        </div>
      )}

      <div className="goal-list">
        {loading ? (
          <><div className="card"><Skeleton lines={3} /></div><div className="card"><Skeleton lines={3} /></div></>
        ) : goals.length === 0 ? null : visibleGoals.length === 0 ? (
          <div className="empty-state small">
            <Icon name="search" size={32} className="empty-icon" />
            <p>No goals match these filters.</p>
          </div>
        ) : (
          visibleGoals.map((goal) => (
            <GoalCard key={goal._id} goal={goal} onChanged={handleChanged} onDeleted={handleDeleted} />
          ))
        )}
      </div>
    </div>
  );
}

export default Academic;
