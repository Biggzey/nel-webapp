import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export function useChat() {
  const { token } = useAuth();
  const { t } = useLanguage();

  const clearChat = async (characterId, onSuccess, onError) => {
    // Show confirmation dialog
    if (!window.confirm(t('chat.confirmClear'))) {
      return;
    }

    try {
      const res = await fetch(`/api/chat/${characterId}`, {
        method: "DELETE",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('Clear chat error:', errorData);
        throw new Error(errorData.error || t('errors.serverError'));
      }

      // Call success callback with toast data
      onSuccess?.({
        type: 'success',
        message: t('chat.chatCleared'),
        duration: 3000
      });

    } catch (error) {
      console.error('Error clearing chat:', error);
      // Call error callback with toast data
      onError?.({
        type: 'error',
        message: error.message || t('errors.serverError'),
        duration: 5000
      });
    }
  };

  return {
    clearChat
  };
} 