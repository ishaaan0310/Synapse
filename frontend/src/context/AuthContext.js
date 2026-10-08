import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../utils/api';

const AuthContext = createContext();

// Never crash the whole app because localStorage holds bad JSON
const readSavedUser = () => {
  try {
    const savedUser = localStorage.getItem('synapse_user');
    return savedUser ? JSON.parse(savedUser) : null;
  } catch {
    localStorage.removeItem('synapse_user');
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(readSavedUser);

  const [token, setToken] = useState(() => {
    return localStorage.getItem('synapse_token');
  });

  const saveSession = (token, user) => {
    localStorage.setItem('synapse_token', token);
    localStorage.setItem('synapse_user', JSON.stringify(user));

    setToken(token);
    setUser(user);
  };

  const login = async (email, password) => {
    const response = await api.post('/auth/login', {
      email,
      password
    });

    const { token, user } = response.data;
    saveSession(token, user);

    return user;
  };

  const register = async (name, email, password) => {
    const response = await api.post('/auth/register', {
      name,
      email,
      password
    });

    const { token, user } = response.data;
    saveSession(token, user);

    return user;
  };

  const logout = useCallback(() => {
    localStorage.removeItem('synapse_token');
    localStorage.removeItem('synapse_user');

    setToken(null);
    setUser(null);
  }, []);

  // Used by the Profile page after the name changes
  const updateUser = (changes) => {
    setUser((current) => {
      const next = { ...current, ...changes };
      localStorage.setItem('synapse_user', JSON.stringify(next));
      return next;
    });
  };

  useEffect(() => {
    if (token) {
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common.Authorization;
    }
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        register,
        logout,
        updateUser,
        isAuthenticated: !!token
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
