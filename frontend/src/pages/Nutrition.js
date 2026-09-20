import React, { useEffect, useState } from 'react';
import api from '../utils/api';

function Nutrition() {

  const [form, setForm] = useState({
    mealType: 'breakfast',
    foodName: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    imageUrl: ''
  });

  const [meals, setMeals] = useState([]);

  const [totals, setTotals] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0
  });

  const [goals, setGoals] = useState({
    calories: 2000,
    protein: 100
  });

  const [goalForm, setGoalForm] = useState({
    calories: 2000,
    protein: 100
  });

  const [historyTrends, setHistoryTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingGoals, setSavingGoals] = useState(false);

  const [error, setError] = useState('');

  // =====================================
  // FETCH NUTRITION DATA & TRENDS
  // =====================================

  const fetchMeals = async () => {
    try {

      setLoading(true);
      setError('');

      const [dailyRes, trendsRes] = await Promise.all([
        api.get('/nutrition/daily'),
        api.get('/nutrition/history-trends')
      ]);

      setMeals(dailyRes.data.meals || []);
      setHistoryTrends(trendsRes.data || []);

      setTotals(
        dailyRes.data.totals || {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0
        }
      );

      const currentGoals =
        dailyRes.data.goals || {
          calories: 2000,
          protein: 100
        };

      setGoals(currentGoals);
      setGoalForm(currentGoals);

    } catch (err) {

      console.error(
        'Nutrition fetch error:',
        err
      );

      setError(
        err.response?.data?.message ||
        'Unable to load nutrition data'
      );

    } finally {

      setLoading(false);

    }
  };

  useEffect(() => {
    fetchMeals();
  }, []);

  // =====================================
  // MEAL FORM
  // =====================================

  const handleChange = (e) => {

    setForm({
      ...form,
      [e.target.name]: e.target.value
    });

  };

  // =====================================
  // ADD MEAL
  // =====================================

  const handleSubmit = async (e) => {

    e.preventDefault();

    try {

      setSaving(true);
      setError('');

      await api.post('/nutrition', {
        mealType: form.mealType,
        foodName: form.foodName,
        calories: Number(form.calories),
        protein: Number(form.protein),
        carbs: Number(form.carbs),
        fat: Number(form.fat),
        imageUrl: form.imageUrl
      });

      setForm({
        mealType: 'breakfast',
        foodName: '',
        calories: '',
        protein: '',
        carbs: '',
        fat: '',
        imageUrl: ''
      });

      await fetchMeals();

    } catch (err) {

      console.error(
        'Nutrition save error:',
        err
      );

      setError(
        err.response?.data?.message ||
        'Failed to save meal'
      );

    } finally {

      setSaving(false);

    }
  };

  // =====================================
  // GOAL FORM CHANGE
  // =====================================

  const handleGoalChange = (e) => {

    setGoalForm({
      ...goalForm,
      [e.target.name]: e.target.value
    });

  };

  // =====================================
  // SAVE GOALS
  // =====================================

  const saveGoals = async (e) => {

    e.preventDefault();

    try {

      setSavingGoals(true);
      setError('');

      const response =
        await api.put('/goals', {

          calories:
            Number(goalForm.calories),

          protein:
            Number(goalForm.protein)

        });

      setGoals(response.data.goals);

      setGoalForm(response.data.goals);

    } catch (err) {

      console.error(
        'Goal save error:',
        err
      );

      setError(
        err.response?.data?.message ||
        'Failed to save nutrition goals'
      );

    } finally {

      setSavingGoals(false);

    }
  };

  // =====================================
  // PROGRESS CALCULATION
  // =====================================

  const calorieProgress =
    goals.calories > 0
      ? Math.min(
          (totals.calories /
            goals.calories) *
            100,
          100
        )
      : 0;

  const proteinProgress =
    goals.protein > 0
      ? Math.min(
          (totals.protein /
            goals.protein) *
            100,
          100
        )
      : 0;

  // =====================================
  // STATUS
  // =====================================

  const getStatus = (current, goal) => {

    if (current >= goal) {
      return {
        text: 'Goal achieved 🎯',
        className: 'goal-achieved'
      };
    }

    return {
      text: `${Math.round(
        (current / goal) * 100
      )}% achieved`,
      className: 'goal-progress'
    };
  };

  const calorieStatus =
    getStatus(
      totals.calories,
      goals.calories
    );

  const proteinStatus =
    getStatus(
      totals.protein,
      goals.protein
    );

  // =====================================
  // TIME
  // =====================================

  const formatTime = (date) => {

    return new Date(date).toLocaleTimeString(
      'en-IN',
      {
        hour: '2-digit',
        minute: '2-digit'
      }
    );

  };

  return (

    <div className="page">

      <h2>🍎 Nutrition</h2>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* =================================
          DAILY GOALS
      ================================= */}

      <div className="card">

        <h3>🎯 Daily Nutrition Goals</h3>

        <p>
          Set how much you want to consume
          each day.
        </p>

        <form onSubmit={saveGoals}>

          <input
            type="number"
            name="calories"
            placeholder="Daily Calories"
            value={goalForm.calories}
            onChange={handleGoalChange}
            min="1"
            required
          />

          <input
            type="number"
            name="protein"
            placeholder="Daily Protein (g)"
            value={goalForm.protein}
            onChange={handleGoalChange}
            min="1"
            required
          />

          <button
            type="submit"
            className="btn"
            disabled={savingGoals}
          >
            {savingGoals
              ? 'Saving...'
              : 'Save Goals'}
          </button>

        </form>

      </div>

      {/* =================================
          PROGRESS
      ================================= */}

      <div className="card">

        <h3>📊 Today's Progress</h3>

        {/* CALORIES REMAINING CALLOUT */}
        {(() => {
          const remaining = goals.calories - totals.calories;
          const isOver = remaining < 0;
          return (
            <div style={{
              padding: '1rem 1.25rem',
              borderRadius: '10px',
              background: isOver ? '#fff5f5' : '#f0fff4',
              border: `1px solid ${isOver ? '#feb2b2' : '#9ae6b4'}`,
              marginBottom: '1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <strong style={{ color: isOver ? '#c53030' : '#276749', fontSize: '1rem' }}>
                  {isOver ? '⚠️ Calorie Goal Exceeded' : '⚡ Calories Remaining Today'}
                </strong>
                <p style={{ margin: '0.2rem 0 0 0', color: '#4a5568', fontSize: '0.85rem' }}>
                  {isOver ? `You are ${Math.abs(remaining)} kcal over your daily target` : `You can consume ${remaining} more kcal today`}
                </p>
              </div>
              <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: isOver ? '#e53e3e' : '#38a169' }}>
                {isOver ? `+${Math.abs(remaining)}` : remaining} <small style={{ fontSize: '0.9rem' }}>kcal</small>
              </span>
            </div>
          );
        })()}

        {/* CALORIES PROGRESS */}
        <div style={{ marginBottom: '1.5rem' }}>

          <div
            style={{
              display: 'flex',
              justifyContent:
                'space-between',
              marginBottom: '0.5rem'
            }}
          >

            <strong>
              🔥 Calories Progress
            </strong>

            <span>
              {totals.calories} /
              {goals.calories} kcal
            </span>

          </div>

          <div
            style={{
              height: '14px',
              background: '#e5e5e5',
              borderRadius: '20px',
              overflow: 'hidden'
            }}
          >

            <div
              style={{
                width: `${calorieProgress}%`,
                height: '100%',
                background: totals.calories > goals.calories ? '#e53e3e' : '#667eea',
                borderRadius: '20px',
                transition:
                  'width 0.5s ease'
              }}
            />

          </div>

          <p
            style={{
              marginTop: '0.5rem',
              fontSize: '0.9rem'
            }}
          >
            {calorieStatus.text}
          </p>

        </div>

        {/* PROTEIN PROGRESS */}
        <div style={{ marginBottom: '1.5rem' }}>

          <div
            style={{
              display: 'flex',
              justifyContent:
                'space-between',
              marginBottom: '0.5rem'
            }}
          >

            <strong>
              💪 Protein Progress
            </strong>

            <span>
              {totals.protein} /
              {goals.protein} g
            </span>

          </div>

          <div
            style={{
              height: '14px',
              background: '#e5e5e5',
              borderRadius: '20px',
              overflow: 'hidden'
            }}
          >

            <div
              style={{
                width: `${proteinProgress}%`,
                height: '100%',
                background: '#48bb78',
                borderRadius: '20px',
                transition:
                  'width 0.5s ease'
              }}
            />

          </div>

          <p
            style={{
              marginTop: '0.5rem',
              fontSize: '0.9rem'
            }}
          >
            {proteinStatus.text}
          </p>

        </div>

        {/* MACRO BALANCE BREAKDOWN */}
        {(() => {
          const pCal = totals.protein * 4;
          const cCal = totals.carbs * 4;
          const fCal = totals.fat * 9;
          const totalCal = pCal + cCal + fCal || 1;

          const pPct = Math.round((pCal / totalCal) * 100);
          const cPct = Math.round((cCal / totalCal) * 100);
          const fPct = Math.round((fCal / totalCal) * 100);

          return (
            <div style={{ paddingTop: '1rem', borderTop: '1px solid #eee' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', color: '#2d3748' }}>🥗 Macro Calorie Split Ratio</h4>
              <div style={{ height: '20px', display: 'flex', borderRadius: '10px', overflow: 'hidden', background: '#edf2f7' }}>
                <div style={{ width: `${pPct}%`, background: '#48bb78', title: `Protein ${pPct}%` }} />
                <div style={{ width: `${cPct}%`, background: '#4299e1', title: `Carbs ${cPct}%` }} />
                <div style={{ width: `${fPct}%`, background: '#ed8936', title: `Fat ${fPct}%` }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.85rem' }}>
                <span style={{ color: '#276749', fontWeight: 'bold' }}>💪 Protein: {pPct}%</span>
                <span style={{ color: '#2b6cb0', fontWeight: 'bold' }}>🍞 Carbs: {cPct}%</span>
                <span style={{ color: '#c05621', fontWeight: 'bold' }}>🥑 Fat: {fPct}%</span>
              </div>
            </div>
          );
        })()}

      </div>

      {/* =================================
          ADD MEAL
      ================================= */}

      <div className="card">

        <h3>🍽️ Log Meal</h3>

        <form onSubmit={handleSubmit}>

          <select
            name="mealType"
            value={form.mealType}
            onChange={handleChange}
          >

            <option value="breakfast">
              Breakfast
            </option>

            <option value="lunch">
              Lunch
            </option>

            <option value="dinner">
              Dinner
            </option>

            <option value="snack">
              Snack
            </option>

          </select>

          <input
            type="text"
            name="foodName"
            placeholder="Food name"
            value={form.foodName}
            onChange={handleChange}
            required
          />

          <input
            type="number"
            name="calories"
            placeholder="Calories"
            value={form.calories}
            onChange={handleChange}
            required
          />

          <input
            type="number"
            name="protein"
            placeholder="Protein (g)"
            value={form.protein}
            onChange={handleChange}
          />

          <input
            type="number"
            name="carbs"
            placeholder="Carbs (g)"
            value={form.carbs}
            onChange={handleChange}
          />

          <input
            type="url"
            name="imageUrl"
            placeholder="Image URL (optional, e.g. https://...)"
            value={form.imageUrl}
            onChange={handleChange}
          />

          {form.imageUrl && (
            <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
              <img
                src={form.imageUrl}
                alt="Meal Preview"
                style={{ maxHeight: '100px', borderRadius: '8px', border: '1px solid #ccc' }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
          )}

          <button
            type="submit"
            className="btn"
            disabled={saving}
          >

            {saving
              ? 'Saving...'
              : 'Add Meal'}

          </button>

        </form>

      </div>

      {/* =================================
          TODAY'S TOTALS
      ================================= */}

      <div className="card">

        <h3>Today's Nutrition</h3>

        <div className="stats-grid">

          <div className="stat-card">
            <h3>Calories</h3>

            <p className="stat-number">
              {totals.calories}
            </p>

            <span>
              / {goals.calories} kcal
            </span>
          </div>

          <div className="stat-card">
            <h3>Protein</h3>

            <p className="stat-number">
              {totals.protein}g
            </p>

            <span>
              / {goals.protein}g
            </span>
          </div>

          <div className="stat-card">
            <h3>Carbs</h3>

            <p className="stat-number">
              {totals.carbs}g
            </p>
          </div>

          <div className="stat-card">
            <h3>Fat</h3>

            <p className="stat-number">
              {totals.fat}g
            </p>
          </div>

        </div>

      </div>

      {/* =================================
          7-DAY NUTRITION TRENDS
      ================================= */}
      {historyTrends.length > 0 && (
        <div className="card">
          <h3>📈 7-Day Nutrition Intake Trends</h3>
          <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1rem' }}>
            Daily totals aggregated across your logged meals using MongoDB pipelines.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            {historyTrends.map((day) => (
              <div
                key={day._id}
                style={{
                  padding: '0.85rem',
                  borderRadius: '10px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0'
                }}
              >
                <strong style={{ display: 'block', fontSize: '0.85rem', color: '#4a5568', marginBottom: '0.4rem' }}>
                  📅 {day._id}
                </strong>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: day.totalCalories > goals.calories ? '#e53e3e' : '#2b6cb0' }}>
                  {day.totalCalories} <small style={{ fontSize: '0.75rem' }}>kcal</small>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#718096', marginTop: '0.3rem' }}>
                  💪 {day.totalProtein}g protein | {day.mealCount} meal(s)
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =================================
          MEALS
      ================================= */}

      <div className="card">

        <h3>Today's Meals</h3>

        {loading ? (

          <p>Loading meals...</p>

        ) : meals.length === 0 ? (

          <p>
            No meals logged today.
          </p>

        ) : (

          meals.map((meal) => (

            <div
              key={meal._id}
              style={{
                padding: '1rem',
                marginBottom: '1rem',
                borderRadius: '12px',
                background: '#f7f7ff',
                border:
                  '1px solid #e5e5e5'
              }}
            >

              <div
                style={{
                  display: 'flex',
                  justifyContent:
                    'space-between',
                  alignItems: 'center',
                  gap: '1rem'
                }}
              >

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {meal.imageUrl && (
                    <img
                      src={meal.imageUrl}
                      alt={meal.foodName}
                      style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px' }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  )}

                  <div>

                    <strong style={{ fontSize: '0.8rem', color: '#667eea' }}>
                      {meal.mealType.toUpperCase()}
                    </strong>

                    <h3 style={{ margin: '0.2rem 0' }}>
                      {meal.foodName}
                    </h3>

                    <small style={{ color: '#888' }}>
                      {formatTime(meal.date)}
                    </small>

                  </div>
                </div>

                <strong style={{ fontSize: '1.1rem', color: '#2d3748' }}>
                  {meal.calories} kcal
                </strong>

              </div>

              <div
                style={{
                  marginTop: '0.75rem',
                  display: 'flex',
                  gap: '1rem',
                  flexWrap: 'wrap'
                }}
              >

                <span>
                  Protein:{' '}
                  {meal.protein || 0}g
                </span>

                <span>
                  Carbs:{' '}
                  {meal.carbs || 0}g
                </span>

                <span>
                  Fat:{' '}
                  {meal.fat || 0}g
                </span>

              </div>

            </div>

          ))

        )}

      </div>

    </div>
  );
}

export default Nutrition;