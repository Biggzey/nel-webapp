import React, { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// In development, use the proxy. In production, this will be replaced with the actual API URL
const API_BASE_URL = "";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const navigate = useNavigate();

  // Initialize token from localStorage (or null)
  const [token, setToken] = useState(() => {
    return localStorage.getItem("token");
  });

  // Initialize user role from localStorage (or null)
  const [userRole, setUserRole] = useState(null);

  // Whenever token changes, persist or remove it in localStorage
  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);

      // Fetch user role when token changes
      fetch(`${API_BASE_URL}/api/user/role`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      .then(res => res.json())
      .then(data => {
        setUserRole(data.role);
      })
      .catch(err => {
        console.error('Error fetching user role:', err);
      });
    } else {
      localStorage.removeItem("token");
      setUserRole(null);
    }
  }, [token]);

  // Call this to sign up. Throws on error.
  async function signup(email, username, password, confirmPassword) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/signup`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Origin": window.location.origin
        },
        credentials: 'include',
        mode: 'cors',
        body: JSON.stringify({ email, username, password, confirmPassword }),
      });

      if (response.status === 429) {
        throw new Error("Too many attempts. Please wait a moment before trying again.");
      }

      // Handle CORS errors
      if (response.type === 'opaque' || response.status === 0) {
        throw new Error("Unable to connect to the server. This might be a CORS issue.");
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return true; // Signup successful
    } catch (error) {
      console.error('Signup error:', error);
      if (error.message === 'Failed to fetch') {
        throw new Error('Unable to connect to the server. Please check if the backend is running.');
      }
      throw error;
    }
  }

  // Call this to log in. Throws on error.
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
    setUserRole(null);
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
      signup
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
