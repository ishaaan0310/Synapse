import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';

import Dashboard from './pages/DashBoard';
import Health from './pages/Health';
import Nutrition from './pages/Nutrition';
import Academic from './pages/Academic';
import Documents from './pages/Document';
import Chat from './pages/Chat';
import Profile from './pages/Profile';

import Login from './pages/Login';
import Register from './pages/Register';

import Navbar from './components/Navbar';
import { ToastProvider } from './components/Toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

import './App.css';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Logged-in users who open /login or /register go straight to the dashboard
function GuestRoute({ children }) {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function NotFound() {
  return (
    <div className="page empty-state">
      <div className="empty-icon">🧭</div>
      <h2>Page not found</h2>
      <p>The page you're looking for doesn't exist.</p>
      <a className="btn" href="/">Back to dashboard</a>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <Router>
            <div className="app">

              <Routes>
                <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
                <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />

                <Route
                  path="/*"
                  element={
                    <ProtectedRoute>
                      <>
                        <Navbar />

                        <main>
                          <Routes>
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/health" element={<Health />} />
                            <Route path="/nutrition" element={<Nutrition />} />
                            <Route path="/academic" element={<Academic />} />
                            <Route path="/documents" element={<Documents />} />
                            <Route path="/chat" element={<Chat />} />
                            <Route path="/profile" element={<Profile />} />
                            <Route path="*" element={<NotFound />} />
                          </Routes>
                        </main>
                      </>
                    </ProtectedRoute>
                  }
                />
              </Routes>

            </div>
          </Router>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
