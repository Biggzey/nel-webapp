import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";

export default function Login() {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nav = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    
    // Validate fields
    if (!identifier || !password) {
      setErr("Email/username and password are required");
      return;
    }

    if (isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);
      await login(identifier, password);
      nav("/");
    } catch (error) {
      setErr(error.message || "Login failed");
      // Add a delay before allowing another attempt
      await new Promise(resolve => setTimeout(resolve, 2000));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0f0f0f]">
      <div className="w-full max-w-md p-8">
        <form
          onSubmit={handleSubmit}
          className="bg-[#2b2b2b] p-8 rounded-lg shadow-xl w-full"
        >
          <h1 className="text-2xl font-semibold mb-6 text-center text-white">
            Log In
          </h1>
          {err && (
            <div className="mb-4 text-red-500 text-sm text-center">{err}</div>
          )}
          <div className="mb-4">
            <label className="block mb-2 text-white">
              Email or Username
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="mt-1 w-full p-2 border rounded bg-[#1e1e1e] text-white border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Enter email or username"
                required
              />
            </label>
          </div>
          <div className="mb-6">
            <label className="block mb-2 text-white">
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full p-2 border rounded bg-[#1e1e1e] text-white border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Enter password"
                required
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full bg-primary text-white py-2 rounded transition ${
              isSubmitting 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:bg-primary/90'
            }`}
          >
            {isSubmitting ? 'Logging in...' : 'Log In'}
          </button>
          <p className="mt-4 text-center text-gray-400 text-sm">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="text-green-400 hover:underline"
            >
              Sign Up
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
