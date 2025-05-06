// src/context/ThemeContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";

// Define available chat themes
const defaultChatThemes = {
  default: {
    "--chat-user-bg": "#cfe3ff",
    "--chat-user-text": "#1a1a1a",
    "--chat-assistant-bg": "#f1f1f1",
    "--chat-assistant-text": "#1a1a1a",
  },
  ocean: {
    "--chat-user-bg": "#e3f2fd",
    "--chat-user-text": "#1a1a1a",
    "--chat-assistant-bg": "#bbdefb",
    "--chat-assistant-text": "#1a1a1a",
  },
  forest: {
    "--chat-user-bg": "#c8e6c9",
    "--chat-user-text": "#1a1a1a",
    "--chat-assistant-bg": "#dcedc8",
    "--chat-assistant-text": "#1a1a1a",
  },
  sunset: {
    "--chat-user-bg": "#ffccbc",
    "--chat-user-text": "#1a1a1a",
    "--chat-assistant-bg": "#ffe0b2",
    "--chat-assistant-text": "#1a1a1a",
  },
  lavender: {
    "--chat-user-bg": "#e1bee7",
    "--chat-user-text": "#1a1a1a",
    "--chat-assistant-bg": "#f3e5f5",
    "--chat-assistant-text": "#1a1a1a",
  },
};

const ThemeContext = createContext({
  dark: null, // null = system, true = dark, false = light
  setTheme: () => {},
  chatColor: "#7C3AED",
  setChatColor: () => {},
  chatThemes: defaultChatThemes,
  currentChatTheme: "default",
  setChatTheme: () => {},
});

export function ThemeProvider({ children }) {
  const { token } = useAuth();
  
  // Theme state: null = system, true = dark, false = light
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "system") return null;
    if (saved === "dark") return true;
    if (saved === "light") return false;
    return null; // Default to system
  });

  const [chatColor, setChatColor] = useState(() => {
    return localStorage.getItem("chatColor") || "#7C3AED";
  });

  // Initialize chat theme from API
  const [currentChatTheme, setCurrentChatTheme] = useState("default");
  const [useCustomColor, setUseCustomColor] = useState(() => {
    return localStorage.getItem("useCustomColor") === "true";
  });

  // Load user preferences on mount
  useEffect(() => {
    if (token) {
      fetch("/api/preferences", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
        .then(res => res.json())
        .then(data => {
          if (data.chatTheme) {
            setCurrentChatTheme(data.chatTheme);
          }
        })
        .catch(error => {
          console.error("Error loading theme preferences:", error);
        });
    }
  }, [token]);

  // Handle theme changes
  const setTheme = (theme) => {
    switch (theme) {
      case 'system':
        setDark(null);
        localStorage.setItem("theme", "system");
        break;
      case 'dark':
        setDark(true);
        localStorage.setItem("theme", "dark");
        break;
      case 'light':
        setDark(false);
        localStorage.setItem("theme", "light");
        break;
    }
  };

  // Set chat theme
  const setChatTheme = async (themeName) => {
    if (defaultChatThemes[themeName] && token) {
      try {
        console.log('Sending theme update request:', themeName);
        const res = await fetch("/api/preferences", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ chatTheme: themeName })
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          console.error('Theme update failed:', {
            status: res.status,
            statusText: res.statusText,
            error: errorData
          });
          throw new Error(errorData.error || 'Failed to update theme preference');
        }

        const data = await res.json();
        console.log('Theme update successful:', data);
        setCurrentChatTheme(themeName);
        setUseCustomColor(false);
        localStorage.setItem("useCustomColor", "false");
      } catch (error) {
        console.error("Error updating theme preference:", error);
        throw error;
      }
    }
  };

  // Effect to handle dark mode changes
  useEffect(() => {
    const root = document.documentElement;
    
    if (dark === null) {
      // System theme
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e) => {
        if (e.matches) {
          root.classList.add("dark");
        } else {
          root.classList.remove("dark");
        }
      };
      
      // Set initial value
      handleChange(mediaQuery);
      
      // Listen for changes
      mediaQuery.addListener?.(handleChange);
      return () => mediaQuery.removeListener?.(handleChange);
    } else {
      // Manual theme
      if (dark) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    }
  }, [dark]);

  // Effect to handle chat color changes
  useEffect(() => {
    const root = document.documentElement;
    if (useCustomColor) {
      root.style.setProperty('--chat-user-bg', chatColor);
      // Set text color based on background color brightness
      const r = parseInt(chatColor.slice(1, 3), 16);
      const g = parseInt(chatColor.slice(3, 5), 16);
      const b = parseInt(chatColor.slice(5, 7), 16);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      const textColor = brightness > 128 ? '#1a1a1a' : '#ffffff';
      root.style.setProperty('--chat-user-text', textColor);
    }
    localStorage.setItem("chatColor", chatColor);
  }, [chatColor, useCustomColor]);

  // Effect to handle theme changes
  useEffect(() => {
    if (!useCustomColor) {
      try {
        const root = document.documentElement;
        // Apply chat theme styles
        const themeStyles = defaultChatThemes[currentChatTheme];
        if (themeStyles) {
          // Set CSS variables for chat bubbles
          root.style.setProperty('--chat-user-bg', themeStyles['--chat-user-bg']);
          root.style.setProperty('--chat-user-text', themeStyles['--chat-user-text']);
          root.style.setProperty('--chat-assistant-bg', themeStyles['--chat-assistant-bg']);
          root.style.setProperty('--chat-assistant-text', themeStyles['--chat-assistant-text']);
        }
      } catch (error) {
        console.error("Error updating theme:", error);
      }
    }
  }, [dark, currentChatTheme, useCustomColor]);

  const handleSetChatColor = (color) => {
    setChatColor(color);
    setUseCustomColor(true);
    localStorage.setItem("useCustomColor", "true");
  };

  return (
    <ThemeContext.Provider value={{ 
      dark, 
      setTheme,
      chatColor,
      setChatColor: handleSetChatColor,
      chatThemes: defaultChatThemes,
      currentChatTheme,
      setChatTheme
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
