import { useEffect } from 'react';

export default function KeyboardShortcuts({ chatInputRef, onSendMessage, onOpenSettings, onToggleSidebar, onToggleCharacterPane, onRegenerate, onFocusSearch }) {
  useEffect(() => {
    function handleKeyDown(e) {
      // If a modal or input is focused, skip some shortcuts
      const active = document.activeElement;
      const isInput = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);

      // --- Chat input shortcuts ---
      if (chatInputRef && chatInputRef.current && document.activeElement === chatInputRef.current) {
        // Enter to send, Shift+Enter for newline
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          onSendMessage && onSendMessage();
          return;
        }
        // Shift+Enter: allow default (newline)
      }

      // --- Global shortcuts ---
      // Ctrl+K or /
      if ((e.ctrlKey && e.key.toLowerCase() === 'k') || (e.key === '/' && !isInput)) {
        e.preventDefault();
        onFocusSearch && onFocusSearch();
        return;
      }
      // Ctrl+,
      if (e.ctrlKey && e.key === ',') {
        e.preventDefault();
        onOpenSettings && onOpenSettings();
        return;
      }
      // Ctrl+Shift+N
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        // Could trigger new chat/character
        // Implement as needed
        return;
      }
      // Ctrl+ArrowUp/ArrowDown
      if (e.ctrlKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault();
        // Could trigger chat/character navigation
        // Implement as needed
        return;
      }
      // Ctrl+R
      if (e.ctrlKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        onRegenerate && onRegenerate();
        return;
      }
      // Ctrl+Shift+C
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        onToggleCharacterPane && onToggleCharacterPane();
        return;
      }
      // Ctrl+B (optional: toggle sidebar)
      if (e.ctrlKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        onToggleSidebar && onToggleSidebar();
        return;
      }
      // Ctrl+/ or ? (show shortcut help)
      if ((e.ctrlKey && e.key === '/') || (e.key === '?' && !isInput)) {
        e.preventDefault();
        // Could open a shortcut help modal
        // Implement as needed
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
  }, [chatInputRef, onSendMessage, onOpenSettings, onToggleSidebar, onToggleCharacterPane, onRegenerate, onFocusSearch]);
  return null;
} 