import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import ThemePicker from "./ThemePicker";
import Toast from "./Toast";

export default function ProfileModal({ isOpen, onClose }) {
  const { token } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [toast, setToast] = useState(null);

  // Load current user data
  useEffect(() => {
    if (!isOpen) return;
    
    fetch("/api/user", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setEmail(data.email);
        setNewEmail(data.email);
        setUsername(data.username);
      });
  }, [token, isOpen]);

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} data-testid="modal-backdrop" />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl rounded-lg bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark p-6 shadow-lg overflow-y-auto max-h-[90vh] border border-border-light dark:border-border-dark">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">Settings</h1>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <i className="fas fa-times" />
          </button>
        </div>

        {/* Username display */}
        <div className="mb-8">
          <h2 className="text-xl mb-2">Username</h2>
          <p className="text-text-secondary-light dark:text-text-secondary-dark">{username}</p>
        </div>

        {/* Chat theme picker */}
        <div className="mb-8">
          <h2 className="text-xl mb-4">Chat Theme</h2>
          <ThemePicker />
        </div>

        {/* Email update form */}
        <form onSubmit={handleEmailUpdate} className="mb-8">
          <h2 className="text-xl mb-4">Email</h2>
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
        <form onSubmit={handlePasswordChange}>
          <h2 className="text-xl mb-4">Change Password</h2>
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
    </div>
  );
} 