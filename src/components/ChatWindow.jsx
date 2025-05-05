// src/components/ChatWindow.jsx
import React, { useState, useRef, useEffect } from "react";
import { useCharacter } from "../context/CharacterContext";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import ReactionPicker from "./ReactionPicker";
import TypingIndicator from "./TypingIndicator";
import Toast from "./Toast";

export default function ChatWindow({ onMenuClick }) {
  const { current } = useCharacter();
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const model = import.meta.env.VITE_OPENAI_MODEL || "gpt-3.5-turbo";

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [editingIndex, setEditingIndex] = useState(null);
  const [editText, setEditText] = useState("");
  const [pickerIndex, setPickerIndex] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Add isTyping state
  const [isTyping, setIsTyping] = useState(false);

  // Add toast state
  const [toast, setToast] = useState(null);

  // Load chat history when character changes
  useEffect(() => {
    if (!current?.id) return;
    
    async function loadMessages() {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/chat/${current.id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (res.status === 401) {
          logout();
          navigate("/login", { replace: true });
          return;
        }

        if (!res.ok) {
          throw new Error("Failed to load chat history");
        }

        const data = await res.json();
        setMessages(data);
    } catch (error) {
      console.error("Error loading chat history:", error);
      setToast({
        type: 'error',
        message: 'Failed to load chat history. Some messages might be missing.',
        duration: 5000
      });
      setMessages([]);
      } finally {
        setIsLoading(false);
      }
    }

    loadMessages();
  }, [current?.id, token, logout, navigate]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function clearChat() {
    if (
      window.confirm(
        "Are you sure you want to clear this conversation? This cannot be undone."
      )
    ) {
      try {
        fetch(`/api/chat/${current.id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }).then((res) => {
          if (res.ok) {
        setMessages([]);
        setToast({
          type: 'success',
          message: 'Chat history cleared successfully',
          duration: 3000
            });
          } else {
            throw new Error("Failed to clear chat history");
          }
        });
      } catch (error) {
        console.error("Error clearing chat:", error);
        setToast({
          type: 'error',
          message: 'Failed to clear chat history. Please try again.',
          duration: 5000
        });
      }
    }
  }

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed) return;
    
    // Check if we have a valid character ID
    if (!current?.id) {
      setToast({
        type: 'error',
        message: 'No character selected. Please select a character first.',
        duration: 5000
      });
      return;
    }
    
    // Validate input length
    if (trimmed.length > 2000) {
      setToast({
        type: 'warning',
        message: 'Message is too long. Please keep it under 2000 characters.',
        duration: 5000
      });
      return;
    }

    // Create user message
    const userMsg = { 
      role: "user", 
      content: trimmed, 
      reactions: {} 
    };
    
    try {
      console.log('Sending message:', { characterId: current.id, message: userMsg });
      
      // Save user message to database
      const msgRes = await fetch(`/api/chat/${current.id}/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(userMsg)
      });

      if (!msgRes.ok) {
        const errorData = await msgRes.json().catch(() => ({}));
        console.error('Message save error:', errorData);
        throw new Error(errorData.error || "Failed to save user message");
      }

      const savedMsg = await msgRes.json();
      setMessages(prev => [...prev, savedMsg]);
      setInput("");
      autoResize();
      setIsTyping(true);

      // Get AI response
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          model, 
          messages: [...messages, userMsg],
          character: {
            id: current.id,
            systemPrompt: current.systemPrompt,
            customInstructions: current.customInstructions,
            personality: current.personality,
            backstory: current.backstory
          }
        }),
      });

      if (res.status === 401) {
        logout();
        navigate("/login", { replace: true });
        return;
      }

      if (!res.ok) {
        const errorData = await res.text();
        throw new Error(errorData || 'Failed to get response from the server');
      }

      const data = await res.json();

      // Add a small delay before showing the response
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

      // Load latest messages to ensure we have the saved assistant response
      const updatedMsgs = await fetch(`/api/chat/${current.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }).then(res => res.json());
      
      setMessages(updatedMsgs);
    } catch (err) {
      console.error("Chat error:", err);
      setToast({
        type: 'error',
        message: 'Failed to send message. Please try again.',
        duration: 5000
      });
    } finally {
      setIsTyping(false);
    }
  }

  async function handleEditSave(idx) {
    const messageId = messages[idx].id;
    try {
      const res = await fetch(`/api/chat/message/${messageId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          content: editText,
          reactions: messages[idx].reactions 
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to update message");
      }

      const updated = await res.json();
      setMessages(prev => prev.map((m, i) => i === idx ? updated : m));
      setEditingIndex(null);
      setEditText("");
    } catch (error) {
      console.error("Error updating message:", error);
      setToast({
        type: 'error',
        message: 'Failed to update message. Please try again.',
        duration: 5000
      });
    }
  }

  async function handleDelete(idx) {
    const messageId = messages[idx].id;
    try {
      const res = await fetch(`/api/chat/message/${messageId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to delete message");
      }

      setMessages(prev => prev.filter((_, i) => i !== idx));
    } catch (error) {
      console.error("Error deleting message:", error);
      setToast({
        type: 'error',
        message: 'Failed to delete message. Please try again.',
        duration: 5000
      });
    }
  }

  async function handleAddReaction(idx, emoji) {
    const messageId = messages[idx].id;
    const prevReactions = messages[idx].reactions || {};
    const newReactions = prevReactions[emoji] ? {} : { [emoji]: 1 };

    try {
      const res = await fetch(`/api/chat/message/${messageId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          content: messages[idx].content,
          reactions: newReactions
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to update reactions");
      }

      const updated = await res.json();
      setMessages(prev => prev.map((m, i) => i === idx ? updated : m));
    } catch (error) {
      console.error("Error updating reactions:", error);
      setToast({
        type: 'error',
        message: 'Failed to update reactions. Please try again.',
        duration: 5000
      });
    }
    setPickerIndex(null);
    }

  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  }

  function handleFocus() {
    setTimeout(() => {
      textareaRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }, 300);
  }

  function handleEditInit(idx) {
    setEditingIndex(idx);
    setEditText(messages[idx].content);
  }
  function handleEditCancel() {
    setEditingIndex(null);
    setEditText("");
  }

  // Helper function to check if any metadata fields are filled
  const hasMetadata = current && (
    current.age ||
    current.gender ||
    current.race ||
    current.occupation ||
    current.likes ||
    current.dislikes ||
    current.backstory
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-300 dark:border-gray-700">
        <button
          onClick={onMenuClick}
          className="md:hidden text-gray-600 dark:text-gray-300"
        >
          <i className="fas fa-bars" />
        </button>
        <div className="flex-1" />
        <button
          onClick={clearChat}
          className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
          title="Clear chat"
        >
          <i className="fas fa-trash" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500 dark:text-gray-400">
              Loading messages...
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500 dark:text-gray-400">
              No messages yet. Start a conversation!
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={msg.id || idx}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`relative group max-w-[80%] p-3 rounded-lg ${
                  msg.role === "user"
                    ? "bg-[var(--chat-user-bg)] text-[var(--chat-user-text)] rounded-br-none"
                    : "bg-[var(--chat-assistant-bg)] text-[var(--chat-assistant-text)] rounded-bl-none"
                }`}
              >
                {editingIndex === idx ? (
                  <div className="flex flex-col space-y-2">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full p-2 rounded bg-background-secondary-light dark:bg-background-secondary-dark text-text-light dark:text-text-dark"
                      rows={3}
                    />
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={handleEditCancel}
                        className="px-2 py-1 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleEditSave(idx)}
                        className="px-2 py-1 text-sm bg-background-secondary-light dark:bg-background-secondary-dark rounded-full shadow hover:shadow-md transition-shadow"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                    {/* Message actions */}
                    <div
                      className={`absolute ${
                        msg.role === "user" ? "-left-8" : "-right-8"
                      } top-0 hidden group-hover:flex items-center space-x-1`}
                    >
                      {msg.role === "user" && (
                        <>
                          <button
                            onClick={() => handleEditInit(idx)}
                            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            title="Edit message"
                          >
                            <i className="fas fa-pencil-alt" />
                          </button>
                          <button
                            onClick={() => handleDelete(idx)}
                            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            title="Delete message"
                          >
                            <i className="fas fa-trash" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setPickerIndex(idx)}
                        className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        title="Add reaction"
                      >
                        <i className="far fa-smile" />
                      </button>
                    </div>
                    {/* Reactions */}
                    {msg.reactions && Object.entries(msg.reactions).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {Object.entries(msg.reactions).map(([emoji, count]) => (
                          <button
                            key={emoji}
                            onClick={() => handleAddReaction(idx, emoji)}
                            className="px-2 py-1 text-sm bg-background-secondary-light dark:bg-background-secondary-dark rounded-full shadow hover:shadow-md transition-shadow"
                          >
                            {emoji} {count}
                          </button>
                        ))}
                      </div>
                    )}
                    {/* Reaction picker */}
                    {pickerIndex === idx && (
                      <div className="absolute bottom-full mb-2 left-0">
                        <ReactionPicker
                          onSelect={(emoji) => {
                            handleAddReaction(idx, emoji);
                            setPickerIndex(null);
                          }}
                          onClose={() => setPickerIndex(null)}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator */}
      {isTyping && (
        <div className="p-4 border-t border-gray-300 dark:border-gray-700">
          <TypingIndicator />
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-300 dark:border-gray-700">
        <div className="flex items-end space-x-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              autoResize();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type message (Enter to send, Shift+Enter for new line)"
            className="flex-1 p-2 bg-background-secondary-light dark:bg-background-secondary-dark border border-border-light dark:border-border-dark rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i className="fas fa-paper-plane" />
          </button>
        </div>
      </div>

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
  );
}
