import React, { createContext, useState, useContext, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { useNavigate } from "react-router-dom";

const defaultCharacters = [
  {
    id: 1, // Use a numeric ID for PostgreSQL
    name: "Nelliel",
    personality: "Your custom AI companion.",
    avatar: "/nel-avatar.png",
    systemPrompt: "You are Nelliel, a helpful and friendly AI companion. You are knowledgeable, empathetic, and always eager to assist users with their questions and tasks.",
    customInstructions: "",
  },
];

const CharacterContext = createContext();

export function CharacterProvider({ children }) {
  const { token, logout, fetchWithAuth } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  
  // Load characters from database
  const [characters, setCharacters] = useState([...defaultCharacters]);
  const [selectedIndex, _setSelectedIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReloadingCharacters, setIsReloadingCharacters] = useState(false);

  // Load characters and preferences on mount
  useEffect(() => {
    if (!token) return;

    async function loadData() {
      try {
        setIsLoading(true);
        
        // Load characters
        const charsRes = await fetchWithAuth("/api/characters");

        if (charsRes.status === 429) {
          handleRateLimit();
          return;
        }
        if (charsRes.status === 401) {
          logout();
          navigate("/login", { replace: true });
          return;
        }

        let userChars = [];
        if (charsRes.ok) {
          userChars = await charsRes.json();
          // Sort so Nelliel is always first if she exists
          userChars.sort((a, b) => {
            if (a.name === 'Nelliel') return -1;
            if (b.name === 'Nelliel') return 1;
            return 0;
          });
          setCharacters(userChars);
        } else {
          // Show error and fallback to default character
          console.error("Failed to load characters, using default.");
          setCharacters([]);
        }

        // No longer auto-create Nelliel. If no characters, userChars will be empty.

        // Load preferences
        const prefsRes = await fetchWithAuth("/api/preferences");

        if (prefsRes.status === 429) {
          handleRateLimit();
          return;
        }
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

  function generateUniqueId() {
    return Date.now(); // PostgreSQL will handle the actual ID
  }

  async function handleNewCharacter() {
    try {
      const blank = {
        name: "New Character",
        personality: "",
        avatar: "/nel-avatar.png",
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

      if (res.status === 429) {
        handleRateLimit();
        return;
      }
      if (!res.ok) {
        throw new Error("Failed to create character");
      }

      const created = await res.json();
      setCharacters(prev => {
        if (prev.some(c => c.id === created.id)) return prev;
        return [...prev, created];
      });
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

      if (res.status === 429) {
        handleRateLimit();
        return;
      }
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

      const res = await fetch(`/api/characters/${charToDelete.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 429) {
        handleRateLimit();
        return;
      }
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

      if (res.status === 429) {
        handleRateLimit();
        return;
      }
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

  let reloadTimeout = null;
  let last429 = 0;
  async function reloadCharacters() {
    setIsReloadingCharacters(true);
    try {
      if (reloadCharacters._reloading) return;
      if (Date.now() - last429 < 2000) return; // 2s cooldown after 429
      reloadCharacters._reloading = true;
      if (reloadTimeout) {
        clearTimeout(reloadTimeout);
      }
      const res = await fetch("/api/characters", {
        headers: { Authorization: token ? `Bearer ${token}` : undefined },
      });
      if (res.status === 429) {
        handleRateLimit();
        last429 = Date.now();
        reloadCharacters._reloading = false;
        setIsReloadingCharacters(false);
        return;
      }
      if (res.ok) {
        const userChars = await res.json();
        // Sort so Nelliel is always first if she exists
        userChars.sort((a, b) => {
          if (a.name === 'Nelliel') return -1;
          if (b.name === 'Nelliel') return 1;
          return 0;
        });
        setCharacters(userChars);
      }
      reloadCharacters._reloading = false;
      setIsReloadingCharacters(false);
    } catch (err) {
      // Optionally handle error
      reloadCharacters._reloading = false;
      setIsReloadingCharacters(false);
    }
  }

  // Helper to show a toast or alert for 429 errors
  function handleRateLimit() {
    if (window && window.alert) {
      alert('You are being rate limited (429 Too Many Requests). Please wait and try again later.');
    }
  }

  // Reorder characters and persist to backend
  async function reorderCharacters(newOrder) {
    // newOrder: array of character objects in new order
    const orderedIds = newOrder.map(c => c.id);
    setCharacters(newOrder); // Optimistic update
    try {
      await fetch("/api/characters/order", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ orderedIds }),
      });
    } catch (error) {
      console.error("Error reordering characters:", error);
      // Optionally reload from backend if error
      reloadCharacters();
    }
  }

  // Add new functions for explore functionality
  async function addToCollection(characterId) {
    try {
      const res = await fetch(`/api/explore/characters/${characterId}/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to add character to collection');
      }

      const newCharacter = await res.json();
      setCharacters(prev => [...prev, newCharacter]);
      return newCharacter;
    } catch (error) {
      console.error('Error adding character to collection:', error);
      throw error;
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
        setSelectedIndex,
        setSelectedIndexRaw: _setSelectedIndex,
        handleNewCharacter,
        handleOpenModal,
        handleSaveCharacter,
        handleCloseModal,
        handleDeleteCharacter,
        resetCurrentCharacter,
        reloadCharacters,
        reorderCharacters,
        isLoading,
        isImporting,
        setIsImporting,
        isReloadingCharacters,
        setIsReloadingCharacters,
        addToCollection,
      }}
    >
      {children}
    </CharacterContext.Provider>
  );
}

export function useCharacter() {
  return useContext(CharacterContext);
}


