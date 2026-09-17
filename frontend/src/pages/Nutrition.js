import React, { useEffect, useState } from 'react';
import api from '../utils/api';

function Nutrition() {

  const [form, setForm] = useState({
    mealType: 'breakfast',
    foodName: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: ''
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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingGoals, setSavingGoals] = useState(false);

  const [error, setError] = useState('');

  // =====================================
  // FETCH NUTRITION DATA
  // =====================================

  const fetchMeals = async () => {
    try {

      setLoading(true);
      setError('');

      const response =
        await api.get('/nutrition/daily');

      setMeals(response.data.meals || []);

      setTotals(
        response.data.totals || {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0
        }
      );

      const currentGoals =
        response.data.goals || {
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

        fat: Number(form.fat)

      });

      setForm({
        mealType: 'breakfast',
        foodName: '',
        calories: '',
        protein: '',
        carbs: '',
        fat: ''
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

        {/* CALORIES */}

        <div style={{ marginBottom: '2rem' }}>

          <div
            style={{
              display: 'flex',
              justifyContent:
                'space-between',
              marginBottom: '0.5rem'
            }}
          >

            <strong>
              🔥 Calories
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
                background: '#667eea',
                borderRadius: '20px',
                transition:
                  'width 0.5s ease'
              }}
            />

          </div>

          <p
            style={{
              marginTop: '0.5rem'
            }}
          >
            {calorieStatus.text}
          </p>

        </div>

        {/* PROTEIN */}

        <div>

          <div
            style={{
              display: 'flex',
              justifyContent:
                'space-between',
              marginBottom: '0.5rem'
            }}
          >

            <strong>
              💪 Protein
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
              marginTop: '0.5rem'
            }}
          >
            {proteinStatus.text}
          </p>

        </div>

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
            type="number"
            name="fat"
            placeholder="Fat (g)"
            value={form.fat}
            onChange={handleChange}
          />

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
                  alignItems: 'center'
                }}
              >

                <div>

                  <strong>
                    {meal.mealType.toUpperCase()}
                  </strong>

                  <h3>
                    {meal.foodName}
                  </h3>

                  <small>
                    {formatTime(meal.date)}
                  </small>

                </div>

                <strong>
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