import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CharacterProvider, useCharacter } from "./context/CharacterContext";
import { ThemeProvider } from "./context/ThemeContext";
import ErrorBoundary from "./components/ErrorBoundary";
import Toast from "./components/Toast";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ChatWindow from "./components/ChatWindow";
import Sidebar from "./components/Sidebar";
import CharacterPane from "./components/CharacterPane";
import AdminPanel from "./pages/AdminPanel";
import PersonalityModal from "./components/PersonalityModal";
import ProfileModal from "./components/ProfileModal";

function PrivateRoute({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const { token, isModerator } = useAuth();
  return token && isModerator ? children : <Navigate to="/" replace />;
}

function ProtectedContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { token } = useAuth();
  const {
    current,
    isModalOpen,
    handleCloseModal,
    handleSaveCharacter,
  } = useCharacter();
  const location = useLocation();
  const isAdminRoute = location.pathname === '/admin';

  const handleOpenSidebar = () => setSidebarOpen(true);
  const handleCloseSidebar = () => setSidebarOpen(false);

  return (
    <div className="flex h-full w-full">
      <Sidebar
        className={`
          fixed inset-y-0 left-0 z-40 w-72
          bg-background-light dark:bg-background-dark
          text-text-light dark:text-text-dark
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          md:relative md:translate-x-0
          border-r border-border-light dark:border-border-dark
        `}
        onLinkClick={handleCloseSidebar}
        onSettingsClick={() => setIsProfileOpen(true)}
      />

      {/* Backdrop for mobile when sidebar is open */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black bg-opacity-50 md:hidden"
          onClick={handleCloseSidebar}
        />
      )}

      {/* Show CharacterPane only when not on admin route */}
      {!isAdminRoute && <CharacterPane />}

      {/* Main content area - wider when CharacterPane is hidden */}
      <div className="flex-1 w-0 min-w-0">
        <Routes>
          <Route
            path="/"
            element={
              <ErrorBoundary>
                <ChatWindow onMenuClick={handleOpenSidebar} />
              </ErrorBoundary>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminPanel />
              </AdminRoute>
            }
          />
        </Routes>
      </div>

      {/* Modals */}
      <PersonalityModal
        isOpen={isModalOpen}
        initialData={current}
        onClose={handleCloseModal}
        onSave={handleSaveCharacter}
      />
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </div>
  );
}

function InnerApp() {
  const [toast, setToast] = useState(null);

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
                  <ProtectedContent />
                </CharacterProvider>
              </PrivateRoute>
            }
          />
        </Routes>

        {/* Toast notifications */}
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
          <InnerApp />
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
