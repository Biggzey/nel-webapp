import React, { createContext, useState, useContext, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { useNavigate } from "react-router-dom";

const defaultCharacters = [
  {
    id: 1, // Use a numeric ID for PostgreSQL
    name: "Nelliel",
    personality: "Your custom AI companion.",
    avatar: "/nel-avatar.png",
    bookmarked: false,
    systemPrompt: "You are Nelliel, a helpful and friendly AI companion. You are knowledgeable, empathetic, and always eager to assist users with their questions and tasks.",
    customInstructions: "",
  },
];

const CharacterContext = createContext();

export function CharacterProvider({ children }) {
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  
  // Load characters from database
  const [characters, setCharacters] = useState([...defaultCharacters]);
  const [selectedIndex, _setSelectedIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Load characters and preferences on mount
  useEffect(() => {
    if (!token) return;

    async function loadData() {
      try {
        setIsLoading(true);
        
        // Load characters
        const charsRes = await fetch("/api/characters", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (charsRes.status === 401) {
          logout();
          navigate("/login", { replace: true });
          return;
        }

        let userChars = [];
        if (charsRes.ok) {
          userChars = await charsRes.json();
        } else {
          // Show error and fallback to default character
          console.error("Failed to load characters, using default.");
        }

        // Find user's Nelliel instance
        let nelliel = userChars.find(c => c.name === "Nelliel");
        
        // If Nelliel doesn't exist for this user, create it
        if (!nelliel) {
          try {
            const createRes = await fetch("/api/characters", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                name: "Nelliel",
                personality: "Your custom AI companion.",
                avatar: "/nel-avatar.png",
                bookmarked: false,
                systemPrompt: "You are Nelliel, a helpful and friendly AI companion. You are knowledgeable, empathetic, and always eager to assist users with their questions and tasks.",
                customInstructions: "",
                status: "Ready to chat"
              }),
            });

            if (createRes.ok) {
              const defaultChar = await createRes.json();
              userChars.unshift(defaultChar);
            } else {
              // If creation fails, fallback to local default
              userChars.unshift({ ...defaultCharacters[0] });
            }
          } catch (error) {
            userChars.unshift({ ...defaultCharacters[0] });
          }
        }
        if (!userChars.length) {
          userChars = [{ ...defaultCharacters[0] }];
        }
        setCharacters(userChars);

        // Load preferences
        const prefsRes = await fetch("/api/preferences", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!prefsRes.ok) {
          throw new Error("Failed to load preferences");
        }

        const prefs = await prefsRes.json();
        if (prefs?.selectedCharId) {
          const idx = userChars.findIndex(c => c.id === prefs.selectedCharId);
          if (idx !== -1) {
            _setSelectedIndex(idx);
          }
        } else {
          // If no preference is set, default to Nelliel (first character)
          _setSelectedIndex(0);
        }
      } catch (error) {
        console.error("Error loading character data:", error);
        // Ensure we have at least Nelliel even if everything fails
        setCharacters([]);
        _setSelectedIndex(0);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [token, logout, navigate]);

  // Update selected character in preferences
  async function setSelectedIndex(i) {
    try {
      _setSelectedIndex(i);
      
      const charId = characters[i]?.id;
      if (!charId) return;

      await fetch("/api/preferences", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ selectedCharId: charId }),
      });
    } catch (error) {
      console.error("Error saving selected character:", error);
    }
  }

  const current = characters[selectedIndex];

  // Which ones are bookmarked
  const bookmarks = characters
    .map((c, i) => (c.bookmarked ? i : null))
    .filter((i) => i !== null);

  function generateUniqueId() {
    return Date.now(); // PostgreSQL will handle the actual ID
  }

  async function handleNewCharacter() {
    try {
      const blank = {
        name: "New Character",
        personality: "",
        avatar: "/nel-avatar.png",
        bookmarked: false,
        systemPrompt: "",
        customInstructions: "",
      };

      const res = await fetch("/api/characters", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(blank),
      });

      if (!res.ok) {
        throw new Error("Failed to create character");
      }

      const created = await res.json();
      setCharacters(prev => [...prev, created]);
      _setSelectedIndex(characters.length);
      setIsModalOpen(true);
    } catch (error) {
      console.error("Error creating character:", error);
    }
  }

  async function handleSaveCharacter(updated) {
    try {
      const res = await fetch(`/api/characters/${current.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updated),
      });

      if (!res.ok) {
        throw new Error("Failed to update character");
      }

      const saved = await res.json();
      setCharacters(prev =>
        prev.map((c, i) => (i === selectedIndex ? saved : c))
      );
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error saving character:", error);
    }
  }

  async function handleCloseModal() {
    // If cancel on brand-new blank, delete it
    const lastIdx = characters.length - 1;
    const last = characters[lastIdx];
    const isBlank =
      selectedIndex === lastIdx &&
      last.name === "New Character" &&
      last.personality === "" &&
      last.avatar === "/nel-avatar.png";

    if (isBlank) {
      try {
        await fetch(`/api/characters/${last.id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setCharacters(prev => prev.slice(0, -1));
        _setSelectedIndex(prev => Math.max(prev - 1, 0));
      } catch (error) {
        console.error("Error deleting character:", error);
      }
    }
    setIsModalOpen(false);
  }

  function handleOpenModal() {
    setIsModalOpen(true);
  }

  async function handleDeleteCharacter(idx) {
    try {
      const charToDelete = characters[idx];
      
      // Prevent deleting Nelliel
      if (charToDelete.name === defaultCharacters[0].name) {
        console.warn("Cannot delete the default character Nelliel");
        return;
      }

      const res = await fetch(`/api/characters/${charToDelete.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to delete character");
      }

      setCharacters(prev => prev.filter((_, i) => i !== idx));
      
      // If we deleted the selected character, switch to Nelliel
      if (idx === selectedIndex) {
        setSelectedIndex(0);
      } else if (idx < selectedIndex) {
        // Adjust selected index if we deleted a character before it
        setSelectedIndex(selectedIndex - 1);
      }
    } catch (error) {
      console.error("Error deleting character:", error);
    }
  }

  async function resetCurrentCharacter() {
    if (!current) return;
    
    try {
      const defaultChar = defaultCharacters.find(d => d.name === current.name);
      if (!defaultChar) return;

      const res = await fetch(`/api/characters/${current.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(defaultChar),
      });

      if (!res.ok) {
        throw new Error("Failed to reset character");
      }

      const reset = await res.json();
      setCharacters(prev =>
        prev.map(c => (c.id === current.id ? reset : c))
      );
    } catch (error) {
      console.error("Error resetting character:", error);
    }
  }

  async function toggleBookmark(idx = selectedIndex) {
    try {
      const char = characters[idx];
      const res = await fetch(`/api/characters/${char.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...char,
          bookmarked: !char.bookmarked
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to update bookmark");
      }

      const updated = await res.json();
      setCharacters(prev =>
        prev.map((c, i) => (i === idx ? updated : c))
      );
    } catch (error) {
      console.error("Error toggling bookmark:", error);
    }
  }

  async function reloadCharacters() {
    try {
      const res = await fetch("/api/characters", {
        headers: { Authorization: token ? `Bearer ${token}` : undefined },
      });
      if (res.ok) {
        const userChars = await res.json();
        setCharacters(userChars);
      }
    } catch (err) {
      // Optionally handle error
    }
  }

  if (isLoading) {
    return <div>Loading characters...</div>;
  }

  return (
    <CharacterContext.Provider
      value={{
        characters,
        selectedIndex,
        current,
        isModalOpen,
        bookmarks,
        setSelectedIndex,
        setSelectedIndexRaw: _setSelectedIndex,
        handleNewCharacter,
        handleOpenModal,
        handleSaveCharacter,
        handleCloseModal,
        handleDeleteCharacter,
        resetCurrentCharacter,
        toggleBookmark,
        reloadCharacters,
      }}
    >
      {children}
    </CharacterContext.Provider>
  );
}

export function useCharacter() {
  return useContext(CharacterContext);
}


