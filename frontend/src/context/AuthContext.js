import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../utils/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('synapse_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem('synapse_token');
  });

  const login = async (email, password) => {
    const response = await api.post('/auth/login', {
      email,
      password
    });

    const { token, user } = response.data;

    localStorage.setItem('synapse_token', token);
    localStorage.setItem('synapse_user', JSON.stringify(user));

    setToken(token);
    setUser(user);

    return user;
  };

  const register = async (name, email, password) => {
    const response = await api.post('/auth/register', {
      name,
      email,
      password
    });

    const { token, user } = response.data;

    localStorage.setItem('synapse_token', token);
    localStorage.setItem('synapse_user', JSON.stringify(user));

    setToken(token);
    setUser(user);

    return user;
  };

  const logout = () => {
    localStorage.removeItem('synapse_token');
    localStorage.removeItem('synapse_user');

    setToken(null);
    setUser(null);
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
        isAuthenticated: !!token
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);