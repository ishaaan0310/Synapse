import React, { useEffect, useState } from 'react';
import api, { getErrorMessage } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../components/Toast';
import { Skeleton } from '../components/Charts';
import Icon from '../components/Icons';

function Profile() {
  const { updateUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const toast = useToast();

  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [name, setName] = useState('');
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [deletePassword, setDeletePassword] = useState('');
  const [showDelete, setShowDelete] = useState(false);

  const [loading, setLoading] = useState(true);
  const [savingName, setSavingName] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const response = await api.get('/profile');
        setProfile(response.data.user);
        setStats(response.data.stats);
        setName(response.data.user.name);
      } catch (err) {
        setError(getErrorMessage(err, 'Unable to load profile'));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const saveName = async (e) => {
    e.preventDefault();
    try {
      setSavingName(true);
      const response = await api.put('/profile', { name });
      setProfile(response.data.user);
      updateUser({ name: response.data.user.name });
      toast.success('Name updated');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not update name'));
    } finally {
      setSavingName(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();

    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    try {
      setSavingPassword(true);
      await api.put('/profile/password', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword
      });
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password changed');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not change password'));
    } finally {
      setSavingPassword(false);
    }
  };

  const exportData = async () => {
    try {
      setExporting(true);
      const response = await api.get('/profile/export');
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `synapse-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success('Export downloaded');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Export failed'));
    } finally {
      setExporting(false);
    }
  };

  const deleteAccount = async (e) => {
    e.preventDefault();
    if (!window.confirm('This permanently deletes your account and ALL your data. Continue?')) return;

    try {
      await api.delete('/profile', { data: { password: deletePassword } });
      logout();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not delete account'));
    }
  };

  if (loading) {
    return <div className="page narrow"><div className="card"><Skeleton lines={3} /></div><div className="card section"><Skeleton lines={4} /></div></div>;
  }

  if (error) {
    return <div className="page"><h2>Profile</h2><div className="error-message">{error}</div></div>;
  }

  return (
    <div className="page narrow">
      <div className="page-header">
        <h2><span className="page-icon"><Icon name="user" size={22} /></span>Profile and settings</h2>
      </div>

      <div className="card profile-header">
        <div className="avatar large">
          {profile.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()}
        </div>
        <div>
          <h3>{profile.name}</h3>
          <p className="muted">{profile.email}</p>
          {profile.createdAt && (
            <small className="muted">
              Member since {new Date(profile.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </small>
          )}
        </div>
      </div>

      {stats && (
        <div className="stats-grid five section">
          <div className="stat-card"><h3>Health logs</h3><p className="stat-number">{stats.healthLogs}</p></div>
          <div className="stat-card"><h3>Meals</h3><p className="stat-number">{stats.meals}</p></div>
          <div className="stat-card"><h3>Goals</h3><p className="stat-number">{stats.goals}</p></div>
          <div className="stat-card"><h3>Documents</h3><p className="stat-number">{stats.documents}</p></div>
          <div className="stat-card"><h3>Messages</h3><p className="stat-number">{stats.messages}</p></div>
        </div>
      )}

      <div className="card section">
        <h3>Your name</h3>
        <form onSubmit={saveName} className="inline-form">
          <input value={name} onChange={(e) => setName(e.target.value)} minLength="2" maxLength="50" required />
          <button type="submit" className="btn" disabled={savingName || name.trim() === profile.name}>
            {savingName ? 'Saving…' : 'Save'}
          </button>
        </form>
      </div>

      <div className="card section">
        <h3>Appearance</h3>
        <div className="setting-row">
          <div>
            <strong>Dark mode</strong>
            <p className="muted small">Easier on the eyes at night.</p>
          </div>
          <button type="button" className={`switch ${theme === 'dark' ? 'on' : ''}`} onClick={toggleTheme}
            role="switch" aria-checked={theme === 'dark'} aria-label="Dark mode">
            <span />
          </button>
        </div>
      </div>

      <div className="card section">
        <h3>Change password</h3>
        <form onSubmit={changePassword}>
          <div className="form-grid">
            <label className="full">Current password
              <input type="password" autoComplete="current-password" value={passwords.currentPassword}
                onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })} required />
            </label>
            <label>New password
              <input type="password" autoComplete="new-password" minLength="6" value={passwords.newPassword}
                onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} required />
            </label>
            <label>Confirm new password
              <input type="password" autoComplete="new-password" minLength="6" value={passwords.confirmPassword}
                onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })} required />
            </label>
          </div>
          <button type="submit" className="btn" disabled={savingPassword}>
            {savingPassword ? 'Changing…' : 'Change password'}
          </button>
        </form>
      </div>

      <div className="card section">
        <h3>Your data</h3>
        <div className="setting-row">
          <div>
            <strong>Export everything</strong>
            <p className="muted small">Download all your health, nutrition, academic, document and chat data as JSON.</p>
          </div>
          <button type="button" className="btn btn-secondary" onClick={exportData} disabled={exporting}>
            <Icon name="download" size={17} />{exporting ? 'Preparing…' : 'Export'}
          </button>
        </div>
      </div>

      <div className="card section danger-zone">
        <h3>Danger zone</h3>
        {!showDelete ? (
          <div className="setting-row">
            <div>
              <strong>Delete account</strong>
              <p className="muted small">Permanently removes your account, data and uploaded files.</p>
            </div>
            <button type="button" className="btn btn-danger" onClick={() => setShowDelete(true)}>Delete account</button>
          </div>
        ) : (
          <form onSubmit={deleteAccount} className="inline-form">
            <input type="password" placeholder="Enter your password to confirm" value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)} required />
            <button type="submit" className="btn btn-danger">Delete forever</button>
            <button type="button" className="btn btn-secondary" onClick={() => setShowDelete(false)}>Cancel</button>
          </form>
        )}
      </div>
    </div>
  );
}

export default Profile;
