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
              <button
                className="mb-4 px-4 py-2 rounded-lg bg-primary text-white shadow transition-colors hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-primary"
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
                        message: `Removed ${data.totalDeleted} duplicate Nelliel characters for this user`,
                        duration: 4000
                      });
                    } else {
                      throw new Error(data.error || 'Unknown error');
                    }
                  } catch (err) {
                    addToast({
                      type: 'error',
                      message: 'Failed to clean up duplicates: ' + err.message,
                      duration: 5000
                    });
                  }
                }}
              >
                Remove Duplicate Nelliel Characters (User)
              </button>
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
                              setUserDetails(prev => ({ ...prev, role: e.target.value }));
                              addToast({
                                type: 'success',
                                message: 'Role updated successfully',
                                duration: 3000
                              });
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
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">Status</dt>
                      <dd className="font-medium">
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            userDetails.blocked ? 'bg-red-100 text-red-800' :
                            userDetails.online ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {userDetails.blocked ? 'Blocked' :
                             userDetails.online ? 'Online' : 'Offline'}
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
                            <p className="font-medium">{activity.description}</p>
                            <p className="text-sm text-gray-500">
                              {new Date(activity.timestamp).toLocaleString()}
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
              <h1 className="text-2xl font-bold mb-6">System Overview</h1>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* User Stats */}
                <div className="bg-background-container-light dark:bg-background-container-dark rounded-xl p-6">
                  <h2 className="text-xl font-semibold mb-4">Users</h2>
                  <dl className="space-y-3">
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
                <div className="bg-background-container-light dark:bg-background-container-dark rounded-xl p-6">
                  <h2 className="text-xl font-semibold mb-4">Messages</h2>
                  <dl className="space-y-3">
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
                <div className="bg-background-container-light dark:bg-background-container-dark rounded-xl p-6">
                  <h2 className="text-xl font-semibold mb-4">Characters</h2>
                  <dl className="space-y-3">
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

                {/* Recent Activity */}
                <div className="bg-background-container-light dark:bg-background-container-dark rounded-xl p-6 md:col-span-3">
                  <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
                  <div className="space-y-4">
                    {systemStats.recentActivity?.map((activity, index) => (
                      <div
                        key={index}
                        className="flex items-center space-x-4 p-3 rounded-lg bg-background-light dark:bg-background-dark"
                      >
                        <i className={`fas fa-${activity.type === 'message' ? 'comment' : 'user'} text-primary`} />
                        <div className="flex-1">
                          <p className="font-medium">{activity.description}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(activity.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )
        )}
      </main>
    </div>
  );
} 