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
  const [currentCharacterIndex, setCurrentCharacterIndex] = useState(0);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
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

  // Navigation handlers for carousel
  const handlePrev = () => {
    setCurrentCharacterIndex(prev => (prev > 0 ? prev - 1 : pendingCharacters.length - 1));
  };

  const handleNext = () => {
    setCurrentCharacterIndex(prev => (prev < pendingCharacters.length - 1 ? prev + 1 : 0));
  };

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
      setShowReviewModal(false);
    } catch (err) {
      addToast({ type: 'error', message: err.message, duration: 4000 });
    }
  }

  async function handleReject(id) {
    try {
      const res = await fetch(`/api/admin/characters/${id}/reject`, {
        method: 'PUT',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: rejectReason })
      });
      if (!res.ok) throw new Error('Failed to reject character');
      setPendingCharacters(prev => prev.filter(c => c.id !== id));
      addToast({ type: 'success', message: 'Character rejected', duration: 3000 });
      setShowReviewModal(false);
      setShowRejectModal(false);
      setRejectReason('');
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
    <div className="flex h-screen bg-background-light dark:bg-background-dark">
      <AdminSidebar
        onUserSelect={setSelectedUserId}
        selectedUserId={selectedUserId}
      />
      <main className="flex-1 flex flex-col min-h-0 bg-background-light dark:bg-background-dark overflow-y-auto">
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
          <div className="flex-1 flex flex-col p-6">
            {/* System overview and pending public characters go here */}
            {systemStats && (
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
                  {/* Pending Public Characters - Carousel */}
                  <div className="bg-background-container-light dark:bg-background-container-dark rounded-2xl border-2 border-primary/20 shadow-md p-4">
                    <h2 className="text-xl font-semibold mb-3 text-primary">Pending Public Characters</h2>
                    {loadingPending ? (
                      <div className="text-text-secondary-light dark:text-text-secondary-dark">Loading...</div>
                    ) : errorPending ? (
                      <div className="text-red-500">{errorPending}</div>
                    ) : pendingCharacters.length === 0 ? (
                      <div className="text-text-secondary-light dark:text-text-secondary-dark">No pending characters for review.</div>
                    ) : (
                      <div className="relative">
                        {/* Navigation Arrows */}
                        <button
                          onClick={handlePrev}
                          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 p-2 rounded-full bg-primary/20 hover:bg-primary/30 text-primary transition-colors"
                        >
                          <i className="fas fa-chevron-left" />
                        </button>
                        <button
                          onClick={handleNext}
                          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 p-2 rounded-full bg-primary/20 hover:bg-primary/30 text-primary transition-colors"
                        >
                          <i className="fas fa-chevron-right" />
                        </button>

                        {/* Character Card */}
                        <div 
                          className="relative bg-background-container-light dark:bg-background-container-dark rounded-xl border border-primary/20 shadow flex flex-col items-center p-4 cursor-pointer hover:shadow-lg transition-shadow"
                          onClick={() => setShowReviewModal(true)}
                        >
                          <img
                            src={pendingCharacters[currentCharacterIndex]?.avatar || '/default-avatar.png'}
                            alt={pendingCharacters[currentCharacterIndex]?.name}
                            className="w-24 h-24 rounded-full object-cover mb-3 border-2 border-primary/30 shadow"
                            onError={e => { e.target.onerror = null; e.target.src = '/default-avatar.png'; }}
                          />
                          <h3 className="text-xl font-semibold mb-1 text-primary">{pendingCharacters[currentCharacterIndex]?.name}</h3>
                          <div className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-2">{pendingCharacters[currentCharacterIndex]?.tagline}</div>
                          <div className="flex flex-wrap gap-1 justify-center mb-2">
                            {(pendingCharacters[currentCharacterIndex]?.tags || []).map(tag => (
                              <span key={tag} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">{tag}</span>
                            ))}
                          </div>
                          <div className="text-xs text-gray-500">By: {pendingCharacters[currentCharacterIndex]?.user?.username || pendingCharacters[currentCharacterIndex]?.user?.email || 'Unknown'}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Review Modal */}
        {showReviewModal && pendingCharacters[currentCharacterIndex] && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background-container-light dark:bg-background-container-dark rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-semibold">Review Character</h2>
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <i className="fas fa-times" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* Left Column - Images */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Avatar</h3>
                    <img
                      src={pendingCharacters[currentCharacterIndex].avatar || '/default-avatar.png'}
                      alt="Avatar"
                      className="w-32 h-32 rounded-full object-cover border-2 border-primary/30"
                    />
                  </div>
                  {pendingCharacters[currentCharacterIndex].fullImage && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Full Image</h3>
                      <img
                        src={pendingCharacters[currentCharacterIndex].fullImage}
                        alt="Full Image"
                        className="w-full rounded-lg border-2 border-primary/30"
                      />
                    </div>
                  )}
                </div>

                {/* Right Column - Details */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Basic Info</h3>
                    <dl className="space-y-2">
                      <div>
                        <dt className="text-sm text-gray-500">Name</dt>
                        <dd className="font-medium">{pendingCharacters[currentCharacterIndex].name}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-gray-500">Age</dt>
                        <dd className="font-medium">{pendingCharacters[currentCharacterIndex].age || 'N/A'}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-gray-500">Gender</dt>
                        <dd className="font-medium">{pendingCharacters[currentCharacterIndex].gender || 'N/A'}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-gray-500">Race</dt>
                        <dd className="font-medium">{pendingCharacters[currentCharacterIndex].race || 'N/A'}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-gray-500">Occupation</dt>
                        <dd className="font-medium">{pendingCharacters[currentCharacterIndex].occupation || 'N/A'}</dd>
                      </div>
                    </dl>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-2">Personality</h3>
                    <dl className="space-y-2">
                      <div>
                        <dt className="text-sm text-gray-500">Description</dt>
                        <dd className="font-medium">{pendingCharacters[currentCharacterIndex].description || 'N/A'}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-gray-500">Backstory</dt>
                        <dd className="font-medium">{pendingCharacters[currentCharacterIndex].backstory || 'N/A'}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-gray-500">Likes</dt>
                        <dd className="font-medium">{pendingCharacters[currentCharacterIndex].likes || 'N/A'}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-gray-500">Dislikes</dt>
                        <dd className="font-medium">{pendingCharacters[currentCharacterIndex].dislikes || 'N/A'}</dd>
                      </div>
                    </dl>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-2">System Configuration</h3>
                    <dl className="space-y-2">
                      <div>
                        <dt className="text-sm text-gray-500">System Prompt</dt>
                        <dd className="font-medium whitespace-pre-wrap">{pendingCharacters[currentCharacterIndex].systemPrompt || 'N/A'}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-gray-500">Custom Instructions</dt>
                        <dd className="font-medium whitespace-pre-wrap">{pendingCharacters[currentCharacterIndex].customInstructions || 'N/A'}</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-4 mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowReviewModal(false);
                    setShowRejectModal(true);
                  }}
                  className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                >
                  Decline
                </button>
                <button
                  onClick={() => handleApprove(pendingCharacters[currentCharacterIndex].id)}
                  className="px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors"
                >
                  Approve
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reject Modal */}
        {showRejectModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background-container-light dark:bg-background-container-dark rounded-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-semibold mb-4">Decline Character</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Reason for Decline</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full p-2 border rounded bg-background-container-light dark:bg-background-container-dark border-border-light dark:border-border-dark focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                  rows={4}
                  placeholder="Please provide a reason for declining this character..."
                />
              </div>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectReason('');
                  }}
                  className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleReject(pendingCharacters[currentCharacterIndex].id)}
                  className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                  disabled={!rejectReason.trim()}
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
} 