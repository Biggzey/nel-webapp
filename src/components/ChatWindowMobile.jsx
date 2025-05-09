import React, { useState, useEffect, useRef } from 'react';
import { useCharacter } from '../context/CharacterContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { formatChatText } from '../utils/formatChatText';
import { useSettings } from '../context/SettingsContext';
import SidebarMobile from './SidebarMobile';
import CharacterPaneMobile from './CharacterPaneMobile';
import { useToast } from './Toast';
import PersonalityModal from './PersonalityModal';
import { useChat } from '../hooks/useChat';
import CharacterImportModal from './CharacterImportModal';
import ProfileDropdown from './ProfileDropdown';

export default function ChatWindowMobile({ chatInputRef, chatReloadKey }) {
  const { current, characters, setSelectedIndex, handleNewCharacter, handleOpenModal, handleDeleteCharacter } = useCharacter();
  const { token, logout, user } = useAuth();
  const { t } = useLanguage();
  const { settings } = useSettings();
  const { addToast } = useToast();
  const { clearChat } = useChat();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [characterPaneOpen, setCharacterPaneOpen] = useState(false);
  const [showPersonalityModal, setShowPersonalityModal] = useState(false);
  const [confirmClear, setConfirmClear] = useState(null);
  const messagesEndRef = useRef(null);
  const model = import.meta.env.VITE_OPENAI_MODEL || "gpt-3.5-turbo";
  const [showImportModal, setShowImportModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Load messages on mount, when character changes, or when chatReloadKey changes
  useEffect(() => {
    if (!current?.id) return;
    loadMessages();
    // eslint-disable-next-line
  }, [current?.id, token, chatReloadKey]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Ensure input bar returns to bottom after keyboard closes
  useEffect(() => {
    const handler = () => {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  async function loadMessages() {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/chat/${current.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        if (res.status === 401) {
          logout();
          return;
        }
        throw new Error(t('errors.serverError'));
      }
      let data = await res.json();
      if (data.length === 0 && current?.firstMessage) {
        data = [{
          id: "first-message",
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
      addToast({ type: 'error', message: error.message, duration: 5000 });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (!current?.id) {
      addToast({ type: 'error', message: t('chat.noCharacterSelected'), duration: 5000 });
      return;
    }
    if (trimmed.length > 2000) {
      addToast({ type: 'warning', message: t('chat.messageTooLong'), duration: 5000 });
      return;
    }
    const userMsg = { role: "user", content: trimmed, reactions: {} };
    try {
      // Save user message
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
        throw new Error(errorData.error || t('errors.serverError'));
      }
      const savedMsg = await msgRes.json();
      setMessages(prev => [...prev, savedMsg]);
      setInput("");
      setIsTyping(true);
      // Blur input to close keyboard
      if (chatInputRef && chatInputRef.current) chatInputRef.current.blur();
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
        throw new Error(errorData.error || t('errors.serverError'));
      }
      const aiMsg = await aiRes.json();
      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);
      // Scroll to bottom after AI response
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (error) {
      addToast({ type: 'error', message: error.message, duration: 5000 });
      setIsTyping(false);
    }
  }

  function handleInputKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const handleClearChat = async (character) => {
    setConfirmClear(character);
  };

  const handleConfirmClear = async () => {
    if (!confirmClear) return;

    try {
      await clearChat(
        confirmClear.id,
        // Success callback
        (toastData) => {
          addToast(toastData);
          setConfirmClear(null);
          loadMessages();
        },
        // Error callback
        (toastData) => {
          addToast(toastData);
          setConfirmClear(null);
        }
      );
    } catch (error) {
      console.error('Error clearing chat:', error);
      addToast({
        type: 'error',
        message: t('errors.serverError'),
        duration: 5000
      });
      setConfirmClear(null);
    }
  };

  // Handler for importing a character
  const handleImportCharacter = () => setShowImportModal(true);
  // Handler for profile menu
  const handleProfileMenu = () => setShowProfileMenu(true);

  return (
    <div className="flex flex-col h-screen w-screen bg-chatwindow-light dark:bg-chatwindow-dark">
      {/* Header with hamburger and character pane icon */}
      <div className="flex items-center justify-between px-4 py-3 bg-primary text-white relative">
        <button
          className="text-2xl focus:outline-none"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open sidebar"
        >
          <i className="fas fa-bars" />
        </button>
        <span className="font-bold text-lg">{current?.name || 'Chat'}</span>
        <button
          className="text-2xl focus:outline-none"
          onClick={() => setCharacterPaneOpen(true)}
          aria-label="Open character pane"
        >
          <i className="fas fa-user" />
        </button>
      </div>
      {/* Sidebar drawer overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-10">
            <SidebarMobile
              onClose={() => setSidebarOpen(false)}
              characters={characters}
              selectedIndex={characters.findIndex(c => c.id === current?.id)}
              onSelect={i => {
                setSelectedIndex(i);
                setSidebarOpen(false);
              }}
              onClearChat={handleClearChat}
              onDeleteCharacter={handleDeleteCharacter}
              onNewCharacter={handleNewCharacter}
              onImportCharacter={handleImportCharacter}
              onProfile={handleProfileMenu}
            />
          </div>
        </div>
      )}
      {/* Character pane overlay (from right) */}
      {characterPaneOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={() => setCharacterPaneOpen(false)} />
          <div className="relative z-10">
            <CharacterPaneMobile
              onClose={() => setCharacterPaneOpen(false)}
              character={current}
              onEdit={() => setShowPersonalityModal(true)}
            />
          </div>
        </div>
      )}
      {/* Personality modal for editing character */}
      <PersonalityModal
        isOpen={showPersonalityModal}
        initialData={current}
        onClose={() => setShowPersonalityModal(false)}
        onSave={() => setShowPersonalityModal(false)}
      />
      {/* Confirm clear chat modal */}
      {confirmClear && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background-container-light dark:bg-background-container-dark rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">{t('chat.confirmClear')}</h3>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setConfirmClear(null)}
                className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleConfirmClear}
                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Character Import Modal */}
      <CharacterImportModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={async (characterData) => {
          try {
            const res = await fetch("/api/characters", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: token ? `Bearer ${token}` : undefined,
              },
              body: JSON.stringify(characterData),
            });
            if (!res.ok) {
              const errorData = await res.json().catch(() => ({}));
              throw new Error(errorData.error || "Failed to import character");
            }
            await res.json();
            addToast({ type: "success", message: "Character imported!", duration: 4000 });
            setShowImportModal(false);
            loadMessages();
          } catch (err) {
            addToast({ type: "error", message: err.message, duration: 5000 });
          }
        }}
      />
      {/* Profile Dropdown (context menu) */}
      {showProfileMenu && (
        <ProfileDropdown
          isOpen={showProfileMenu}
          onClose={() => setShowProfileMenu(false)}
          onSettingsClick={() => {
            setShowProfileMenu(false);
            // Open settings modal (already handled by SettingsModal in App)
            if (typeof window !== 'undefined') {
              const event = new CustomEvent('openSettingsModal');
              window.dispatchEvent(event);
            }
          }}
        />
      )}
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-2 py-4 space-y-4 pb-28"> {/* pb-28 for input bar space */}
        {isLoading ? (
          <div className="text-center text-gray-400 mt-8">{t('chat.loading')}</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-400 mt-8">{t('chat.noMessages')}</div>
        ) : (
          messages.map((msg, i) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' ? (
                <div className="chat-message character-message px-5 py-3 mr-2">
                  {formatChatText(msg.content, user, settings.chatFont)}
                </div>
              ) : (
                <div className="chat-message user-message ml-2">
                  {formatChatText(msg.content, user, settings.chatFont)}
                </div>
              )}
            </div>
          ))
        )}
        {isTyping && (
          <div className="text-center text-gray-400">{t('chat.loading')}</div>
        )}
        <div ref={messagesEndRef} />
      </div>
      {/* Input - fixed to bottom on mobile */}
      <div className="fixed bottom-0 left-0 right-0 z-40 p-2 border-t border-gray-300 dark:border-gray-700 bg-background-container-light dark:bg-background-container-dark">
        <div className="flex items-end space-x-2">
          <textarea
            ref={chatInputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder={t('chat.typeMessage')}
            className="flex-1 p-2 rounded-lg bg-chatwindow-light dark:bg-chatwindow-dark text-gray-900 dark:text-gray-100 border-none focus:outline-none focus:ring-2 focus:ring-primary resize-none min-h-[36px] max-h-[120px]"
            rows={1}
          />
          <button
            className="w-10 h-10 flex items-center justify-center bg-primary text-white rounded-full shadow-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!input.trim()}
            onClick={handleSend}
          >
            <i className="fas fa-paper-plane text-lg" />
          </button>
        </div>
      </div>
    </div>
  );
} 