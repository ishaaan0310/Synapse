import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const LINKS = [
  { to: '/', label: 'Dashboard', icon: '🏠', end: true },
  { to: '/health', label: 'Health', icon: '❤️' },
  { to: '/nutrition', label: 'Nutrition', icon: '🍎' },
  { to: '/academic', label: 'Academic', icon: '📚' },
  { to: '/documents', label: 'Documents', icon: '📁' },
  { to: '/chat', label: 'AI Twin', icon: '🤖' }
];

function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // Close the mobile menu after navigating
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const initials = (user?.name || '?')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <nav className="navbar">
      <NavLink to="/" className="brand">
        <span className="brand-icon">🧠</span> Synapse
      </NavLink>

      <button
        type="button"
        className="menu-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-label="Toggle menu"
        aria-expanded={open}
      >
        {open ? '✕' : '☰'}
      </button>

      <div className={`nav-links ${open ? 'open' : ''}`}>
        {LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <span className="nav-icon">{link.icon}</span>
            {link.label}
          </NavLink>
        ))}

        <div className="nav-actions">
          <button
            type="button"
            className="icon-btn"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle dark mode"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {user && (
            <>
              <NavLink to="/profile" className="avatar-link" title="Profile">
                <span className="avatar">{initials}</span>
                <span className="user-name">{user.name}</span>
              </NavLink>

              <button className="logout-btn" onClick={logout}>
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
