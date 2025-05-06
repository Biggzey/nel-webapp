// src/components/ChatWindow.jsx
import React, { useState, useRef, useEffect } from "react";
import { useCharacter } from "../context/CharacterContext";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useNavigate } from "react-router-dom";
import ReactionPicker from "./ReactionPicker";
import TypingIndicator from "./TypingIndicator";
import Toast from "./Toast";

export default function ChatWindow({ onMenuClick }) {
  const { current } = useCharacter();
  const { token, logout, user } = useAuth();
  const { t } = useLanguage();
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

  // Load messages on mount and when character changes
  useEffect(() => {
    if (!current?.id) return;
    loadMessages();
  }, [current?.id, token]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    autoResize();
  }, [input]);

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  function autoResize() {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';
    // Set new height
    textarea.style.height = textarea.scrollHeight + 'px';
  }

  async function loadMessages() {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/chat/${current.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) {
        if (res.status === 401) {
          logout();
          navigate("/login");
          return;
        }
        throw new Error(t('errors.serverError'));
      }
      
      const data = await res.json();
      setMessages(data);
    } catch (error) {
      console.error('Error loading messages:', error);
      setToast({
        type: 'error',
        message: error.message,
        duration: 5000
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed) return;
    
    // Check if we have a valid character ID
    if (!current?.id) {
      setToast({
        type: 'error',
        message: t('chat.noCharacterSelected'),
        duration: 5000
      });
      return;
    }
    
    // Validate input length
    if (trimmed.length > 2000) {
      setToast({
        type: 'warning',
        message: t('chat.messageTooLong'),
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
        throw new Error(errorData.error || t('errors.serverError'));
      }

      const savedMsg = await msgRes.json();
      setMessages(prev => [...prev, savedMsg]);
      setInput("");
      autoResize();
      setIsTyping(true);

      // Get AI response
      const aiRes = await fetch(`/api/chat/${current.id}/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ model })
      });

      if (!aiRes.ok) {
        const errorData = await aiRes.json().catch(() => ({}));
        console.error('AI response error:', errorData);
        throw new Error(errorData.error || t('errors.serverError'));
      }

      const aiMsg = await aiRes.json();
      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);

    } catch (error) {
      console.error('Error in chat:', error);
      setToast({
        type: 'error',
        message: error.message,
        duration: 5000
      });
      setIsTyping(false);
    }
  }

  async function handleEdit(index) {
    const msg = messages[index];
    if (!msg) return;

    try {
      const res = await fetch(`/api/chat/${current.id}/message/${msg.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content: editText })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || t('errors.serverError'));
      }

      const updatedMsg = await res.json();
      setMessages(prev => [
        ...prev.slice(0, index),
        updatedMsg,
        ...prev.slice(index + 1)
      ]);
      setEditingIndex(null);
      setEditText("");

    } catch (error) {
      console.error('Error editing message:', error);
      setToast({
        type: 'error',
        message: error.message,
        duration: 5000
      });
    }
  }

  async function handleReaction(messageId, emoji) {
    try {
      const res = await fetch(`/api/chat/${current.id}/message/${messageId}/reaction`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ emoji })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || t('errors.serverError'));
      }

      const updatedMsg = await res.json();
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? updatedMsg : msg
      ));

    } catch (error) {
      console.error('Error adding reaction:', error);
      setToast({
        type: 'error',
        message: error.message,
        duration: 5000
      });
    }
  }

  async function clearChat() {
    if (!window.confirm(t('chat.confirmClear'))) return;

    try {
      const res = await fetch(`/api/chat/${current.id}/clear`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || t('errors.serverError'));
      }

      setMessages([]);
      setToast({
        type: 'success',
        message: t('chat.chatCleared'),
        duration: 3000
      });

    } catch (error) {
      console.error('Error clearing chat:', error);
      setToast({
        type: 'error',
        message: error.message,
        duration: 5000
      });
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

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
          title={t('chat.clearChat')}
        >
          <i className="fas fa-trash" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 messages-container">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500 dark:text-gray-400">
              {t('chat.loading')}
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500 dark:text-gray-400">
              {t('chat.noMessages')}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={msg.id} className="group max-w-full">
              {/* Message header for user messages */}
              {msg.role === 'user' && (
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1 text-right mr-2">
                  {user?.displayName || user?.username || 'You'}
                </div>
              )}
              {/* Message header for assistant messages */}
              {msg.role === 'assistant' && (
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1 ml-2">
                  {current?.name}
                </div>
              )}
              <div className={`chat-message ${
                msg.role === 'user' ? 'user-message' : 'character-message'
              }`}>
                {editingIndex === i ? (
                  <div className="flex items-end space-x-2">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="flex-1 p-2 rounded bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                      rows={1}
                      autoFocus
                    />
                    <button
                      onClick={() => handleEdit(i)}
                      className="px-3 py-1 bg-primary text-white rounded hover:bg-primary/90"
                    >
                      {t('common.save')}
                    </button>
                    <button
                      onClick={() => {
                        setEditingIndex(null);
                        setEditText("");
                      }}
                      className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                ) : (
                  <>
                    {msg.content}
                    {msg.role === 'user' && (
                      <button
                        onClick={() => {
                          setEditingIndex(i);
                          setEditText(msg.content);
                        }}
                        className="absolute -right-6 top-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        title={t('common.edit')}
                      >
                        <i className="fas fa-pencil-alt text-gray-500 hover:text-gray-700" />
                      </button>
                    )}
                  </>
                )}
              </div>
              {!editingIndex && (
                <div className="flex items-center space-x-2 mt-1 ml-2">
                  <button
                    onClick={() => setPickerIndex(pickerIndex === i ? null : i)}
                    className="text-xs text-gray-500 hover:text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <i className="far fa-smile" />
                  </button>
                  {Object.entries(msg.reactions || {}).map(([emoji, count]) => (
                    <span key={emoji} className="text-xs text-gray-500">
                      {emoji} {count}
                    </span>
                  ))}
                </div>
              )}
              {pickerIndex === i && (
                <ReactionPicker
                  onSelect={(emoji) => {
                    handleReaction(msg.id, emoji);
                    setPickerIndex(null);
                  }}
                  onClose={() => setPickerIndex(null)}
                />
              )}
            </div>
          ))
        )}
        {isTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-300 dark:border-gray-700">
        <div className="flex items-end space-x-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('chat.typeMessage')}
            className="flex-1 p-2 min-h-[40px] max-h-[200px] rounded bg-background-container-hover-light dark:bg-background-container-hover-dark border border-container-border-light dark:border-container-border-dark focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('chat.sendMessage')}
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
