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
          light: "#DEE4E7",    // Light clean background
          dark: "#0f0f0f",     // Dark mode background
          secondary: {
            light: "#e6f3f7",   // Slightly darker pale cyan for secondary
            dark: "#2a2a2a"     // Dark mode elevated surfaces
          },
          container: {
            light: "#e2e8f0",   // Muted soft gray for light mode container background
            dark: "#1a1a1a",    // Dark mode container background
            hover: {
              light: "#f8fafc", // Light mode hover state
              dark: "#262626"   // Dark mode hover state
            }
          },
          gradient: {
            light: {
              start: "#f8fafc",
              mid: "#e2e8f0",
              end: "#f1f5f9"
            },
            dark: {
              start: "#0f0f0f",
              mid: "#1a1a1a",
              end: "#171717"
            }
          }
        },
        
        // Accent colors for patterns and decorations
        accent: {
          primary: {
            light: "rgba(123, 104, 238, 0.03)", // Very subtle primary
            dark: "rgba(123, 104, 238, 0.05)"   // Slightly more visible in dark
          },
          secondary: {
            light: "rgba(99, 102, 241, 0.03)",  // Indigo tint
            dark: "rgba(99, 102, 241, 0.05)"
          }
        },
        
        // Border colors for containers/cards
        container: {
          border: {
            light: "rgba(123, 104, 238, 0.2)",    // Primary color with opacity for light mode
            dark: "rgba(123, 104, 238, 0.3)"      // Slightly more opaque for dark mode
          },
          shadow: {
            light: "rgba(123, 104, 238, 0.1)",    // Primary color shadow for light mode
            dark: "rgba(123, 104, 238, 0.15)"     // Slightly stronger shadow for dark mode
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
