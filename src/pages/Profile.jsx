// src/pages/Profile.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import ThemePicker from "../components/ThemePicker";
import Toast from "../components/Toast";

export default function Profile() {
  const { token } = useAuth();
  const nav = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [toast, setToast] = useState(null);

  // Load current user data
  useEffect(() => {
    fetch("/api/user", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setEmail(data.email);
        setNewEmail(data.email);
        setUsername(data.username);
      });
  }, [token]);

  async function handleEmailUpdate(e) {
    e.preventDefault();
    try {
      const res = await fetch("/api/user", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: newEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEmail(data.email);
      setToast({ message: "Email updated successfully!", type: "success" });
    } catch (error) {
      setToast({ message: error.message, type: "error" });
    }
  }

  async function handlePasswordChange(e) {
    e.preventDefault();
    try {
      const res = await fetch("/api/user/password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          oldPassword: oldPwd, 
          newPassword: newPwd,
          confirmPassword: confirmPwd 
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOldPwd("");
      setNewPwd("");
      setConfirmPwd("");
      setToast({ message: "Password changed successfully!", type: "success" });
    } catch (error) {
      setToast({ message: error.message, type: "error" });
    }
  }

  return (
    <div className="p-8 bg-background-light dark:bg-background-dark flex-1 overflow-y-auto">
      <button
        onClick={() => nav("/")}
        className="mb-4 text-text-secondary-light dark:text-text-secondary-dark hover:underline"
      >
        ← Back to Chats
      </button>

      <h1 className="text-2xl mb-6 text-text-light dark:text-text-dark">
        Your Profile
      </h1>

      {/* Username display */}
      <div className="mb-8 max-w-md">
        <h2 className="text-xl text-text-light dark:text-text-dark">Username</h2>
        <p className="mt-2 text-text-secondary-light dark:text-text-secondary-dark">{username}</p>
      </div>

      {/* Chat theme picker */}
      <ThemePicker />

      {/* Email update form */}
      <form onSubmit={handleEmailUpdate} className="mb-8 max-w-md">
        <h2 className="text-xl mb-4 text-text-light dark:text-text-dark">Email</h2>
        <div className="space-y-4">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="w-full p-2 border rounded bg-background-light dark:bg-background-dark border-border-light dark:border-border-dark text-text-light dark:text-text-dark"
            placeholder="New email address"
          />
          <button
            type="submit"
            className="w-full px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition"
          >
            Update Email
          </button>
        </div>
      </form>

      {/* Password change form */}
      <form onSubmit={handlePasswordChange} className="max-w-md">
        <h2 className="text-xl mb-4 text-text-light dark:text-text-dark">Change Password</h2>
        <div className="space-y-4">
          <input
            type="password"
            value={oldPwd}
            onChange={(e) => setOldPwd(e.target.value)}
            className="w-full p-2 border rounded bg-background-light dark:bg-background-dark border-border-light dark:border-border-dark text-text-light dark:text-text-dark"
            placeholder="Current password"
          />
          <input
            type="password"
            value={newPwd}
            onChange={(e) => setNewPwd(e.target.value)}
            className="w-full p-2 border rounded bg-background-light dark:bg-background-dark border-border-light dark:border-border-dark text-text-light dark:text-text-dark"
            placeholder="New password"
          />
          <input
            type="password"
            value={confirmPwd}
            onChange={(e) => setConfirmPwd(e.target.value)}
            className="w-full p-2 border rounded bg-background-light dark:bg-background-dark border-border-light dark:border-border-dark text-text-light dark:text-text-dark"
            placeholder="Confirm new password"
          />
          <button
            type="submit"
            className="w-full px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition"
          >
            Change Password
          </button>
        </div>
      </form>

      {/* Toast notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
