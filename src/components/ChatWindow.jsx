// src/components/ChatWindow.jsx
import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle, Suspense } from "react";
import { useCharacter } from "../context/CharacterContext";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useNavigate } from "react-router-dom";
import ReactionPicker from "./ReactionPicker";
import TypingIndicator from "./TypingIndicator";
import { useToast } from "./Toast";
import RegenerateButton from './RegenerateButton';
import { formatChatText } from '../utils/formatChatText.jsx';
import { useSettings } from '../context/SettingsContext';
import ReactDOM from 'react-dom';
import { useDebouncedCallback } from 'use-debounce';
import { useIsMobile } from '../hooks/useIsMobile';

// Add a default avatar for user and agent if not present
const DEFAULT_USER_AVATAR = "/user-avatar.png";
const DEFAULT_AGENT_AVATAR = "/agent-avatar.png";

const SettingsModal = React.lazy(() => import('./SettingsModal'));
const CharacterImportModal = React.lazy(() => import('./CharacterImportModal'));
const ProfileDropdown = React.lazy(() => import('./ProfileDropdown'));

const ChatWindow = forwardRef(function ChatWindow({ onMenuClick, onCharacterPaneClick, chatReloadKey, chatInputRef }, ref) {
  const { current } = useCharacter();
  const { token, logout, user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const model = import.meta.env.VITE_OPENAI_MODEL || "gpt-3.5-turbo";
  const isMobile = useIsMobile();

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

  const { addToast } = useToast();
  const [regeneratingIndex, setRegeneratingIndex] = useState(null);

  const messageRefs = useRef([]);

  // Add highlightedIndex state
  const [highlightedIndex, setHighlightedIndex] = useState(null);

  const { settings } = useSettings();

  // Modal state for regenerate-after-edit
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [regenerateTargetIndex, setRegenerateTargetIndex] = useState(null);

  const debouncedSetInput = useDebouncedCallback((val) => setInput(val), 100);

  // Load messages on mount, when character changes, or when chatReloadKey changes
  useEffect(() => {
    if (!current?.id) return;
    loadMessages();
  }, [current?.id, token, chatReloadKey]);

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
      
      let data = await res.json();

      // If no messages and character has a firstMessage, inject it as an assistant message
      if (data.length === 0 && current?.firstMessage) {
        data = [{
          id: "first-message", // synthetic id
          characterId: current.id,
          role: "assistant",
          content: current.firstMessage,
          reactions: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }];
      }

      setMessages(data);
    } catch (error) {
      console.error('Error loading messages:', error);
      addToast({
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
      addToast({
        type: 'error',
        message: t('chat.noCharacterSelected'),
        duration: 5000
      });
      return;
    }
    
    // Validate input length
    if (trimmed.length > 2000) {
      addToast({
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
      addToast({
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
      const res = await fetch(`/api/chat/message/${msg.id}`, {
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

      // After editing a user message, check for next assistant message
      const nextAiIndex = messages.findIndex((m, i) => i > index && m.role === 'assistant');
      if (nextAiIndex !== -1) {
        if (settings.autoRegenerateAfterEdit) {
          // Auto-regenerate
          await regenerateAssistantMessage(nextAiIndex);
        } else {
          // Show modal
          setRegenerateTargetIndex(nextAiIndex);
          setShowRegenerateModal(true);
        }
      }
    } catch (error) {
      console.error('Error editing message:', error);
      addToast({
        type: 'error',
        message: error.message,
        duration: 5000
      });
    }
  }

  // Helper to regenerate an assistant message by index
  async function regenerateAssistantMessage(aiIndex) {
    const msg = messages[aiIndex];
    if (!msg) return;
    setRegeneratingIndex(aiIndex);
    try {
      const res = await fetch(`/api/chat/message/${msg.id}/regenerate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({})
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to regenerate response');
      }
      const newMsg = await res.json();
      setMessages(prev => prev.map((m, idx) => idx === aiIndex ? newMsg : m));
      setRegeneratingIndex(null);
      addToast({ type: 'success', message: 'AI response regenerated!', duration: 4000 });
    } catch (error) {
      setRegeneratingIndex(null);
      addToast({ type: 'error', message: error.message, duration: 5000 });
      console.error('Regenerate error:', error);
    }
    setShowRegenerateModal(false);
    setRegenerateTargetIndex(null);
  }

  async function handleReaction(messageId, emoji) {
    try {
      // Find the message
      const msg = messages.find(m => m.id === messageId);
      let newReactions = {};
      if (msg && msg.reactions && msg.reactions[emoji]) {
        // If the reaction is already present, remove it (toggle off)
        newReactions = { ...msg.reactions };
        delete newReactions[emoji];
      } else {
        // Otherwise, set only the selected reaction
        newReactions = { [emoji]: 1 };
      }
      const res = await fetch(`/api/chat/message/${messageId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          reactions: newReactions
        })
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
      addToast({
        type: 'error',
        message: error.message,
        duration: 5000
      });
    }
  }

  // Expose regenerateLastAssistantMessage, scrollToMessage, and messages via ref
  useImperativeHandle(ref, () => ({
    handleSend,
    regenerateLastAssistantMessage: async () => {
      // Find the last assistant message
      const lastIdx = [...messages].reverse().findIndex(m => m.role === 'assistant');
      if (lastIdx === -1) return;
      const i = messages.length - 1 - lastIdx;
      const msg = messages[i];
      if (!msg) return;
      setRegeneratingIndex(i);
      try {
        const res = await fetch(`/api/chat/message/${msg.id}/regenerate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({})
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to regenerate response');
        }
        const newMsg = await res.json();
        setMessages(prev => prev.map((m, idx) => idx === i ? newMsg : m));
        setRegeneratingIndex(null);
        addToast({ type: 'success', message: 'AI response regenerated!', duration: 4000 });
      } catch (error) {
        setRegeneratingIndex(null);
        addToast({ type: 'error', message: error.message, duration: 5000 });
        console.error('Regenerate error:', error);
      }
    },
    scrollToMessage: (index) => {
      if (messageRefs.current[index]) {
        messageRefs.current[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightedIndex(index);
        setTimeout(() => setHighlightedIndex(null), 2000);
      }
    },
    messages, // expose messages for search
  }));

  return (
    <div className="chat-window flex flex-col h-full flex-1 overflow-hidden bg-chatwindow-light dark:bg-chatwindow-dark font-sans">
      {/* Mobile Header */}
      {isMobile && (
        <div className="flex items-center justify-between px-4 py-2 bg-background-container-light dark:bg-background-container-dark border-b border-container-border-light dark:border-container-border-dark">
          <button
            onClick={onMenuClick}
            className="p-2 text-text-light dark:text-text-dark hover:text-primary transition-colors"
            aria-label="Menu"
          >
            <i className="fas fa-bars text-xl" />
          </button>
          <button
            onClick={onCharacterPaneClick}
            className="p-2 text-text-light dark:text-text-dark hover:text-primary transition-colors"
            aria-label="Character Info"
          >
            <i className="fas fa-user text-xl" />
          </button>
        </div>
      )}
      {/* Placeholder if no character is selected */}
      {!current && (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-lg">
          No character selected. Please select a character to start chatting.
        </div>
      )}
      {/* Messages */}
      <div className="flex-1 w-full overflow-y-auto px-4 md:px-6 py-4 md:py-8 space-y-4 md:space-y-6 messages-container bg-chatwindow-light dark:bg-chatwindow-dark">
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
            <div key={msg.id} ref={el => messageRefs.current[i] = el} className={`w-full flex ${highlightedIndex === i ? 'ring-4 ring-primary/60 transition-all duration-500' : ''}`}>
              <div className={`flex items-end group max-w-[85%] md:max-w-[70%] min-w-0 ${msg.role === 'user' ? 'justify-end ml-auto flex-row' : 'justify-start mr-auto flex-row'}`}>
                {/* Agent side: avatar left, bubble right */}
                {msg.role === 'assistant' && (
                  <img
                    src={current?.avatar || DEFAULT_AGENT_AVATAR}
                    alt={current?.name || 'Agent'}
                    className="w-8 h-8 md:w-9 md:h-9 rounded-full shadow-md object-cover mr-2 order-1"
                  />
                )}
                {msg.role === 'assistant' && (
                  <div className="flex flex-col max-w-max w-fit items-start order-2">
                    {/* Agent name and label */}
                    <div className="flex items-center mb-1 space-x-2">
                      <span className="text-xs font-semibold text-gray-300">{current?.name || 'Agent'}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#23242a] text-gray-400 font-bold tracking-wide uppercase">Nel.ai</span>
                    </div>
                    <div className={`chat-message relative px-4 md:px-5 py-2 md:py-3 rounded-2xl shadow-md w-fit max-w-full break-normal bg-[#23242a] text-gray-100 rounded-bl-md mr-2 text-sm md:text-base`}>
                      {/* Reactions for agent message, top right overlapping bubble */}
                      {msg.role === 'assistant' && !editingIndex && Object.keys(msg.reactions || {}).length > 0 && (
                        <div className="absolute -right-4 -top-3 flex items-center space-x-2">
                          {Object.entries(msg.reactions || {}).map(([emoji, count]) => (
                            <span key={emoji} className="text-xs text-gray-500">
                              {emoji} {count}
                            </span>
                          ))}
                        </div>
                      )}
                      {/* Regenerate button for agent message, above reaction picker */}
                      {msg.role === 'assistant' && !editingIndex && (
                        <RegenerateButton
                          message={msg}
                          onRegenerate={async (newMsg) => {
                            setRegeneratingIndex(i);
                            setTimeout(() => setRegeneratingIndex(null), 2000); // fallback in case
                            setMessages(prev => prev.map((m, idx) => idx === i ? newMsg : m));
                            addToast({ type: 'success', message: 'AI response regenerated!', duration: 4000 });
                          }}
                        />
                      )}
                      {/* Typing animation during regeneration */}
                      {regeneratingIndex === i ? (
                        <TypingIndicator />
                      ) : editingIndex === i ? (
                        <div className="flex items-end space-x-2">
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="flex-1 p-2 rounded bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary resize-none text-sm md:text-base"
                            rows={1}
                            autoFocus
                          />
                          <button
                            onClick={() => handleEdit(i)}
                            className="px-3 py-1 bg-primary text-white rounded hover:bg-primary/90 text-sm md:text-base"
                          >
                            {t('common.actions.save')}
                          </button>
                          <button
                            onClick={() => {
                              setEditingIndex(null);
                              setEditText("");
                            }}
                            className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm md:text-base"
                          >
                            {t('common.actions.cancel')}
                          </button>
                        </div>
                      ) : (
                        <>
                          {formatChatText(msg.content, user, settings.chatFont)}
                          {/* Reaction picker button for agent message, bottom right */}
                          {msg.role === 'assistant' && !editingIndex && (
                            <button
                              onClick={() => setPickerIndex(pickerIndex === i ? null : i)}
                              className="absolute bottom-0 -right-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              title={t('chat.addReaction')}
                            >
                              <i className="far fa-smile text-gray-500 hover:text-gray-700" />
                            </button>
                          )}
                          {msg.role === 'assistant' && pickerIndex === i && (
                            <div style={{ position: 'absolute', bottom: 0, right: '-2.5rem', zIndex: 30 }}>
                              <ReactionPicker
                                onSelect={(emoji) => {
                                  handleReaction(msg.id, emoji);
                                  setPickerIndex(null);
                                }}
                                onClose={() => setPickerIndex(null)}
                                isUserMessage={false}
                              />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
                {/* User side: bubble left, avatar right */}
                {msg.role === 'user' && (
                  <div className="flex flex-col max-w-[85%] md:max-w-[80%] min-w-0 items-end order-1 group relative">
                    {/* User display name */}
                    <div className="flex items-center mb-1 space-x-2 justify-end">
                      <span className="text-xs font-semibold text-gray-300">{user?.displayName || user?.username || 'You'}</span>
                    </div>
                    <div className="chat-message user-message bg-chat-user text-chat-user ml-2 relative text-sm md:text-base">
                      {editingIndex === i ? (
                        <div className="flex items-end space-x-2 min-w-0">
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="flex-1 p-2 rounded bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary resize-none min-w-0 text-sm md:text-base"
                            rows={1}
                            autoFocus
                          />
                          <button
                            onClick={() => handleEdit(i)}
                            className="px-3 py-1 bg-primary text-white rounded hover:bg-primary/90 text-sm md:text-base"
                          >
                            {t('common.actions.save')}
                          </button>
                          <button
                            onClick={() => {
                              setEditingIndex(null);
                              setEditText("");
                            }}
                            className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm md:text-base"
                          >
                            {t('common.actions.cancel')}
                          </button>
                        </div>
                      ) : (
                        <>{formatChatText(msg.content, user, settings.chatFont)}</>
                      )}
                      {/* Pencil icon for user messages, bottom-left, only on hover, original style */}
                      {msg.role === 'user' && !editingIndex && (
                        <button
                          onClick={() => {
                            setEditingIndex(i);
                            setEditText(msg.content);
                          }}
                          className="absolute opacity-0 group-hover:opacity-100 transition-opacity left-[-18px] bottom-0 text-base text-gray-500 hover:text-gray-300 p-0 m-0 bg-transparent border-none shadow-none rounded-none"
                          title={t('common.edit')}
                          style={{lineHeight: 1}}
                        >
                          <i className="fas fa-pencil-alt text-sm" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
                {msg.role === 'user' && (
                  <img
                    src={user?.avatar || '/default-avatar.png'}
                    alt={user?.displayName || user?.username || 'You'}
                    className="w-8 h-8 md:w-9 md:h-9 rounded-full shadow-md object-cover ml-2 order-2"
                    onError={e => {
                      if (!e.target.src.endsWith('/default-avatar.png')) {
                        e.target.onerror = null;
                        e.target.src = '/default-avatar.png';
                      }
                    }}
                  />
                )}
              </div>
            </div>
          ))
        )}
        {isTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-2 md:p-4 border-t border-transparent bg-chatwindow-light dark:bg-chatwindow-dark">
        <div className="flex items-end space-x-2 rounded-2xl bg-[#23242a] px-3 md:px-4 py-2 md:py-3 shadow-lg">
          <textarea
            ref={chatInputRef || textareaRef}
            value={input}
            onChange={(e) => debouncedSetInput(e.target.value)}
            placeholder={t('chat.typeMessage') + ' (Alt+/ for shortcuts)'}
            className="flex-1 p-2 min-h-[36px] md:min-h-[40px] max-h-[200px] rounded-2xl bg-chatwindow-light dark:bg-chatwindow-dark text-gray-100 border-none focus:outline-none focus:ring-2 focus:ring-primary resize-none text-sm md:text-base"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-primary text-white rounded-full shadow-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            style={{ minWidth: 40, minHeight: 40 }}
          >
            <i className="fas fa-paper-plane text-base md:text-lg" />
          </button>
        </div>
      </div>

      {/* Regenerate after edit modal */}
      {showRegenerateModal && typeof document !== 'undefined' && ReactDOM.createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-background-container-light dark:bg-background-container-dark rounded-xl shadow-2xl p-4 md:p-6 w-full max-w-md mx-4 md:mx-auto relative">
            <div className="mb-4 text-base md:text-lg font-semibold">Regenerate AI response to match this edit?</div>
            <div className="flex space-x-4 justify-end">
              <button
                className="px-3 md:px-4 py-2 rounded bg-primary text-white hover:bg-primary/90 text-sm md:text-base"
                onClick={() => regenerateAssistantMessage(regenerateTargetIndex)}
              >
                Yes, regenerate
              </button>
              <button
                className="px-3 md:px-4 py-2 rounded bg-gray-400 text-white hover:bg-gray-500 text-sm md:text-base"
                onClick={() => { setShowRegenerateModal(false); setRegenerateTargetIndex(null); }}
              >
                No, keep current response
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
});

export default ChatWindow;
