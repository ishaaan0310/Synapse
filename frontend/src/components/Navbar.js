import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Icon from './Icons';

// Each section has its own signal colour (see --health, --nutrition... in App.css)
const LINKS = [
  { to: '/', label: 'Dashboard', short: 'Home', icon: 'home', module: 'brand', end: true },
  { to: '/health', label: 'Health', short: 'Health', icon: 'health', module: 'health' },
  { to: '/nutrition', label: 'Nutrition', short: 'Food', icon: 'nutrition', module: 'nutrition' },
  { to: '/academic', label: 'Academic', short: 'Study', icon: 'academic', module: 'academic' },
  { to: '/documents', label: 'Documents', short: 'Docs', icon: 'documents', module: 'documents' },
  { to: '/chat', label: 'AI Twin', short: 'Twin', icon: 'twin', module: 'brand' }
];

// Bottom tab bar on phones shows the five most used sections
const MOBILE_TABS = ['/', '/health', '/nutrition', '/academic', '/chat'];

const initialsOf = (name = '?') =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const themeLabel = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <>
      {/* ============ DESKTOP SIDEBAR ============ */}
      <aside className="sidebar" aria-label="Main navigation">
        <NavLink to="/" className="brand" aria-label="Synapse home">
          <span className="brand-mark"><Icon name="twin" size={20} strokeWidth={2} /></span>
          <span className="brand-name">Synapse</span>
        </NavLink>

        <nav className="side-nav">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => `side-link mod-${link.module} ${isActive ? 'active' : ''}`}
            >
              <span className="side-icon"><Icon name={link.icon} /></span>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="side-footer">
          <button type="button" className="side-link" onClick={toggleTheme} aria-label={themeLabel}>
            <span className="side-icon"><Icon name={theme === 'dark' ? 'sun' : 'moon'} /></span>
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>

          {user && (
            <div className="side-user">
              <NavLink to="/profile" className={({ isActive }) => `side-profile ${isActive ? 'active' : ''}`}>
                <span className="avatar">{initialsOf(user.name)}</span>
                <span className="side-user-text">
                  <strong>{user.name}</strong>
                  <small>Profile & settings</small>
                </span>
              </NavLink>
              <button type="button" className="icon-btn ghost" onClick={logout} title="Log out" aria-label="Log out">
                <Icon name="logout" size={18} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ============ MOBILE TOP BAR ============ */}
      <header className="topbar">
        <NavLink to="/" className="brand" aria-label="Synapse home">
          <span className="brand-mark"><Icon name="twin" size={18} strokeWidth={2} /></span>
          <span className="brand-name">Synapse</span>
        </NavLink>

        <div className="topbar-actions">
          <NavLink to="/documents" className="icon-btn ghost" aria-label="Documents">
            <Icon name="documents" size={19} />
          </NavLink>
          <button type="button" className="icon-btn ghost" onClick={toggleTheme} aria-label={themeLabel}>
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={19} />
          </button>
          {user && (
            <NavLink to="/profile" className="avatar-link" aria-label="Profile">
              <span className="avatar">{initialsOf(user.name)}</span>
            </NavLink>
          )}
        </div>
      </header>

      {/* ============ MOBILE BOTTOM TAB BAR ============ */}
      <nav className="tabbar" aria-label="Main navigation">
        {LINKS.filter((link) => MOBILE_TABS.includes(link.to)).map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => `tab-link mod-${link.module} ${isActive ? 'active' : ''}`}
          >
            <Icon name={link.icon} size={22} />
            <span>{link.short}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}

export default Navbar;
