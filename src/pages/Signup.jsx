import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { isPasswordValid } from '../utils/validation';

export default function Signup() {
  const { signup } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    password: "",
    confirmPassword: ""
  });
  const [validationErrors, setValidationErrors] = useState({
    password: "",
    confirmPassword: ""
  });
  const [err, setErr] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nav = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Real-time validation
  useEffect(() => {
    // Password strength validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (formData.password && !passwordRegex.test(formData.password)) {
      setValidationErrors(prev => ({
        ...prev,
        password: "Password must be at least 8 characters with one uppercase, one lowercase, and one number"
      }));
    } else {
      setValidationErrors(prev => ({ ...prev, password: "" }));
    }

    // Password matching validation
    if (formData.confirmPassword && formData.password !== formData.confirmPassword) {
      setValidationErrors(prev => ({
        ...prev,
        confirmPassword: "Passwords do not match"
      }));
    } else {
      setValidationErrors(prev => ({ ...prev, confirmPassword: "" }));
    }
  }, [formData.password, formData.confirmPassword]);

  async function handleSignup(e) {
    e.preventDefault();
    setErr("");

    if (isSubmitting) {
      return;
    }

    // Validate all fields are filled
    const emptyFields = Object.entries(formData).filter(([_, value]) => !value);
    if (emptyFields.length > 0) {
      console.log('Empty fields:', emptyFields.map(([field]) => field));
      setErr("All fields are required");
      return;
    }

    // Validate username
    if (formData.username.length < 3 || !/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      setErr("Username must be at least 3 characters and contain only letters, numbers, and underscores");
      return;
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setErr("Please enter a valid email address");
      return;
    }

    // Validate password
    if (!isPasswordValid(formData.password)) {
      setErr("Password must be at least 8 characters with one uppercase, one lowercase, and one number");
      return;
    }

    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      setErr("Passwords do not match");
      return;
    }

    try {
      setIsSubmitting(true);
      console.log('Submitting signup form:', { 
        email: formData.email, 
        username: formData.username,
        hasPassword: !!formData.password,
        hasConfirmPassword: !!formData.confirmPassword
      });

      await signup(
        formData.email,
        formData.username,
        formData.password,
        formData.confirmPassword
      );

      // Clear form data
      setFormData({
        email: "",
        username: "",
        password: "",
        confirmPassword: ""
      });

      // Show verification message instead of navigating to login
      setErr("Account created! Please check your email for a verification link.");
      // nav("/login");
    } catch (error) {
      console.error('Signup error:', error);
      setErr(error.message || "Failed to create account");
      // Add a delay before allowing another attempt
      await new Promise(resolve => setTimeout(resolve, 2000));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0f0f0f]">
      <div className="w-full max-w-md p-8">
        <form
          onSubmit={handleSignup}
          className="bg-[#2b2b2b] p-8 rounded-lg shadow-xl w-full"
        >
          <h1 className="text-2xl font-semibold mb-6 text-center text-white">
            Sign Up
          </h1>
          {err && <div className="mb-4 text-red-500 text-sm text-center">{err}</div>}

          {/* Username field */}
          <div className="mb-4">
            <label className="block mb-2 text-white">
              Username
              <input
                id="signup-username"
                name="username"
                type="text"
                autoComplete="username"
                placeholder="Choose a username"
                value={formData.username}
                onChange={handleChange}
                className="mt-1 w-full p-2 border rounded bg-[#1e1e1e] text-white border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
              <p className="mt-1 text-xs text-gray-400">
                At least 3 characters, letters, numbers, and underscores only
              </p>
            </label>
          </div>

          {/* Email field */}
          <div className="mb-4">
            <label className="block mb-2 text-white">
              Email
              <input
                id="signup-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                className="mt-1 w-full p-2 border rounded bg-[#1e1e1e] text-white border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </label>
          </div>

          {/* Password fields */}
          <div className="mb-4">
            <label className="block mb-2 text-white">
              Password
              <input
                id="signup-password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="Create a password"
                value={formData.password}
                onChange={handleChange}
                className={`mt-1 w-full p-2 border rounded bg-[#1e1e1e] text-white border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary ${
                  formData.password && !isPasswordValid(formData.password)
                    ? "border-red-500"
                    : ""
                }`}
                required
              />
              <p className="mt-1 text-xs text-gray-400">
                At least 8 characters, one uppercase, one lowercase, and one number
              </p>
            </label>
          </div>

          <div className="mb-6">
            <label className="block mb-2 text-white">
              Confirm Password
              <input
                type="password"
                id="signup-confirm"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`mt-1 w-full p-2 border rounded bg-[#1e1e1e] text-white border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary ${
                  formData.confirmPassword && formData.password !== formData.confirmPassword
                    ? "border-red-500"
                    : ""
                }`}
                placeholder="Confirm your password"
                required
                autoComplete="new-password"
              />
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="mt-1 text-sm text-red-500">Passwords do not match</p>
              )}
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
            {isSubmitting ? 'Creating Account...' : 'Create Account'}
          </button>

          <p className="mt-4 text-center text-gray-400 text-sm">
            Already have an account?{" "}
            <Link to="/login" className="text-green-400 hover:underline">
              Log In
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
