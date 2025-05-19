import React, { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// In development, use the proxy. In production, this will be replaced with the actual API URL
const API_BASE_URL = import.meta.env.VITE_API_URL || window.location.origin;

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const navigate = useNavigate();

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

  // Add token persistence effect
  useEffect(() => {
    if (token) {
      console.log('Persisting token to localStorage');
      localStorage.setItem("token", token);
    } else {
      console.log('Removing token from localStorage');
      localStorage.removeItem("token");
    }
  }, [token]);

  // Initialize user role from localStorage (or null)
  const [userRole, setUserRole] = useState(null);
  // Add user state
  const [user, setUser] = useState(null);

  // Global fetch interceptor for handling auth errors
  const authenticatedFetch = async (url, options = {}) => {
    if (!token) {
      console.log('No token available, redirecting to login');
      logout();
      return null;
    }

    // Validate token before making request
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (Date.now() >= payload.exp * 1000) {
        console.log('Token expired, logging out');
        logout();
        return null;
      }
    } catch (error) {
      console.error('Token validation error:', error);
      logout();
      return null;
    }

    options.headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`
    };

    try {
      const response = await fetch(url, options);
      
      // Handle authentication errors globally
      if (response.status === 401 || response.status === 403) {
        console.log('Session invalid, logging out');
        logout();
        return null;
      }
      
      return response;
    } catch (error) {
      console.error('Fetch error:', error);
      throw error;
    }
  };

  // Add refreshUser function
  const refreshUser = async () => {
    try {
      console.log('Refreshing user data');
      const res = await authenticatedFetch(`${API_BASE_URL}/api/user`);
      if (!res) return; // User was logged out
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const userData = await res.json();
      console.log('User data refreshed:', userData);
      setUser(userData);
      return userData;
    } catch (error) {
      console.error('Error refreshing user data:', error);
      throw error;
    }
  };

  // Load user data when token changes
  useEffect(() => {
    if (token) {
      console.log('Token present, loading user data');
      refreshUser().catch(console.error);
      
      // Fetch user role
      authenticatedFetch(`${API_BASE_URL}/api/user/role`)
        .then(res => {
          if (!res) return; // User was logged out
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res.json();
        })
        .then(data => {
          if (data) {
            setUserRole(data.role);
          }
        })
        .catch(err => {
          console.error('Error fetching user role:', err);
          logout();
        });
    } else {
      setUser(null);
      setUserRole(null);
      localStorage.removeItem("token");
    }
  }, [token]);

  // Call this to sign up. Throws on error.
  async function signup(email, username, password, confirmPassword) {
    console.log('Signup attempt:', { email, username, hasPassword: !!password, hasConfirmPassword: !!confirmPassword });
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          email, 
          username, 
          password,
          confirmPassword
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('Signup failed:', data);
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      setToken(data.token);
      navigate("/", { replace: true });
      return true;
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  }

  async function login(identifier, password) {
    try {
      console.log('Attempting login...');
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ identifier, password }),
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Too many attempts. Please wait a moment before trying again.");
        }
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

  // Clears token and sends you back to login
  function logout() {
    setToken(null);
    setUser(null);
    setUserRole(null);
    localStorage.removeItem("token");
    // Clear any auth cookies
    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    navigate("/login", { replace: true });
  }

  // Role-based access control helpers
  const roleHierarchy = {
    'SUPER_ADMIN': 4,
    'ADMIN': 3,
    'MODERATOR': 2,
    'USER': 1
  };

  const isSuperAdmin = userRole === 'SUPER_ADMIN';
  const isAdmin = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN';
  const isModerator = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN' || userRole === 'MODERATOR';

  // Helper function to check if a user can modify another role
  const canModifyRole = (targetRole) => {
    const currentRank = roleHierarchy[userRole] || 0;
    const targetRank = roleHierarchy[targetRole] || 0;
    return currentRank > targetRank;
  };

  // Centralized fetch with auth and auto-logout on 401
  const fetchWithAuth = async (url, options = {}) => {
    const headers = {
      ...(options.headers || {}),
      Authorization: token ? `Bearer ${token}` : undefined,
    };
    const opts = { ...options, headers };
    const res = await fetch(url, opts);
    if (res.status === 401) {
      logout();
      navigate('/login');
      throw new Error('Session expired. Please log in again.');
    }
    return res;
  };

  return (
    <AuthContext.Provider value={{ 
      token, 
      login, 
      logout,
      userRole,
      isSuperAdmin,
      isAdmin,
      isModerator,
      canModifyRole,
      signup,
      authenticatedFetch,
      user,
      refreshUser,
      fetchWithAuth
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
