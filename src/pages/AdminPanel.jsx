import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../components/Toast';
import AdminSidebar from '../components/AdminSidebar';
import { useNavigate } from 'react-router-dom';

export default function AdminPanel() {
  const { token } = useAuth();
  const { t } = useLanguage();
  const { addToast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [systemStats, setSystemStats] = useState(null);
  const [pendingCharacters, setPendingCharacters] = useState([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [errorPending, setErrorPending] = useState(null);
  const navigate = useNavigate();

  // Load user details when selected
  useEffect(() => {
    if (!selectedUserId) {
      setUserDetails(null);
      return;
    }

    async function loadUserDetails() {
    try {
        const res = await fetch(`/api/admin/users/${selectedUserId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
        if (!res.ok) throw new Error('Failed to load user details');
        const data = await res.json();
        setUserDetails(data);
      } catch (error) {
        console.error('Error loading user details:', error);
      addToast({
        type: 'error',
          message: 'Failed to load user details',
          duration: 5000
        });
        // Mock user details
        setUserDetails({
          id: selectedUserId,
          username: 'MockUser',
          email: 'mockuser@example.com',
          avatar: '/user-avatar.png',
          role: 'user',
          blocked: false,
          online: false,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          stats: {
            totalMessages: 42,
            charactersCreated: 2,
            activeSessions: 1
          },
          activity: [
            { icon: 'comment', color: 'blue', description: 'Sent a message', timestamp: new Date().toISOString() },
            { icon: 'user', color: 'green', description: 'Logged in', timestamp: new Date().toISOString() }
          ]
        });
      }
    }

    loadUserDetails();
  }, [selectedUserId, token, addToast]);

  // Load system stats when no user is selected
  useEffect(() => {
    if (selectedUserId) {
      setSystemStats(null);
      return;
    }

    async function loadSystemStats() {
      try {
        const res = await fetch('/api/admin/metrics', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (!res.ok) throw new Error('Failed to load system stats');
        const data = await res.json();
        setSystemStats(data);
      } catch (error) {
        console.error('Error loading system stats:', error);
        addToast({
          type: 'error',
          message: 'Failed to load system stats',
          duration: 5000
        });
      }
    }

    loadSystemStats();
  }, [selectedUserId, token, addToast]);

  // Load user metrics when a user is selected
  useEffect(() => {
    if (!selectedUserId) {
      setUserDetails(prev => prev ? { ...prev, metrics: null } : null);
      return;
    }

    async function loadUserMetrics() {
      try {
        const res = await fetch(`/api/admin/users/${selectedUserId}/metrics`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (!res.ok) throw new Error('Failed to load user metrics');
        const data = await res.json();
        setUserDetails(prev => prev ? { ...prev, metrics: data } : null);
      } catch (error) {
        console.error('Error loading user metrics:', error);
        addToast({
          type: 'error',
          message: 'Failed to load user metrics',
          duration: 5000
        });
      }
    }

    loadUserMetrics();
  }, [selectedUserId, token, addToast]);

  // Fetch pending public characters for review
  useEffect(() => {
    if (selectedUserId) return; // Only show in system overview
    async function fetchPending() {
      setLoadingPending(true);
      setErrorPending(null);
      try {
        const res = await fetch('/api/admin/pending-characters', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch pending characters');
        const data = await res.json();
        setPendingCharacters(data);
      } catch (err) {
        setErrorPending(err.message);
      } finally {
        setLoadingPending(false);
      }
    }
    fetchPending();
  }, [selectedUserId, token]);

  // Approve/reject handlers
  async function handleApprove(id) {
    try {
      const res = await fetch(`/api/admin/characters/${id}/approve`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to approve character');
      setPendingCharacters(prev => prev.filter(c => c.id !== id));
      addToast({ type: 'success', message: 'Character approved', duration: 3000 });
    } catch (err) {
      addToast({ type: 'error', message: err.message, duration: 4000 });
    }
  }
  async function handleReject(id) {
    try {
      const res = await fetch(`/api/admin/characters/${id}/reject`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to reject character');
      setPendingCharacters(prev => prev.filter(c => c.id !== id));
      addToast({ type: 'success', message: 'Character rejected', duration: 3000 });
    } catch (err) {
      addToast({ type: 'error', message: err.message, duration: 4000 });
    }
  }

  // Helper to determine online status
  function isUserOnline(user) {
    if (!user.lastLogin) return false;
    const lastLogin = new Date(user.lastLogin);
    return Date.now() - lastLogin.getTime() < 5 * 60 * 1000; // 5 minutes
  }

  return (
    <div className="flex h-screen">
      <AdminSidebar
        onUserSelect={setSelectedUserId}
        selectedUserId={selectedUserId}
      />
      
      <main className="flex-1 p-6 overflow-y-auto">
        {selectedUserId ? (
          // User details view
          userDetails && (
            <div className="space-y-6">
              {/* User-specific cleanup button (admin only) */}
              <div className="flex flex-col space-y-2 mb-4">
                <button
                  className="px-4 py-2 rounded-lg bg-primary text-white shadow transition-colors hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-primary"
                  onClick={async () => {
                    try {
                      const res = await fetch(`/api/admin/cleanup-duplicates?userId=${selectedUserId}`, {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${token}` }
                      });
                      const data = await res.json();
                      if (res.ok) {
                        addToast({
                          type: 'success',
                          message: data.message,
                          duration: 4000
                        });
                      } else {
                        throw new Error(data.error || 'Unknown error');
                      }
                    } catch (err) {
                      addToast({
                        type: 'error',
                        message: t('admin.duplicateCleanupFailed', { error: err.message }),
                        duration: 5000
                      });
                    }
                  }}
                >
                  {t('admin.removeDuplicatesUser')}
                </button>
                <button
                  className="px-4 py-2 rounded-lg bg-blue-500 text-white shadow transition-colors hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onClick={async () => {
                    try {
                      const res = await fetch(`/api/admin/users/${selectedUserId}/reset-onboarding`, {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${token}` }
                      });
                      if (res.ok) {
                        addToast({
                          type: 'success',
                          message: 'Onboarding reset successfully',
                          duration: 4000
                        });
                      } else {
                        const data = await res.json();
                        throw new Error(data.error || 'Unknown error');
                      }
                    } catch (err) {
                      addToast({
                        type: 'error',
                        message: 'Failed to reset onboarding: ' + err.message,
                        duration: 5000
                      });
                    }
                  }}
                >
                  Reset Onboarding
                </button>
              </div>
              <div className="flex items-center space-x-4">
                <img
                  src={userDetails.avatar || '/user-avatar.png'}
                  alt=""
                  className="w-20 h-20 rounded-full object-cover ring-2 ring-primary"
                />
                <div>
                  <h1 className="text-2xl font-bold">{userDetails.username}</h1>
                  <p className="text-gray-500">{userDetails.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Info */}
                <div className="bg-background-container-light dark:bg-background-container-dark rounded-xl border-2 border-container-border-light dark:border-container-border-dark shadow-lg shadow-container-shadow-light dark:shadow-container-shadow-dark p-6">
                  <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm text-gray-500">Role</dt>
                      <dd className="font-medium">
                        {userDetails.role === 'SUPER_ADMIN' ? (
                          <span className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold">SUPER_ADMIN</span>
                        ) : (
                          <select
                            value={userDetails.role}
                            onChange={async (e) => {
                              try {
                                const res = await fetch(`/api/admin/users/${selectedUserId}/role`, {
                                  method: 'PATCH',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    Authorization: `Bearer ${token}`
                                  },
                                  body: JSON.stringify({ role: e.target.value })
                                });
                                if (!res.ok) throw new Error('Failed to update role');
                                addToast({
                                  type: 'success',
                                  message: 'Role updated successfully',
                                  duration: 3000
                                });
                                // Refresh user details after role update
                                const updated = await fetch(`/api/admin/users/${selectedUserId}`, {
                                  headers: { Authorization: `Bearer ${token}` }
                                });
                                if (updated.ok) {
                                  const data = await updated.json();
                                  setUserDetails(prev => ({ ...prev, ...data }));
                                }
                              } catch (error) {
                                console.error('Error updating role:', error);
                                addToast({
                                  type: 'error',
                                  message: 'Failed to update role',
                                  duration: 5000
                                });
                              }
                            }}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                          >
                            <option value="USER">User</option>
                            <option value="MODERATOR">Moderator</option>
                            <option value="ADMIN">Admin</option>
                          </select>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">Status</dt>
                      <dd className="font-medium">
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            userDetails.blocked ? 'bg-red-100 text-red-800' :
                            isUserOnline(userDetails) ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {userDetails.blocked ? t('admin.blocked') :
                             isUserOnline(userDetails) ? t('admin.online') : t('admin.offline')}
                          </span>
                          {userDetails.blocked && userDetails.blockedUntil && (
                            <span className="text-sm text-gray-500">
                              until {new Date(userDetails.blockedUntil).toLocaleString()}
                            </span>
                          )}
                        </div>
                        {!userDetails.blocked && (
                          <div className="mt-2">
                            <select
                              onChange={async (e) => {
                                try {
                                  const res = await fetch(`/api/admin/users/${selectedUserId}/block`, {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      Authorization: `Bearer ${token}`
                                    },
                                    body: JSON.stringify({ duration: e.target.value })
                                  });
                                  if (!res.ok) throw new Error('Failed to block user');
                                  const data = await res.json();
                                  setUserDetails(prev => ({
                                    ...prev,
                                    blocked: true,
                                    blockedUntil: data.blockedUntil
                                  }));
                                  addToast({
                                    type: 'success',
                                    message: 'User blocked successfully',
                                    duration: 3000
                                  });
                                } catch (error) {
                                  console.error('Error blocking user:', error);
                                  addToast({
                                    type: 'error',
                                    message: 'Failed to block user',
                                    duration: 5000
                                  });
                                }
                              }}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                            >
                              <option value="">Block user for...</option>
                              <option value="1h">1 Hour</option>
                              <option value="24h">24 Hours</option>
                              <option value="7d">7 Days</option>
                              <option value="permanent">Permanent</option>
                            </select>
                          </div>
                        )}
                        {userDetails.blocked && (
                          <button
                            onClick={async () => {
                              try {
                                const res = await fetch(`/api/admin/users/${selectedUserId}/unblock`, {
                                  method: 'POST',
                                  headers: {
                                    Authorization: `Bearer ${token}`
                                  }
                                });
                                if (!res.ok) throw new Error('Failed to unblock user');
                                setUserDetails(prev => ({
                                  ...prev,
                                  blocked: false,
                                  blockedUntil: null
                                }));
                                addToast({
                                  type: 'success',
                                  message: 'User unblocked successfully',
                                  duration: 3000
                                });
                              } catch (error) {
                                console.error('Error unblocking user:', error);
                                addToast({
                                  type: 'error',
                                  message: 'Failed to unblock user',
                                  duration: 5000
                                });
                              }
                            }}
                            className="mt-2 text-sm text-red-600 hover:text-red-800"
                          >
                            Unblock User
                          </button>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">Joined</dt>
                      <dd className="font-medium">
                        {new Date(userDetails.createdAt).toLocaleDateString()}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">Last Login</dt>
                      <dd className="font-medium">
                        {userDetails.lastLogin
                          ? new Date(userDetails.lastLogin).toLocaleString()
                          : 'Never'}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* User Metrics */}
                {userDetails.metrics && (
                  <div className="bg-background-container-light dark:bg-background-container-dark rounded-xl p-6">
                    <h2 className="text-xl font-semibold mb-4">User Metrics</h2>
                    <dl className="space-y-3">
                      <div>
                        <dt className="text-sm text-gray-500">Total Messages</dt>
                        <dd className="font-medium">{userDetails.metrics.totalMessages}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-gray-500">Characters Created</dt>
                        <dd className="font-medium">{userDetails.metrics.charactersCreated}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-gray-500">Active Sessions</dt>
                        <dd className="font-medium">{userDetails.metrics.activeSessions}</dd>
                      </div>
                    </dl>
                  </div>
                )}

                {/* Recent Activity */}
                {userDetails.metrics && (
                  <div className="bg-background-container-light dark:bg-background-container-dark rounded-xl p-6 md:col-span-2">
                    <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
                    <div className="space-y-4">
                      {userDetails.metrics.recentActivity?.map((activity, index) => (
                        <div
                          key={index}
                          className="flex items-center space-x-4 p-3 rounded-lg bg-background-light dark:bg-background-dark"
                        >
                          <i className={`fas fa-${activity.type === 'message' ? 'comment' : 'user'} text-primary`} />
                          <div className="flex-1">
                            <p className="font-medium">{activity.description || activity.type}</p>
                            <p className="text-sm text-gray-500">
                              {activity.timestamp
                                ? new Date(activity.timestamp).toLocaleString()
                                : activity.createdAt
                                  ? new Date(activity.createdAt).toLocaleString()
                                  : ''}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        ) : (
          // System overview
          systemStats && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold mb-6">{t('admin.systemOverview')}</h1>
              {/* Universal cleanup button for all users */}
              <button
                className="mb-4 px-4 py-2 rounded-lg bg-primary text-white shadow transition-colors hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-primary"
                onClick={async () => {
                  try {
                    const res = await fetch(`/api/admin/cleanup-duplicates`, {
                      method: 'POST',
                      headers: { Authorization: `Bearer ${token}` }
                    });
                    const data = await res.json();
                    if (res.ok) {
                      addToast({
                        type: 'success',
                        message: data.message,
                        duration: 4000
                      });
                    } else {
                      throw new Error(data.error || 'Unknown error');
                    }
                  } catch (err) {
                    addToast({
                      type: 'error',
                      message: t('admin.duplicateCleanupFailed', { error: err.message }),
                      duration: 5000
                    });
                  }
                }}
              >
                {t('admin.removeDuplicatesAll')}
              </button>
              {/* 4-column grid for stats and pending characters */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-5xl mx-auto">
                {/* User Stats */}
                <div className="bg-background-container-light dark:bg-background-container-dark rounded-2xl border-2 border-primary/20 shadow-md p-4 flex flex-col items-center">
                  <h2 className="text-xl font-semibold mb-3">Users</h2>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm text-gray-500">Total Users</dt>
                      <dd className="text-2xl font-bold">{systemStats.totalUsers}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">Active Now</dt>
                      <dd className="text-2xl font-bold">{systemStats.activeUsers}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">New Today</dt>
                      <dd className="text-2xl font-bold">{systemStats.newUsersToday}</dd>
                    </div>
                  </dl>
                </div>
                {/* Message Stats */}
                <div className="bg-background-container-light dark:bg-background-container-dark rounded-2xl border-2 border-primary/20 shadow-md p-4 flex flex-col items-center">
                  <h2 className="text-xl font-semibold mb-3">Messages</h2>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm text-gray-500">Total Messages</dt>
                      <dd className="text-2xl font-bold">{systemStats.totalMessages}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">Messages Today</dt>
                      <dd className="text-2xl font-bold">{systemStats.messagesToday}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">Avg per User</dt>
                      <dd className="text-2xl font-bold">{Math.round(systemStats.avgMessagesPerUser)}</dd>
                    </div>
                  </dl>
                </div>
                {/* Character Stats */}
                <div className="bg-background-container-light dark:bg-background-container-dark rounded-2xl border-2 border-primary/20 shadow-md p-4 flex flex-col items-center">
                  <h2 className="text-xl font-semibold mb-3">Characters</h2>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm text-gray-500">Total Characters</dt>
                      <dd className="text-2xl font-bold">{systemStats.totalCharacters}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">Created Today</dt>
                      <dd className="text-2xl font-bold">{systemStats.charactersCreatedToday}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">Avg per User</dt>
                      <dd className="text-2xl font-bold">{Math.round(systemStats.avgCharactersPerUser * 10) / 10}</dd>
                    </div>
                  </dl>
                </div>
                {/* Pending Public Characters */}
                <div className="bg-background-container-light dark:bg-background-container-dark rounded-2xl border-2 border-primary/20 shadow-md p-4 flex flex-col items-center">
                  <h2 className="text-xl font-semibold mb-3 text-primary">Pending Public Characters</h2>
                  {loadingPending ? (
                    <div className="text-text-secondary-light dark:text-text-secondary-dark">Loading...</div>
                  ) : errorPending ? (
                    <div className="text-red-500">{errorPending}</div>
                  ) : pendingCharacters.length === 0 ? (
                    <div className="text-text-secondary-light dark:text-text-secondary-dark">No pending characters for review.</div>
                  ) : (
                    <div className="flex flex-col gap-2 w-full">
                      {pendingCharacters.map(character => (
                        <div key={character.id} className="relative bg-background-container-light dark:bg-background-container-dark rounded-xl border border-primary/20 shadow flex flex-col items-center p-2">
                          <img
                            src={character.avatar || '/default-avatar.png'}
                            alt={character.name}
                            className="w-10 h-10 rounded-full object-cover mb-1 border-2 border-primary/30 shadow"
                            onError={e => { e.target.onerror = null; e.target.src = '/default-avatar.png'; }}
                          />
                          <h3 className="text-base font-semibold mb-0.5 text-primary">{character.name}</h3>
                          <div className="text-xs text-text-secondary-light dark:text-text-secondary-dark mb-0.5">{character.tagline}</div>
                          <div className="flex flex-wrap gap-1 justify-center mb-0.5">
                            {(character.tags || []).map(tag => (
                              <span key={tag} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">{tag}</span>
                            ))}
                          </div>
                          <div className="mb-0.5 text-xs text-gray-500">By: {character.user?.username || character.user?.email || 'Unknown'}</div>
                          <div className="flex gap-2 mt-1">
                            <button
                              className="px-2 py-0.5 rounded-lg bg-green-500 text-white hover:bg-green-600 text-xs"
                              onClick={() => handleApprove(character.id)}
                            >Approve</button>
                            <button
                              className="px-2 py-0.5 rounded-lg bg-red-500 text-white hover:bg-red-600 text-xs"
                              onClick={() => handleReject(character.id)}
                            >Reject</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        )}
      </main>
    </div>
  );
} 