// src/pages/Profile.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import ThemePicker from "../components/ThemePicker";

export default function Profile() {
  const { token, fetchWithAuth } = useAuth();
  const nav = useNavigate();
  const { t } = useLanguage();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");

  // Load current user data
  useEffect(() => {
    fetchWithAuth("/api/user")
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
      const res = await fetchWithAuth("/api/user", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: newEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('errors.serverError'));
      setEmail(data.email);
      addToast({ message: t('profile.emailUpdated'), type: "success" });
    } catch (error) {
      addToast({ message: error.message, type: "error" });
    }
  }

  async function handlePasswordChange(e) {
    e.preventDefault();
    try {
      const res = await fetchWithAuth("/api/user/password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          oldPassword: oldPwd, 
          newPassword: newPwd,
          confirmPassword: confirmPwd 
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('errors.serverError'));
      setOldPwd("");
      setNewPwd("");
      setConfirmPwd("");
      addToast({ message: t('profile.passwordChanged'), type: "success" });
    } catch (error) {
      addToast({ message: error.message, type: "error" });
    }
  }

  return (
    <div className="p-8 bg-background-light dark:bg-background-dark flex-1 overflow-y-auto">
      <button
        onClick={() => nav("/")}
        className="mb-4 text-text-secondary-light dark:text-text-secondary-dark hover:underline"
      >
        ← {t('common.goBack')}
      </button>

      <h1 className="text-2xl mb-6 text-text-light dark:text-text-dark">
        {t('profile.title')}
      </h1>

      {/* Username display */}
      <div className="mb-8 max-w-md">
        <h2 className="text-xl text-text-light dark:text-text-dark">{t('common.username')}</h2>
        <p className="mt-2 text-text-secondary-light dark:text-text-secondary-dark">{username}</p>
      </div>

      {/* Chat theme picker */}
      <ThemePicker />

      {/* Email update form */}
      <form onSubmit={handleEmailUpdate} className="mb-8 max-w-md">
        <h2 className="text-xl mb-4 text-text-light dark:text-text-dark">{t('common.email')}</h2>
        <div className="space-y-4">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="w-full p-2 border rounded bg-background-light dark:bg-background-dark border-border-light dark:border-border-dark text-text-light dark:text-text-dark"
            placeholder={t('profile.newEmail')}
          />
          <button
            type="submit"
            className="w-full px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition"
          >
            {t('profile.updateEmail')}
          </button>
        </div>
      </form>

      {/* Password change form */}
      <form onSubmit={handlePasswordChange} className="max-w-md">
        <h2 className="text-xl mb-4 text-text-light dark:text-text-dark">{t('profile.changePassword')}</h2>
        <div className="space-y-4">
          <input
            type="password"
            value={oldPwd}
            onChange={(e) => setOldPwd(e.target.value)}
            className="w-full p-2 border rounded bg-background-light dark:bg-background-dark border-border-light dark:border-border-dark text-text-light dark:text-text-dark"
            placeholder={t('profile.currentPassword')}
          />
          <input
            type="password"
            value={newPwd}
            onChange={(e) => setNewPwd(e.target.value)}
            className="w-full p-2 border rounded bg-background-light dark:bg-background-dark border-border-light dark:border-border-dark text-text-light dark:text-text-dark"
            placeholder={t('profile.newPassword')}
          />
          <input
            type="password"
            value={confirmPwd}
            onChange={(e) => setConfirmPwd(e.target.value)}
            className="w-full p-2 border rounded bg-background-light dark:bg-background-dark border-border-light dark:border-border-dark text-text-light dark:text-text-dark"
            placeholder={t('profile.confirmPassword')}
          />
          <button
            type="submit"
            className="w-full px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition"
          >
            {t('profile.changePassword')}
          </button>
        </div>
      </form>
    </div>
  );
}
