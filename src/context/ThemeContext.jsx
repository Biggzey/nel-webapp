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
  dark: false,
  toggleDark: () => {},
  chatThemes: defaultChatThemes,
  currentChatTheme: "default",
  setChatTheme: () => {},
});

export function ThemeProvider({ children }) {
  const { token } = useAuth();
  const [dark, setDark] = useState(() => {
    try {
      const saved = localStorage.getItem("dark");
      const isDark = saved === "true";
      return isDark;
    } catch {
      return false;
    }
  });

  // Initialize chat theme from API
  const [currentChatTheme, setCurrentChatTheme] = useState("default");

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

  // Toggle dark mode
  const toggleDark = () => {
    setDark(prevDark => {
      const newDark = !prevDark;
      localStorage.setItem("dark", String(newDark));
      return newDark;
    });
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
      } catch (error) {
        console.error("Error updating theme preference:", error);
        throw error;
      }
    }
  };

  // Effect to handle dark mode and theme changes
  useEffect(() => {
    try {
      const root = document.documentElement;
      
      if (dark) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }

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
  }, [dark, currentChatTheme]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      if (localStorage.getItem("dark") === null) {
        setDark(e.matches);
      }
    };
    
    mediaQuery.addListener?.(handleChange);
    return () => mediaQuery.removeListener?.(handleChange);
  }, []);

  return (
    <ThemeContext.Provider value={{ 
      dark, 
      toggleDark, 
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
