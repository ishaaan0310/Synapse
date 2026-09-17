import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  Navigate
} from 'react-router-dom';

import Dashboard from './pages/DashBoard';
import Health from './pages/Health';
import Nutrition from './pages/Nutrition';
import Academic from './pages/Academic';
import Documents from './pages/Document';
import Chat from './pages/Chat';

import Login from './pages/Login';
import Register from './pages/Register';

import { AuthProvider, useAuth } from './context/AuthContext';

import './App.css';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function Navigation() {
  const { user, logout } = useAuth();

  return (
    <nav className="navbar">
      <h1>🧠 Synapse</h1>

      <div className="nav-links">
        <Link to="/">Dashboard</Link>
        <Link to="/health">Health</Link>
        <Link to="/nutrition">Nutrition</Link>
        <Link to="/academic">Academic</Link>
        <Link to="/documents">Documents</Link>
        <Link to="/chat">AI Twin</Link>

        {user && (
          <>
            <span className="user-name">
              {user.name}
            </span>

            <button
              className="logout-btn"
              onClick={logout}
            >
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app">

          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <>
                    <Navigation />

                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/health" element={<Health />} />
                      <Route path="/nutrition" element={<Nutrition />} />
                      <Route path="/academic" element={<Academic />} />
                      <Route path="/documents" element={<Documents />} />
                      <Route path="/chat" element={<Chat />} />
                    </Routes>
                  </>
                </ProtectedRoute>
              }
            />
          </Routes>

        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;