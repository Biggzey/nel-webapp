import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const { token, fetchWithAuth } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/notifications');
      if (!res.ok) throw new Error('Failed to fetch notifications');
      const data = await res.json();
      setNotifications(data);
    } catch (err) {
      // Optionally handle error
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchNotifications();
    // Optionally, poll every X seconds for new notifications
    // const interval = setInterval(fetchNotifications, 60000);
    // return () => clearInterval(interval);
  }, [fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Mark as read
  const markAsRead = async (id) => {
    try {
      const res = await fetchWithAuth(`/api/notifications/${id}/read`, { method: 'PATCH' });
      if (!res.ok) throw new Error('Failed to mark as read');
      setNotifications(notifications => notifications.map(n => n.id === id ? { ...n, read: true } : n));
    } catch {}
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const res = await fetchWithAuth('/api/notifications/read-all', { method: 'PATCH' });
      if (!res.ok) throw new Error('Failed to mark all as read');
      setNotifications(notifications => notifications.map(n => ({ ...n, read: true })));
    } catch {}
  };

  // Delete notification
  const deleteNotification = async (id) => {
    try {
      const res = await fetchWithAuth(`/api/notifications/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete notification');
      setNotifications(notifications => notifications.filter(n => n.id !== id));
    } catch {}
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, loading, fetchNotifications, markAsRead, markAllAsRead, deleteNotification }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
} 