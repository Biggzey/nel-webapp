import React, { useState, useEffect, useRef } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CharacterProvider, useCharacter } from "./context/CharacterContext";
import { ThemeProvider } from "./context/ThemeContext";
import { SettingsProvider } from "./context/SettingsContext";
import { LanguageProvider, useLanguage } from "./context/LanguageContext";
import ErrorBoundary from "./components/ErrorBoundary";
import Toast, { ToastContainer, ToastProvider } from "./components/Toast";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ChatWindow from "./components/ChatWindow";
import Sidebar from "./components/Sidebar";
import CharacterPane from "./components/CharacterPane";
import AdminPanel from "./pages/AdminPanel";
import PersonalityModal from "./components/PersonalityModal";
import SettingsModal from "./components/SettingsModal";
import { useChat } from "./hooks/useChat";
import KeyboardShortcuts from "./components/KeyboardShortcuts";
import ShortcutHelpModal from "./components/ShortcutHelpModal";
import ChatSearch from "./components/ChatSearch";

function PrivateRoute({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const { token, isModerator } = useAuth();
  return token && isModerator ? children : <Navigate to="/" replace />;
}

function ProtectedContent({ addToast }) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(null);
  const { current, handleSaveCharacter, isModalOpen, handleCloseModal, setSelectedIndex, selectedIndex, characters } = useCharacter();
  const { clearChat } = useChat();
  const { t } = useLanguage();
  const [chatReloadKey, setChatReloadKey] = useState(0);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [characterPaneVisible, setCharacterPaneVisible] = useState(true);
  const chatInputRef = useRef(null);
  const chatWindowRef = useRef(null);
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [sidebarReloadKey, setSidebarReloadKey] = useState(0);

  // Handler stubs for global shortcuts
  const handleSendMessage = () => {
    if (chatWindowRef.current && chatWindowRef.current.handleSend) {
      chatWindowRef.current.handleSend();
    }
  };
  const handleOpenSettings = () => setIsSettingsOpen(true);
  const handleToggleSidebar = () => setSidebarVisible((v) => !v);
  const handleToggleCharacterPane = () => setCharacterPaneVisible((v) => !v);
  const handleRegenerate = () => {
    if (chatWindowRef.current && chatWindowRef.current.regenerateLastAssistantMessage) {
      chatWindowRef.current.regenerateLastAssistantMessage();
    }
  };
  const handleNavigateCharacter = (direction) => {
    if (!characters || characters.length === 0) return;
    let newIndex = selectedIndex + direction;
    if (newIndex < 0) newIndex = characters.length - 1;
    if (newIndex >= characters.length) newIndex = 0;
    setSelectedIndex(newIndex);
  };
  const handleFocusSearch = () => {/* TODO: implement chat search focus */};
  const handleShowShortcutHelp = () => setShowShortcutHelp(true);

  const handleClearChat = (character) => {
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
          setChatReloadKey((k) => k + 1);
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

  // Handler to scroll to a message in ChatWindow
  const handleJumpToMessage = (msgIndex) => {
    if (chatWindowRef.current && chatWindowRef.current.scrollToMessage) {
      chatWindowRef.current.scrollToMessage(msgIndex);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <KeyboardShortcuts
        chatInputRef={chatInputRef}
        onSendMessage={handleSendMessage}
        onOpenSettings={handleOpenSettings}
        onToggleSidebar={handleToggleSidebar}
        onToggleCharacterPane={handleToggleCharacterPane}
        onRegenerate={handleRegenerate}
        onNavigateCharacter={handleNavigateCharacter}
        onFocusSearch={() => setShowChatSearch(true)}
        onShowShortcutHelp={handleShowShortcutHelp}
      />
      <ShortcutHelpModal isOpen={showShortcutHelp} onClose={() => setShowShortcutHelp(false)} />
      {sidebarVisible && (
        <Sidebar
          className="w-[22rem]"
          onSettingsClick={() => setIsSettingsOpen(true)}
          onClearChat={handleClearChat}
          sidebarReloadKey={sidebarReloadKey}
          setSidebarReloadKey={setSidebarReloadKey}
        />
      )}
      <Routes>
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/*" element={
          <>
            <ChatWindow ref={chatWindowRef} chatInputRef={chatInputRef} className="flex-1" chatReloadKey={chatReloadKey} />
            {characterPaneVisible && <CharacterPane className="w-[22rem]" />}
          </>
        } />
      </Routes>
      <ChatSearch
        messages={chatWindowRef.current?.messages || []}
        open={showChatSearch}
        onClose={() => setShowChatSearch(false)}
        onJumpToMessage={handleJumpToMessage}
      />
      <PersonalityModal
        isOpen={isModalOpen}
        initialData={current}
        onClose={handleCloseModal}
        onSave={handleSaveCharacter}
      />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        addToast={addToast}
      />
      {/* Confirmation Modal */}
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
    </div>
  );
}

function InnerApp() {
  const [toast, setToast] = useState(null);
  const [toasts, setToasts] = useState([]);

  // Add global error handler
  useEffect(() => {
    function handleGlobalError(event) {
      event.preventDefault();
      console.error('Global error:', event.error);
      setToast({
        type: 'error',
        message: 'An unexpected error occurred. Please try again.',
        duration: 5000
      });
    }

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleGlobalError);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleGlobalError);
    };
  }, []);

  // Toast handlers
  const addToast = (toast) => {
    const id = Date.now();
    setToasts(prev => [...prev, { ...toast, id }]);
    if (toast.duration) {
      setTimeout(() => {
        removeToast(id);
      }, toast.duration);
    }
  };
  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return (
    <ErrorBoundary>
      <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark">
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          {/* Protected routes */}
          <Route
            path="/*"
            element={
              <PrivateRoute>
                <CharacterProvider>
                  <ProtectedContent addToast={addToast} />
                </CharacterProvider>
              </PrivateRoute>
            }
          />
        </Routes>
        {/* Toast notifications (global, overlays everything) */}
        <ToastContainer toasts={toasts} onClose={removeToast} />
        {/* Single error toast for global errors */}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <LanguageProvider>
            <SettingsProvider>
              <ToastProvider>
                <InnerApp />
              </ToastProvider>
            </SettingsProvider>
          </LanguageProvider>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
