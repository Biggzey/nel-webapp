// src/components/ThemePicker.jsx
import React, { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import Toast from "./Toast";

export default function ThemePicker() {
  const { chatThemes, currentChatTheme, setChatTheme } = useTheme();
  const [toast, setToast] = useState(null);

  if (!chatThemes || typeof chatThemes !== "object") {
    return (
      <div className="mb-6 text-sm text-red-500">
        ⚠️ Theme options not available.
      </div>
    );
  }

  const handleThemeChange = async (themeName) => {
    try {
      await setChatTheme(themeName);
      setToast({
        message: `Chat theme updated to ${themeName.charAt(0).toUpperCase() + themeName.slice(1)}!`,
        type: "success",
        duration: 3000
      });
    } catch (error) {
      setToast({
        message: error.message || "Failed to update theme",
        type: "error",
        duration: 5000
      });
    }
  };

  return (
    <div className="mb-6">
      <h2 className="text-lg mb-2 text-gray-800 dark:text-gray-200">
        Chat Theme
      </h2>
      <div className="flex space-x-2">
        {Object.entries(chatThemes).map(([name, vars]) => (
          <button
            key={name}
            onClick={() => handleThemeChange(name)}
            className={`w-8 h-8 rounded-full border-2 transition ${
              currentChatTheme === name ? "border-primary" : "border-gray-300 dark:border-gray-600"
            }`}
            style={{ backgroundColor: vars?.["--chat-user-bg"] || "#ccc" }}
            title={name.charAt(0).toUpperCase() + name.slice(1)}
          />
        ))}
      </div>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
        Click a color to change your chat theme
      </p>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
