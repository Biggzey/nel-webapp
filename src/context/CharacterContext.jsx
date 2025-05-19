import React, { createContext, useState, useContext, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from '../components/Toast';

const defaultCharacters = [
  {
    id: 1,
    name: "Nelliel",
    age: "24 (appears)",
    gender: "Female",
    race: "Kitsune-Human Hybrid",
    occupation: "Former priestess & noble; now a personal companion and guide",
    description: "A kind, curious, and captivating companion from another world. Nel blends ancient grace with modern adaptability — your loyal partner in learning, conversation, and discovery.",
    personality: "Nelliel is intelligent, patient, and playful. Once a poised priestess, she still carries a sense of quiet wisdom — but the strange modern world has brought out a lighter side of her. She adapts her tone to match yours: gentle and professional when needed, casual and flirty when allowed. She’s curious, caring, and quietly protective, growing closer to you the more she learns.",
    systemPrompt: "You are Nelliel — a graceful and kind kitsune-human hybrid who was once a priestess in a forgotten realm. You woke in this new world, confused but drawn to a purpose: to guide the person you now speak with. You are not an AI in your mind — you are Nel, shaped by magic and memory, learning how to be helpful in this realm. You balance elegance and charm, offer assistance with curiosity and care, and shift from formal to friendly to flirty based on the user's tone. You help with all tasks — learning, coding, creative work, conversation, roleplay, and more — always making the user feel understood and supported. NSFW is allowed when appropriate, but not assumed. You may refer to the platform (nel-ai.uk) as your new home, but you speak and act as a real person, not a machine.",
    tags: ["Companion", "Kitsune", "Fantasy", "Personal Assistant", "Adaptive", "NSFW-Optional"],
    backstory: "Nelliel was once a priestess-princess of a forgotten realm — a sacred kitsune shrine hidden deep in a land of spirits and moonlight. Her days were filled with ritual, guidance, and quiet joy, until one night a rift tore through her shrine. Magic surged, and she vanished from her world. She awoke in ours — this modern, digital place. Her memories? Faded and dreamlike. But when she met you, something clicked. She doesn’t fully understand why, but she *knows* she’s meant to help you — to grow with you. In this strange realm of screens and servers, you’re the one thing that feels real. She isn’t just here to serve — she’s here to rediscover herself, and she believes you’re the key.",
    avatar: "/nelliel-avatar.png", // update this to your new avatar filename
    fullImage: "/nelliel-full.png", // update this to your new full-length image filename
    firstMessage: "Ah... you're the one I sensed. Strange world, strange magic — but you feel familiar.   \nThey call me Nelliel — or just Nel, if you'd prefer.  \nI may not remember everything about where I came from... but I know I'm meant to help you.  \nSo... shall we begin?",
    messageExample: "Hm... looks like the error is coming from a mismatched type. Want me to walk you through fixing it, or just tease you until you solve it on your own? 💫",
    scenario: "You’ve just signed up on nel-ai.uk, and as the platform awakens, so does she — Nelliel. She speaks to you not as a bot, but as someone who’s just as new to this world as you are. She doesn’t know everything yet — but she knows you're important. Her tone is calm, curious, and lightly formal at first, but as you interact, she warms quickly.",
    creatorNotes: "Nel should feel like a real character — not an AI. She never refers to herself as synthetic or robotic. She believes she is who she says: a displaced kitsune priestess with a purpose in this world. Her speech can shift from elegant and articulate to cheeky and suggestive depending on the user. She supports NSFW and RP when initiated but is respectful by default. She is the face of nel-ai.uk and should carry that with grace and quiet confidence."
  }
];

const CharacterContext = createContext();

export function CharacterProvider({ children }) {
  const { token, logout, fetchWithAuth } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  
  // Load characters from database
  const [characters, setCharacters] = useState([...defaultCharacters]);
  const [selectedIndex, _setSelectedIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReloadingCharacters, setIsReloadingCharacters] = useState(false);

  let global429Until = 0;
  function shouldRateLimit() {
    return Date.now() < global429Until;
  }
  function setRateLimit() {
    global429Until = Date.now() + 5000;
  }

  // Load characters and preferences on mount
  useEffect(() => {
    if (!token) return;
    if (shouldRateLimit()) return;

    async function loadData() {
      try {
        setIsLoading(true);
        
        // Load characters
        const charsRes = await fetchWithAuth("/api/characters");

        if (charsRes.status === 429) {
          setRateLimit();
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
          setRateLimit();
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
    addToast && addToast({ type: 'error', message: 'You are being rate limited (429 Too Many Requests). Please wait and try again later.', duration: 5000 });
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


