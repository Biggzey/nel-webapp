import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from '../components/Toast';

// In development, use the proxy. In production, this will be replaced with the actual API URL
const API_BASE_URL = import.meta.env.VITE_API_URL || window.location.origin;

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const { addToast } = useToast();

  // Initialize token from localStorage (or null)
  const [token, setToken] = useState(() => {
    // Validate stored token on init
    try {
      const storedToken = localStorage.getItem("token");
      if (!storedToken) return null;
      
      // Check if token is expired
      const payload = JSON.parse(atob(storedToken.split('.')[1]));
      if (Date.now() >= payload.exp * 1000) {
        console.log('Token expired on init, removing');
        localStorage.removeItem("token");
        return null;
      }
      console.log('Valid token found on init');
      return storedToken;
    } catch (error) {
      console.error('Token validation error:', error);
      localStorage.removeItem("token");
      return null;
    }
  });

  // Persist token changes
  useEffect(() => {
    if (token) {
      console.log('Persisting token to localStorage');
      localStorage.setItem("token", token);
    } else {
      console.log('Removing token from localStorage');
      localStorage.removeItem("token");
    }
  }, [token]);

  // Auth state
  const [userRole, setUserRole] = useState(null);
  const [user, setUser] = useState(null);

  let global429Until = 0;
  const authenticatedFetch = useCallback(async (url, options = {}) => {
    if (Date.now() < global429Until) {
      addToast({ type: 'error', message: 'You are being rate limited. Please wait a moment before trying again.', duration: 5000 });
      throw new Error('Rate limited. Please wait a moment.');
    }
    const headers = {
      ...(options.headers || {}),
      Authorization: token ? `Bearer ${token}` : undefined,
    };
    const res = await fetch(url, { ...options, headers });
    if (res.status === 429) {
      global429Until = Date.now() + 5000;
      addToast({ type: 'error', message: 'You are being rate limited. Please wait a moment before trying again.', duration: 5000 });
      throw new Error('Too many requests. Please wait a moment.');
    }
    if (res.status === 401) {
      logout();
      navigate('/login');
      throw new Error('Session expired. Please log in again.');
    }
    return res;
  }, [token, addToast, navigate]);

  const fetchWithAuth = useCallback((path, options = {}) => {
    return authenticatedFetch(`${API_BASE_URL}${path}`, options);
  }, [authenticatedFetch]);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    try {
      console.log('Refreshing user data');
      const res = await authenticatedFetch(`${API_BASE_URL}/api/user`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const userData = await res.json();
      console.log('User data refreshed:', userData);
      setUser(userData);
      return userData;
    } catch (error) {
      console.error('Error refreshing user data:', error);
      throw error;
    }
  }, [authenticatedFetch]);

  // Fetch user once when token changes
  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }
    refreshUser().catch(console.error);
  }, [token, refreshUser]);

  // Fetch role once when token changes
  useEffect(() => {
    if (!token) {
      setUserRole(null);
      return;
    }
    authenticatedFetch(`${API_BASE_URL}/api/user/role`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then(data => setUserRole(data.role))
      .catch(err => {
        console.error('Error fetching user role:', err);
        logout();
      });
  }, [token, authenticatedFetch]);

  // Signup, login, logout, and role helpers remain unchanged
  async function signup(email, username, password, confirmPassword) {
    console.log('Signup attempt:', { email, username, hasPassword: !!password, hasConfirmPassword: !!confirmPassword });
    const response = await fetch(`${API_BASE_URL}/api/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, username, password, confirmPassword }),
    });
    const data = await response.json();
    if (!response.ok) {
      console.error('Signup failed:', data);
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }
    setToken(data.token);
    navigate("/", { replace: true });
    return true;
  }

  async function login(identifier, password) {
    try {
      console.log('Attempting login...');
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      if (!response.ok) {
        if (response.status === 429) throw new Error("Too many attempts. Please wait a moment before trying again.");
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }
      const { token: newToken } = await response.json();
      setToken(newToken);
      navigate("/", { replace: true });
      return true;
    } catch (error) {
      console.error('Login error:', error);
      if (error.message === 'Failed to fetch') {
        throw new Error('Unable to connect to the server. Please check if the backend is running.');
      }
      throw error;
    }
  }

  function logout() {
    setToken(null);
    setUser(null);
    setUserRole(null);
    localStorage.removeItem("token");
    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    navigate("/login", { replace: true });
  }

  const roleHierarchy = { SUPER_ADMIN: 4, ADMIN: 3, MODERATOR: 2, USER: 1 };
  const isSuperAdmin = userRole === 'SUPER_ADMIN';
  const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(userRole);
  const isModerator = ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'].includes(userRole);
  const canModifyRole = useCallback(targetRole => {
    const current = roleHierarchy[userRole] || 0;
    const target = roleHierarchy[targetRole] || 0;
    return current > target;
  }, [userRole]);

  return (
    <AuthContext.Provider value={{
      token, login, logout,
      userRole, isSuperAdmin, isAdmin, isModerator, canModifyRole,
      signup, authenticatedFetch, fetchWithAuth, user, refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

