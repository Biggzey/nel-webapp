import React, { useState, useEffect, useRef, Suspense } from "react";
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
import CharacterPane from "./components/CharacterPane";
import AdminPanel from "./pages/AdminPanel";
import EditPersonalityModal from "./components/EditPersonalityModal";
import SettingsModal from "./components/SettingsModal";
import { useChat } from "./hooks/useChat";
import KeyboardShortcuts from "./components/KeyboardShortcuts";
import ShortcutHelpModal from "./components/ShortcutHelpModal";
import ChatSearch from "./components/ChatSearch";
import { useIsMobile } from './hooks/useIsMobile';
import ExplorePage from './components/ExplorePage';
import { OnboardingProvider, useOnboarding } from './context/OnboardingContext';
import SpotlightOnboarding from './components/SpotlightOnboarding';
import { NotificationProvider } from './context/NotificationContext';
import VerifyEmail from './pages/VerifyEmail';
import VerifyRedirect from './pages/VerifyRedirect';

const Sidebar = React.lazy(() => import('./components/Sidebar'));

function PrivateRoute({ children }) {
  const { token } = useAuth();
  const location = useLocation();

  // ✅ Allow access to /verify-email for unauthenticated users
  if (location.pathname.startsWith("/verify-email")) {
    return children;
  }

  return token ? children : <Navigate to="/login" replace />;
}


function AdminRoute({ children }) {
  const { token, isModerator } = useAuth();
  return token && isModerator ? children : <Navigate to="/" replace />;
}

function ProtectedContent({ addToast }) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(null);
  const { current, handleSaveCharacter, isModalOpen, handleCloseModal, setSelectedIndex, selectedIndex, characters, isLoading, isImporting, isReloadingCharacters } = useCharacter();
  const { clearChat } = useChat();
  const { t } = useLanguage();
  const [chatReloadKey, setChatReloadKey] = useState(0);
  const isMobile = useIsMobile();
  const [sidebarVisible, setSidebarVisible] = useState(!isMobile);
  const [characterPaneVisible, setCharacterPaneVisible] = useState(!isMobile);
  const chatInputRef = useRef(null);
  const chatWindowRef = useRef(null);
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [sidebarReloadKey, setSidebarReloadKey] = useState(0);
  const [showExplore, setShowExplore] = useState(false);
  const { hasSeenOnboarding, markOnboardingComplete } = useOnboarding();
  const { user } = useAuth();

  // Update visibility when switching between mobile/desktop
  useEffect(() => {
    setSidebarVisible(!isMobile);
    setCharacterPaneVisible(!isMobile);
  }, [isMobile]);

  // Add mobile sidebar toggle handler
  const handleMobileMenuClick = () => {
    setSidebarVisible(v => !v);
  };

  // Add mobile character pane toggle handler
  const handleMobileCharacterPaneClick = () => {
    setCharacterPaneVisible(v => !v);
  };

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
  const handleFocusSearch = () => {
    // Chat search is implemented in ChatSearch component
  };
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

  // Add effect to hide character pane when ExplorePage is shown
  useEffect(() => {
    if (showExplore) {
      setCharacterPaneVisible(false);
    }
  }, [showExplore]);

  const handleSpotlightOnboardingClose = () => {
    markOnboardingComplete();
  };

  return (
    <NotificationProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-background-container-light dark:bg-background-container-dark">
        {/* Global loading overlay */}
        {(isLoading || isImporting || isReloadingCharacters) && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60">
            <div className="loader border-8 border-primary border-t-transparent rounded-full w-20 h-20 animate-spin" />
          </div>
        )}
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
        {location.pathname !== '/admin' && sidebarVisible && (
          <Sidebar
            className="h-full"
            onSettingsClick={() => setIsSettingsOpen(true)}
            onClearChat={handleClearChat}
            sidebarReloadKey={sidebarReloadKey}
            setSidebarReloadKey={setSidebarReloadKey}
            setShowExplore={setShowExplore}
          />
        )}
        <Routes>
          <Route path="/*" element={
            <>
              {/* Only show spinner during loading/importing/reloading, nothing else */}
              {(isLoading || isImporting || isReloadingCharacters) ? (
                null
              ) : (
                <Suspense fallback={null}>
                  {(!characters || characters.length === 0 || !current || showExplore)
                    ? (
                      <ExplorePage onClose={() => {
                        setShowExplore(false);
                        if (current) setCharacterPaneVisible(true);
                      }} />
                    ) : (
                    <ChatWindow 
                      ref={chatWindowRef} 
                      chatInputRef={chatInputRef} 
                      className="flex-1" 
                      chatReloadKey={chatReloadKey}
                      onMenuClick={handleMobileMenuClick}
                      onCharacterPaneClick={handleMobileCharacterPaneClick}
                    />
                  )}
                </Suspense>
              )}
              {/* CharacterPane should also only show when not loading/importing/reloading and not showing ExplorePage */}
              {characterPaneVisible && isMobile && !showExplore && current && !isLoading && !isImporting && !isReloadingCharacters && (
                <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setCharacterPaneVisible(false)} />
              )}
              {characterPaneVisible && !showExplore && current && !isLoading && !isImporting && !isReloadingCharacters && (
                <Suspense fallback={<div className="w-[22rem] flex items-center justify-center"><div className="loader" /></div>}>
                  <CharacterPane 
                    className={`${isMobile ? 'fixed inset-y-0 right-0 z-50' : 'w-[22rem]'}`} 
                  />
                </Suspense>
              )}
            </>
          } />
        </Routes>
        <ChatSearch
          messages={chatWindowRef.current?.messages || []}
          open={showChatSearch}
          onClose={() => setShowChatSearch(false)}
          onJumpToMessage={handleJumpToMessage}
        />
        <EditPersonalityModal
          isOpen={isModalOpen}
          initialData={current}
          onClose={handleCloseModal}
          onSave={async (form) => {
            try {
              await handleSaveCharacter(form);
              addToast({ type: 'success', message: t('character.editSuccess', 'Character updated!'), duration: 3000 });
              handleCloseModal();
            } catch (error) {
              addToast({ type: 'error', message: t('character.editError', 'Failed to update character'), duration: 4000 });
            }
          }}
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
                  {t('common.actions.cancel')}
                </button>
                <button
                  onClick={handleConfirmClear}
                  className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                >
                  {t('common.actions.delete')}
                </button>
              </div>
            </div>
          </div>
        )}
        {user && hasSeenOnboarding === false && (
          <SpotlightOnboarding onFinish={markOnboardingComplete} />
        )}
      </div>
    </NotificationProvider>
  );
}

function InnerApp() {
  const [toast, setToast] = useState(null);
  const [toasts, setToasts] = useState([]);
  const location = useLocation();

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
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/verify/:token" element={<VerifyRedirect />} />
           {/* ✅ Protect the admin panel properly */}
  <Route 
    path="/admin" 
    element={
      <AdminRoute>
        <AdminPanel />
      </AdminRoute>
    } 
  />
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
                <OnboardingProvider>
                  <InnerApp />
                </OnboardingProvider>
              </ToastProvider>
            </SettingsProvider>
          </LanguageProvider>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
