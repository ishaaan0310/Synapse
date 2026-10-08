import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthVisual from '../components/AuthVisual';
import Icon from '../components/Icons';

function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: ''
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Simple password strength meter
  const strength = (() => {
    const p = form.password;
    if (!p) return null;
    let score = 0;
    if (p.length >= 8) score += 1;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score += 1;
    if (/\d/.test(p)) score += 1;
    if (/[^A-Za-z0-9]/.test(p)) score += 1;
    if (p.length < 6) return { label: 'Too short', level: 0 };
    return [
      { label: 'Weak', level: 1 },
      { label: 'Fair', level: 2 },
      { label: 'Good', level: 3 },
      { label: 'Strong', level: 4 },
      { label: 'Strong', level: 4 }
    ][score];
  })();

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');
    setLoading(true);

    try {
      await register(
        form.name,
        form.email,
        form.password
      );

      navigate('/');
    } catch (err) {
  console.error('Registration error:', err);

  setError(
    err.response?.data?.msg ||
    err.response?.data?.message ||
    err.response?.data?.error ||
    err.message ||
    'Registration failed'
  );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <AuthVisual />

      <main className="auth-panel">
      <div className="auth-card">

        <h2>Create your account</h2>

        <p className="auth-subtitle">
          It takes less than a minute.
        </p>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label>Name</label>

          <input
            type="text"
            name="name"
            placeholder="Your name"
            value={form.name}
            onChange={handleChange}
            required
          />

          <label>Email</label>

          <input
            type="email"
            name="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={handleChange}
            required
          />

          <label>Password</label>

          <div className="password-field">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              placeholder="Create a password"
              value={form.password}
              onChange={handleChange}
              minLength="6"
              autoComplete="new-password"
              required
            />

            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              <Icon name={showPassword ? 'eyeOff' : 'eye'} size={18} />
            </button>
          </div>

          {strength && (
            <div className={`strength strength-${strength.level}`}>
              <div className="strength-bar"><span /></div>
              <small>{strength.label}</small>
            </div>
          )}

          <button
            className="btn auth-btn"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{' '}
          <Link to="/login">Sign in</Link>
        </p>
      </div>
      </main>
    </div>
  );
}

export default Register;