import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { useNotifications } from '../context/NotificationContext';

export default function Notifications({ modalMode = false }) {
  const { t } = useLanguage();
  const { addToast } = useToast();
  const { notifications, loading, markAsRead, markAllAsRead, deleteNotification, fetchNotifications } = useNotifications();
  const [localLoading, setLocalLoading] = useState(false);

  useEffect(() => {
    if (modalMode) fetchNotifications();
    // eslint-disable-next-line
  }, [modalMode]);

  // Sort unread notifications to the top in modal mode
  const sortedNotifications = modalMode
    ? [...notifications].sort((a, b) => (a.read === b.read ? 0 : a.read ? 1 : -1))
    : notifications;

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className={modalMode ? 'w-full max-w-lg' : 'relative'}>
      {!modalMode && (
        <button
          onClick={fetchNotifications}
          className="hidden" // dropdown auto-fetches, but button for future
        />
      )}
      <div className={modalMode ? '' : 'absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg z-50'}>
        <div className="p-4 border-b">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">{t('notifications.title', 'Notifications')}</h3>
            {notifications.length > 0 && (
              <button
                onClick={async () => {
                  setLocalLoading(true);
                  await markAllAsRead();
                  setLocalLoading(false);
                }}
                className="text-sm text-blue-600 hover:text-blue-800"
                disabled={localLoading}
              >
                {t('notifications.markAllRead', 'Mark all as read')}
              </button>
            )}
          </div>
        </div>
        <div className={modalMode ? 'max-h-[60vh] overflow-y-auto' : 'max-h-96 overflow-y-auto'}>
          {loading || localLoading ? (
            <div className="p-4 text-center text-gray-500">
              <i className="fas fa-spinner fa-spin mr-2" />
              {t('notifications.loading', 'Loading notifications...')}
            </div>
          ) : sortedNotifications.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {t('notifications.empty', 'No notifications')}
            </div>
          ) : (
            sortedNotifications.map(notification => (
              <div
                key={notification.id}
                className={`p-4 border-b hover:bg-gray-50 ${!notification.read ? 'bg-blue-50' : ''}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-semibold">{notification.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(notification.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex space-x-2 ml-4">
                    {!notification.read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="text-blue-600 hover:text-blue-800"
                        title={t('notifications.markAsRead', 'Mark as read')}
                      >
                        <i className="fas fa-check" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notification.id)}
                      className="text-red-600 hover:text-red-800"
                      title={t('notifications.delete', 'Delete')}
                    >
                      <i className="fas fa-trash" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
} 