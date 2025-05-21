import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../components/Toast';
import AdminSidebar from '../components/AdminSidebar';
import { useNavigate } from 'react-router-dom';
import DatabaseExportPanel from '../components/DatabaseExportPanel';

export default function AdminPanel() {
  const { token, userRole } = useAuth();
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
  const [showRejectAllModal, setShowRejectAllModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const navigate = useNavigate();
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);

  // Restrict access to admin panel
  if (!['SUPER_ADMIN', 'ADMIN', 'MODERATOR'].includes(String(userRole))) {
    return <div style={{ color: 'red', fontWeight: 'bold', padding: 32, fontSize: '2rem' }}>Access denied</div>;
  }

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
        method: 'POST',
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
        method: 'POST',
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
    <>
      <div className="flex h-screen w-full bg-background-light dark:bg-background-dark">
        <AdminSidebar
          onUserSelect={setSelectedUserId}
          selectedUserId={selectedUserId}
          refreshKey={sidebarRefreshKey}
        />
        <main className="w-full flex-1 bg-background-light dark:bg-background-dark overflow-y-auto">
          <div className="flex-1 p-6 md:p-8">
            <div className="w-full max-w-5xl mx-auto px-8 flex flex-col gap-8">
              {selectedUserId ? (
                <div className="space-y-6">
                  {!userDetails ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="loader border-4 border-primary border-t-transparent rounded-full w-12 h-12 animate-spin" />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <img
                            src={userDetails.avatar || '/user-avatar.png'}
                            alt=""
                            className="w-20 h-20 rounded-full object-cover ring-2 ring-primary"
                            onError={e => { e.target.onerror = null; e.target.src = '/user-avatar.png'; }}
                          />
                          <div>
                            <h1 className="text-2xl font-bold">{userDetails.username}</h1>
                            <p className="text-gray-500">{userDetails.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            className="px-4 py-2 rounded-lg bg-red-500 text-white shadow transition-colors hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                            onClick={async () => {
                              try {
                                const res = await fetch(`/api/admin/users/${selectedUserId}/block`, {
                                  method: 'POST',
                                  headers: { Authorization: `Bearer ${token}` }
                                });
                                if (res.ok) {
                                  addToast({
                                    type: 'success',
                                    message: 'User blocked successfully',
                                    duration: 4000
                                  });
                                  // Refresh user details
                                  const updated = await fetch(`/api/admin/users/${selectedUserId}`, {
                                    headers: { Authorization: `Bearer ${token}` }
                                  });
                                  if (updated.ok) {
                                    const data = await updated.json();
                                    setUserDetails(data);
                                  }
                                } else {
                                  throw new Error('Failed to block user');
                                }
                              } catch (err) {
                                addToast({
                                  type: 'error',
                                  message: 'Failed to block user: ' + err.message,
                                  duration: 5000
                                });
                              }
                            }}
                          >
                            {userDetails.blocked ? 'Unblock User' : 'Block User'}
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
                                  throw new Error('Failed to reset onboarding');
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
                                  <span className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold">SUPER ADMIN</span>
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
                                        // Refresh user details
                                        const updated = await fetch(`/api/admin/users/${selectedUserId}`, {
                                          headers: { Authorization: `Bearer ${token}` }
                                        });
                                        if (updated.ok) {
                                          const data = await updated.json();
                                          setUserDetails(data);
                                        }
                                        // Refresh sidebar by updating a dummy state
                                        setSidebarRefreshKey(prev => prev + 1);
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
                                    {userDetails.blocked ? 'Blocked' :
                                     isUserOnline(userDetails) ? 'Online' : 'Offline'}
                                  </span>
                                  {userDetails.blocked && userDetails.blockedUntil && (
                                    <span className="text-sm text-gray-500">
                                      until {new Date(userDetails.blockedUntil).toLocaleString()}
                                    </span>
                                  )}
                                </div>
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
                        <div className="bg-background-container-light dark:bg-background-container-dark rounded-xl border-2 border-container-border-light dark:border-container-border-dark shadow-lg shadow-container-shadow-light dark:shadow-container-shadow-dark p-6">
                          <h2 className="text-xl font-semibold mb-4">User Metrics</h2>
                          <dl className="space-y-3">
                            <div>
                              <dt className="text-sm text-gray-500">Total Messages</dt>
                              <dd className="font-medium">{userDetails.metrics?.totalMessages || 0}</dd>
                            </div>
                            <div>
                              <dt className="text-sm text-gray-500">Characters Created</dt>
                              <dd className="font-medium">{userDetails.metrics?.charactersCreated || 0}</dd>
                            </div>
                            <div>
                              <dt className="text-sm text-gray-500">Active Sessions</dt>
                              <dd className="font-medium">{userDetails.metrics?.activeSessions || 0}</dd>
                            </div>
                          </dl>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="w-full px-8 flex flex-col gap-8">
                  {/* System Stats Grid */}
                  {systemStats ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                      <div className="bg-background-container-light dark:bg-background-container-dark rounded-2xl border-2 border-primary/20 shadow-md p-4">
                        <h2 className="text-lg font-semibold mb-2">Total Users</h2>
                        <div className="text-3xl font-bold">{systemStats.totalUsers ?? 'N/A'}</div>
                      </div>
                      <div className="bg-background-container-light dark:bg-background-container-dark rounded-2xl border-2 border-primary/20 shadow-md p-4">
                        <h2 className="text-lg font-semibold mb-2">Active Now</h2>
                        <div className="text-3xl font-bold">{systemStats.activeUsers ?? 'N/A'}</div>
                      </div>
                      <div className="bg-background-container-light dark:bg-background-container-dark rounded-2xl border-2 border-primary/20 shadow-md p-4">
                        <h2 className="text-lg font-semibold mb-2">New Today</h2>
                        <div className="text-3xl font-bold">{systemStats.newUsersToday ?? 'N/A'}</div>
                      </div>
                      <div className="bg-background-container-light dark:bg-background-container-dark rounded-2xl border-2 border-primary/20 shadow-md p-4">
                        <h2 className="text-lg font-semibold mb-2">Total Messages</h2>
                        <div className="text-3xl font-bold">{systemStats.totalMessages ?? 'N/A'}</div>
                      </div>
                      <div className="bg-background-container-light dark:bg-background-container-dark rounded-2xl border-2 border-primary/20 shadow-md p-4">
                        <h2 className="text-lg font-semibold mb-2">Messages Today</h2>
                        <div className="text-3xl font-bold">{systemStats.messagesToday ?? 'N/A'}</div>
                      </div>
                      <div className="bg-background-container-light dark:bg-background-container-dark rounded-2xl border-2 border-primary/20 shadow-md p-4">
                        <h2 className="text-lg font-semibold mb-2">Total Characters</h2>
                        <div className="text-3xl font-bold">{systemStats.totalCharacters ?? 'N/A'}</div>
                      </div>
                      <div className="bg-background-container-light dark:bg-background-container-dark rounded-2xl border-2 border-primary/20 shadow-md p-4">
                        <h2 className="text-lg font-semibold mb-2">Characters Created Today</h2>
                        <div className="text-3xl font-bold">{systemStats.charactersCreatedToday ?? 'N/A'}</div>
                      </div>
                      <div className="bg-background-container-light dark:bg-background-container-dark rounded-2xl border-2 border-primary/20 shadow-md p-4">
                        <h2 className="text-lg font-semibold mb-2">Avg Msgs/User</h2>
                        <div className="text-3xl font-bold">{systemStats.avgMessagesPerUser ? Math.round(systemStats.avgMessagesPerUser * 10) / 10 : 'N/A'}</div>
                      </div>
                      <div className="bg-background-container-light dark:bg-background-container-dark rounded-2xl border-2 border-primary/20 shadow-md p-4">
                        <h2 className="text-lg font-semibold mb-2">Avg Chars/User</h2>
                        <div className="text-3xl font-bold">{systemStats.avgCharactersPerUser ? Math.round(systemStats.avgCharactersPerUser * 10) / 10 : 'N/A'}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-32">
                      <div className="loader border-4 border-primary border-t-transparent rounded-full w-10 h-10 animate-spin" />
                      <span className="ml-4 text-text-secondary-light dark:text-text-secondary-dark">Loading system stats...</span>
                    </div>
                  )}

                  {/* Database Export Section */}
                  <div className="mt-8">
                    <DatabaseExportPanel />
                  </div>

                  {/* Pending Public Characters Section */}
                  <div className="bg-background-container-light dark:bg-background-container-dark rounded-2xl border-2 border-primary/20 shadow-md p-6 w-full relative">
                    <h2 className="text-xl font-semibold mb-3 text-primary">Pending Public Characters</h2>
                    {pendingCharacters.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', position: 'absolute', top: 8, right: 16, zIndex: 10 }}>
                        <span className="bg-red-600 text-white text-base font-bold px-3 py-1.5 rounded-full shadow-lg" style={{ minWidth: '2rem', minHeight: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {pendingCharacters.length}
                        </span>
                        {userRole === 'SUPER_ADMIN' && (
                          <button
                            onClick={() => setShowRejectAllModal(true)}
                            className="ml-4 px-4 py-2 rounded-lg bg-red-500 text-white font-semibold shadow-lg hover:bg-red-600 transition-colors"
                          >
                            Reject All
                          </button>
                        )}
                      </div>
                    )}
                    {loadingPending ? (
                      <div className="text-text-secondary-light dark:text-text-secondary-dark">Loading...</div>
                    ) : errorPending ? (
                      <div className="text-red-500">{errorPending}</div>
                    ) : pendingCharacters.length === 0 ? (
                      <div className="text-text-secondary-light dark:text-text-secondary-dark">No pending characters for review.</div>
                    ) : (
                      <div className="flex flex-col items-center w-full">
                        {/* Navigation Arrows and Character Card as before */}
                        <div className="relative w-full max-w-2xl mx-auto">
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
                          <div 
                            className="relative bg-background-container-light dark:bg-background-container-dark rounded-xl border border-primary/20 shadow flex flex-col items-center p-4 cursor-pointer hover:shadow-lg transition-shadow w-full"
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
                      </div>
                    )}
                  </div>
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

              {/* Reject All Modal */}
              {showRejectAllModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in-up">
                  <div className="bg-background-container-light dark:bg-background-container-dark rounded-2xl border-2 border-primary/30 shadow-2xl p-8 max-w-lg w-full mx-4 relative animate-fade-in-up">
                    <button
                      className="absolute top-3 right-3 text-gray-400 hover:text-primary text-2xl focus:outline-none"
                      onClick={() => {
                        setShowRejectAllModal(false);
                        setRejectReason('');
                      }}
                      title={t('common.close')}
                    >
                      <i className="fas fa-times" />
                    </button>
                    <h3 className="text-xl font-semibold mb-4">Reject All Characters</h3>
                    <p className="mb-4 text-text-secondary-light dark:text-text-secondary-dark">
                      Are you sure you want to reject all pending characters? This action cannot be undone.
                    </p>
                    <div className="mb-6">
                      <label className="block text-sm font-medium mb-2">
                        Reason for Rejection
                      </label>
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Please provide a reason for rejecting all characters..."
                        className="w-full px-4 py-2 rounded-lg border-2 border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary bg-background-container-light dark:bg-background-container-dark"
                        rows={3}
                      />
                    </div>
                    <div className="flex justify-end gap-4">
                      <button
                        className="px-4 py-2 rounded-lg border-2 border-primary/30 hover:border-primary transition-all duration-200"
                        onClick={() => {
                          setShowRejectAllModal(false);
                          setRejectReason('');
                        }}
                      >
                        {t('common.actions.cancel')}
                      </button>
                      <button
                        className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-all duration-200"
                        onClick={async () => {
                          try {
                            const res = await fetch('/api/admin/characters/reject-all', {
                              method: 'POST',
                              headers: { 
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                              },
                              body: JSON.stringify({ reason: rejectReason })
                            });
                            if (!res.ok) throw new Error('Failed to reject all characters');
                            setPendingCharacters([]);
                            addToast({ type: 'success', message: 'All characters rejected', duration: 3000 });
                            setShowRejectAllModal(false);
                            setRejectReason('');
                          } catch (err) {
                            addToast({ type: 'error', message: err.message, duration: 4000 });
                          }
                        }}
                        disabled={!rejectReason.trim()}
                      >
                        Reject All
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
} 