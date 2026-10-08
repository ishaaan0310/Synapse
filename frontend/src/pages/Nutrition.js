import React, { useCallback, useEffect, useState } from 'react';
import api, { getErrorMessage, toDateInput } from '../utils/api';
import { useToast } from '../components/Toast';
import { BarChart, ProgressBar, Skeleton } from '../components/Charts';
import Icon from '../components/Icons';

const EMPTY_MEAL = {
  mealType: 'breakfast',
  foodName: '',
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
  imageUrl: ''
};

const DEFAULT_GOALS = { calories: 2000, protein: 100, carbs: 250, fat: 70 };

const MEAL_TYPES = [
  { value: 'breakfast', label: 'Breakfast', icon: 'sun' },
  { value: 'lunch', label: 'Lunch', icon: 'nutrition' },
  { value: 'dinner', label: 'Dinner', icon: 'moon' },
  { value: 'snack', label: 'Snack', icon: 'bolt' }
];

const MACROS = [
  { key: 'calories', label: 'Calories', icon: 'flame', unit: 'kcal', color: 'var(--nutrition)' },
  { key: 'protein', label: 'Protein', icon: 'protein', unit: 'g', color: 'var(--brand)' },
  { key: 'carbs', label: 'Carbs', icon: 'grain', unit: 'g', color: 'var(--documents)' },
  { key: 'fat', label: 'Fat', icon: 'drop', unit: 'g', color: 'var(--academic)' }
];

// Pick a sensible default meal type from the time of day
const mealTypeForNow = () => {
  const hour = new Date().getHours();
  if (hour < 11) return 'breakfast';
  if (hour < 16) return 'lunch';
  if (hour < 21) return 'dinner';
  return 'snack';
};

const shiftDate = (dateString, days) => {
  const d = new Date(`${dateString}T12:00:00`);
  d.setDate(d.getDate() + days);
  return toDateInput(d);
};

function Nutrition() {
  const toast = useToast();
  const today = toDateInput();

  const [selectedDate, setSelectedDate] = useState(today);
  const [form, setForm] = useState({ ...EMPTY_MEAL, mealType: mealTypeForNow() });

  const [meals, setMeals] = useState([]);
  const [totals, setTotals] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [goals, setGoals] = useState(DEFAULT_GOALS);
  const [goalForm, setGoalForm] = useState(DEFAULT_GOALS);
  const [weekly, setWeekly] = useState(null);
  const [editingGoals, setEditingGoals] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingGoals, setSavingGoals] = useState(false);
  const [error, setError] = useState('');

  const isToday = selectedDate === today;

  // =====================================
  // FETCH
  // =====================================

  const fetchDay = useCallback(async (date) => {
    try {
      setLoading(true);
      setError('');

      const response = await api.get('/nutrition/daily', { params: { date } });

      setMeals(response.data.meals || []);
      setTotals(response.data.totals || { calories: 0, protein: 0, carbs: 0, fat: 0 });

      const currentGoals = { ...DEFAULT_GOALS, ...(response.data.goals || {}) };
      setGoals(currentGoals);
      setGoalForm(currentGoals);
    } catch (err) {
      console.error('Nutrition fetch error:', err);
      setError(getErrorMessage(err, 'Unable to load nutrition data'));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchWeekly = useCallback(async () => {
    try {
      const response = await api.get('/nutrition/weekly');
      setWeekly(response.data);
    } catch (err) {
      console.error('Weekly nutrition error:', err);
    }
  }, []);

  useEffect(() => {
    fetchDay(selectedDate);
  }, [fetchDay, selectedDate]);

  useEffect(() => {
    fetchWeekly();
  }, [fetchWeekly]);

  // =====================================
  // ADD MEAL
  // =====================================

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const logMeal = async (meal) => {
    await api.post('/nutrition', {
      mealType: meal.mealType,
      foodName: meal.foodName,
      calories: Number(meal.calories) || 0,
      protein: Number(meal.protein) || 0,
      carbs: Number(meal.carbs) || 0,
      fat: Number(meal.fat) || 0,
      imageUrl: (meal.imageUrl || '').trim()
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError('');

      await logMeal(form);

      setForm({ ...EMPTY_MEAL, mealType: form.mealType });
      toast.success(`${form.foodName} logged`);

      await Promise.all([fetchDay(today), fetchWeekly()]);
    } catch (err) {
      console.error('Nutrition save error:', err);
      setError(getErrorMessage(err, 'Failed to save meal'));
    } finally {
      setSaving(false);
    }
  };

  // Re-log a previous meal today with one click
  const logAgain = async (meal) => {
    try {
      await logMeal({ ...meal, mealType: mealTypeForNow() });
      toast.success(`${meal.foodName} logged for today`);
      setSelectedDate(today);
      if (isToday) await fetchDay(today);
      fetchWeekly();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to log meal'));
    }
  };

  const deleteMeal = async (meal) => {
    if (!window.confirm(`Delete "${meal.foodName}"?`)) return;

    try {
      await api.delete(`/nutrition/${meal._id}`);
      toast.success('Meal deleted');
      await Promise.all([fetchDay(selectedDate), fetchWeekly()]);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete meal'));
    }
  };

  // =====================================
  // GOALS
  // =====================================

  const handleGoalChange = (e) => {
    setGoalForm({ ...goalForm, [e.target.name]: e.target.value });
  };

  const saveGoals = async (e) => {
    e.preventDefault();

    try {
      setSavingGoals(true);
      setError('');

      const response = await api.put('/goals', {
        calories: Number(goalForm.calories),
        protein: Number(goalForm.protein),
        carbs: Number(goalForm.carbs),
        fat: Number(goalForm.fat)
      });

      setGoals(response.data.goals);
      setGoalForm(response.data.goals);
      setEditingGoals(false);
      toast.success('Nutrition goals saved');
      fetchWeekly();
    } catch (err) {
      console.error('Goal save error:', err);
      setError(getErrorMessage(err, 'Failed to save nutrition goals'));
    } finally {
      setSavingGoals(false);
    }
  };

  // =====================================
  // HELPERS
  // =====================================

  const formatTime = (date) =>
    new Date(date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const dateLabel = isToday
    ? 'Today'
    : selectedDate === shiftDate(today, -1)
      ? 'Yesterday'
      : new Date(`${selectedDate}T12:00:00`).toLocaleDateString('en-IN', {
          weekday: 'short', day: 'numeric', month: 'short'
        });

  const mealsByType = MEAL_TYPES
    .map((type) => ({ ...type, items: meals.filter((m) => m.mealType === type.value) }))
    .filter((group) => group.items.length > 0);

  const remaining = Math.round(goals.calories - totals.calories);

  // Share of today's calories from each macro (protein & carbs 4 kcal/g, fat 9 kcal/g)
  const macroCalories = {
    protein: (totals.protein || 0) * 4,
    carbs: (totals.carbs || 0) * 4,
    fat: (totals.fat || 0) * 9
  };
  const macroTotal = macroCalories.protein + macroCalories.carbs + macroCalories.fat;
  const macroSplit = macroTotal > 0
    ? {
        protein: Math.round((macroCalories.protein / macroTotal) * 100),
        carbs: Math.round((macroCalories.carbs / macroTotal) * 100),
        fat: Math.round((macroCalories.fat / macroTotal) * 100)
      }
    : null;

  return (
    <div className="page mod-nutrition">
      <div className="page-header">
        <h2><span className="page-icon"><Icon name="nutrition" size={22} /></span>Nutrition</h2>

        <div className="date-nav">
          <button type="button" className="icon-btn" onClick={() => setSelectedDate(shiftDate(selectedDate, -1))}
            aria-label="Previous day"><Icon name="chevronLeft" size={18} /></button>
          <input
            type="date"
            value={selectedDate}
            max={today}
            onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
          />
          <button type="button" className="icon-btn" disabled={isToday}
            onClick={() => setSelectedDate(shiftDate(selectedDate, 1))} aria-label="Next day"><Icon name="chevronRight" size={18} /></button>
          {!isToday && (
            <button type="button" className="btn btn-secondary small" onClick={() => setSelectedDate(today)}>
              Today
            </button>
          )}
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* =================================
          PROGRESS
      ================================= */}
      <div className="card">
        <div className="card-header">
          <h3>{dateLabel === 'Today' ? "Today's progress" : `Progress for ${dateLabel}`}</h3>
          <button type="button" className="link-btn" onClick={() => setEditingGoals((v) => !v)}>
            {editingGoals ? 'Cancel' : <><Icon name="target" size={16} /> Edit goals</>}
          </button>
        </div>

        {editingGoals && (
          <form onSubmit={saveGoals} className="goal-form">
            <div className="form-grid four">
              <label>Calories (kcal)
                <input type="number" name="calories" min="1" value={goalForm.calories} onChange={handleGoalChange} required />
              </label>
              <label>Protein (g)
                <input type="number" name="protein" min="1" value={goalForm.protein} onChange={handleGoalChange} required />
              </label>
              <label>Carbs (g)
                <input type="number" name="carbs" min="1" value={goalForm.carbs} onChange={handleGoalChange} required />
              </label>
              <label>Fat (g)
                <input type="number" name="fat" min="1" value={goalForm.fat} onChange={handleGoalChange} required />
              </label>
            </div>
            <button type="submit" className="btn" disabled={savingGoals}>
              {savingGoals ? 'Saving…' : 'Save goals'}
            </button>
          </form>
        )}

        <div className="macro-list">
          {MACROS.map((macro) => {
            const current = Math.round(totals[macro.key] || 0);
            const goal = goals[macro.key] || 0;
            const pct = goal ? Math.round((current / goal) * 100) : 0;
            return (
              <div key={macro.key} className="macro">
                <div className="macro-header">
                  <strong><Icon name={macro.icon} size={16} /> {macro.label}</strong>
                  <span className="num"><strong>{current}</strong> / {goal} {macro.unit}</span>
                </div>
                <ProgressBar value={current} max={goal} color={pct > 110 ? 'var(--danger)' : macro.color} />
                <small className="muted">
                  {pct >= 100 ? (pct > 110 ? `${pct}%, over goal` : 'Goal reached') : `${pct}% achieved`}
                </small>
              </div>
            );
          })}
        </div>

        {isToday && (
          <div className={`remaining-callout ${remaining < 0 ? 'over' : ''}`}>
            <div>
              <strong>{remaining < 0 ? 'Over your calorie goal' : 'Calories remaining today'}</strong>
              <p className="muted small">
                {remaining < 0
                  ? `You're ${Math.abs(remaining)} kcal over your ${goals.calories} kcal target.`
                  : `You can have about ${remaining} more kcal today.`}
              </p>
            </div>
            <span className="remaining-value num">
              {remaining < 0 ? `+${Math.abs(remaining)}` : remaining}<small> kcal</small>
            </span>
          </div>
        )}

        {macroSplit && (
          <div className="macro-split">
            <h4>Where today's calories come from</h4>
            <div className="split-bar" role="img"
              aria-label={`Protein ${macroSplit.protein}%, carbs ${macroSplit.carbs}%, fat ${macroSplit.fat}%`}>
              <span style={{ width: `${macroSplit.protein}%`, background: 'var(--brand)' }} />
              <span style={{ width: `${macroSplit.carbs}%`, background: 'var(--documents)' }} />
              <span style={{ width: `${macroSplit.fat}%`, background: 'var(--academic)' }} />
            </div>
            <div className="split-legend">
              <span><i style={{ background: 'var(--brand)' }} />Protein {macroSplit.protein}%</span>
              <span><i style={{ background: 'var(--documents)' }} />Carbs {macroSplit.carbs}%</span>
              <span><i style={{ background: 'var(--academic)' }} />Fat {macroSplit.fat}%</span>
            </div>
          </div>
        )}
      </div>

      {/* =================================
          WEEKLY CHART
      ================================= */}
      <div className="card section">
        <div className="card-header">
          <h3>Last 7 days</h3>
          {weekly?.averageCalories > 0 && (
            <span className="muted">Avg {weekly.averageCalories.toLocaleString()} kcal/day</span>
          )}
        </div>

        {weekly ? (
          <BarChart
            data={weekly.days.map((d) => ({
              label: new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short' }),
              value: d.calories
            }))}
            unit="kcal"
            target={weekly.goals.calories}
            targetLabel={`Goal ${weekly.goals.calories}`}
          />
        ) : (
          <Skeleton height={240} />
        )}
      </div>

      {/* =================================
          ADD MEAL (today only)
      ================================= */}
      {isToday && (
        <div className="card section">
          <h3>Log a meal</h3>

          <form onSubmit={handleSubmit}>
            <div className="segmented">
              {MEAL_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  className={form.mealType === type.value ? 'active' : ''}
                  onClick={() => setForm({ ...form, mealType: type.value })}
                >
                  <Icon name={type.icon} size={16} /> {type.label}
                </button>
              ))}
            </div>

            <div className="form-grid">
              <label className="full">Food name
                <input type="text" name="foodName" placeholder="e.g. Paneer wrap" value={form.foodName}
                  onChange={handleChange} maxLength="100" required />
              </label>
              <label>Calories (kcal)
                <input type="number" name="calories" min="0" value={form.calories} onChange={handleChange} required />
              </label>
              <label>Protein (g)
                <input type="number" name="protein" min="0" step="0.1" value={form.protein} onChange={handleChange} />
              </label>
              <label>Carbs (g)
                <input type="number" name="carbs" min="0" step="0.1" value={form.carbs} onChange={handleChange} />
              </label>
              <label>Fat (g)
                <input type="number" name="fat" min="0" step="0.1" value={form.fat} onChange={handleChange} />
              </label>
              <label className="full">Photo URL <span className="muted">(optional)</span>
                <input type="url" name="imageUrl" placeholder="https://…" value={form.imageUrl}
                  onChange={handleChange} maxLength="1000" />
              </label>
              {/^https?:\/\//i.test(form.imageUrl) && (
                <div className="full image-preview">
                  <img src={form.imageUrl} alt="Meal preview" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                </div>
              )}
            </div>

            <button type="submit" className="btn" disabled={saving}>
              {saving ? 'Saving…' : 'Add meal'}
            </button>
          </form>
        </div>
      )}

      {/* =================================
          MEALS
      ================================= */}
      <div className="card section">
        <h3>{dateLabel === 'Today' ? "Today's meals" : `Meals on ${dateLabel}`}</h3>

        {loading ? (
          <Skeleton lines={3} />
        ) : meals.length === 0 ? (
          <div className="empty-state small">
            <Icon name="nutrition" size={32} className="empty-icon" />
            <p>No meals logged {isToday ? 'today' : 'on this day'}.</p>
          </div>
        ) : (
          mealsByType.map((group) => (
            <div key={group.value} className="meal-group">
              <h4>
                <Icon name={group.icon} size={17} /> {group.label}
                <span className="muted"> · {Math.round(group.items.reduce((s, m) => s + (m.calories || 0), 0))} kcal</span>
              </h4>

              {group.items.map((meal) => (
                <div key={meal._id} className="entry">
                  <div className="entry-header">
                    <div className="meal-title">
                      {meal.imageUrl && (
                        <img className="meal-thumb" src={meal.imageUrl} alt=""
                          onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                      )}
                      <div>
                        <strong>{meal.foodName}</strong>
                        <small className="muted"> · {formatTime(meal.date)}</small>
                        {meal.items?.length > 0 && (
                          <small className="muted meal-items">{meal.items.map((item) => item.name).join(', ')}</small>
                        )}
                      </div>
                    </div>
                    <div className="entry-actions">
                      <strong>{meal.calories} kcal</strong>
                      <button type="button" className="icon-btn small" onClick={() => logAgain(meal)}
                        title="Log again today" aria-label="Log again today"><Icon name="repeat" size={16} /></button>
                      <button type="button" className="icon-btn small danger" onClick={() => deleteMeal(meal)}
                        title="Delete" aria-label="Delete meal"><Icon name="trash" size={16} /></button>
                    </div>
                  </div>

                  <div className="macro-chips">
                    <span>P {meal.protein || 0}g</span>
                    <span>C {meal.carbs || 0}g</span>
                    <span>F {meal.fat || 0}g</span>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Nutrition;
