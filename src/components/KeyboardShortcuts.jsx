import { useEffect } from 'react';

export default function KeyboardShortcuts({ chatInputRef, onSendMessage, onOpenSettings, onToggleSidebar, onToggleCharacterPane, onRegenerate, onNavigateCharacter, onFocusSearch, onShowShortcutHelp }) {
  useEffect(() => {
    function handleKeyDown(e) {
      const active = document.activeElement;
      const isInput = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);

      // --- Chat input shortcuts ---
      if (chatInputRef && chatInputRef.current && document.activeElement === chatInputRef.current) {
        // Enter to send, Shift+Enter for newline
        if (e.key === 'Enter' && !e.shiftKey && !e.altKey) {
          e.preventDefault();
          onSendMessage && onSendMessage();
          return;
        }
        // Shift+Enter: allow default (newline)
      }

      // --- Global shortcuts (Alt-based) ---
      // Alt+/
      if (e.altKey && e.key === '/') {
        e.preventDefault();
        onShowShortcutHelp && onShowShortcutHelp();
        return;
      }
      // Alt+S
      if (e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        onFocusSearch && onFocusSearch();
        return;
      }
      // Alt+,
      if (e.altKey && e.key === ',') {
        e.preventDefault();
        onOpenSettings && onOpenSettings();
        return;
      }
      // Alt+B
      if (e.altKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        onToggleSidebar && onToggleSidebar();
        return;
      }
      // Alt+C
      if (e.altKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        onToggleCharacterPane && onToggleCharacterPane();
        return;
      }
      // Alt+R
      if (e.altKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        onRegenerate && onRegenerate();
        return;
      }
      // Alt+ArrowUp
      if (e.altKey && e.key === 'ArrowUp') {
        e.preventDefault();
        onNavigateCharacter && onNavigateCharacter(-1);
        return;
      }
      // Alt+ArrowDown
      if (e.altKey && e.key === 'ArrowDown') {
        e.preventDefault();
        onNavigateCharacter && onNavigateCharacter(1);
        return;
      }
      // Esc: close modals, unfocus input, etc.
      if (e.key === 'Escape') {
        // Implement modal close/unfocus logic as needed
        return;
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [chatInputRef, onSendMessage, onOpenSettings, onToggleSidebar, onToggleCharacterPane, onRegenerate, onNavigateCharacter, onFocusSearch, onShowShortcutHelp]);
  return null;
} 