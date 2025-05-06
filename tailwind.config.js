// tailwind.config.js
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Base theme colors
        primary: "#7B68EE",
        
        // Background colors
        background: {
          light: "#2b2b2b",    // Soft blue-gray for comfortable viewing
          dark: "#0f0f0f",     // Dark mode background
          secondary: {
            light: "#e6f3f7",   // Slightly darker pale cyan for secondary
            dark: "#2a2a2a"     // Dark mode elevated surfaces
          }
        },
        
        // Text colors
        text: {
          light: "#ffffff",    // Keeping the same text color for good contrast
          dark: "#ffffff",      // Dark mode text
          secondary: {
            light: "#9ca3af",   // Keeping the same secondary text
            dark: "#9ca3af"     // Dark mode secondary text
          }
        },

        // Border colors
        border: {
          light: "#e2e8f0",    // Softer border color
          dark: "#374151"      // Dark mode borders
        },

        // Chat specific colors
        chat: {
          user: {
            bg: "var(--chat-user-bg)",
            text: "var(--chat-user-text)"
          },
          assistant: {
            bg: "var(--chat-assistant-bg)",
            text: "var(--chat-assistant-text)"
          }
        }
      },
      backgroundColor: {
        'chat-user': 'var(--chat-user-bg)',
        'chat-assistant': 'var(--chat-assistant-bg)',
      },
      textColor: {
        'chat-user': 'var(--chat-user-text)',
        'chat-assistant': 'var(--chat-assistant-text)',
      },
      keyframes: {
        bounce: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        'fade-in-up': {
          '0%': {
            opacity: '0',
            transform: 'translateY(10px)'
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)'
          },
        }
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.3s ease-out'
      }
    },
  },
  plugins: [],
};
