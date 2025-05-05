import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { token } = useAuth();
  // If there's no token, redirect to login
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  // Otherwise render the protected content
  return children;
}
