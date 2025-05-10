import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../components/Toast';
import AdminSidebar from '../components/AdminSidebar';

export default function AdminPanel() {
  const { token } = useAuth();
  const { t } = useLanguage();
  const { addToast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [systemStats, setSystemStats] = useState(null);

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
        const res = await fetch('/api/admin/stats', {
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
              <div className="flex items-center space-x-4">
                <img
                  src={userDetails.avatar || '/user-avatar.png'}
                  alt=""
                  className="w-20 h-20 rounded-full object-cover"
                />
                <div>
                  <h1 className="text-2xl font-bold">{userDetails.username}</h1>
                  <p className="text-gray-500">{userDetails.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Info */}
                <div className="bg-background-container-light dark:bg-background-container-dark rounded-xl p-6">
                  <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm text-gray-500">Role</dt>
                      <dd className="font-medium">{userDetails.role}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">Status</dt>
                      <dd className="font-medium">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          userDetails.blocked ? 'bg-red-100 text-red-800' :
                          userDetails.online ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {userDetails.blocked ? 'Blocked' :
                           userDetails.online ? 'Online' : 'Offline'}
                        </span>
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
                        {new Date(userDetails.lastLogin).toLocaleDateString()}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Activity Stats */}
                <div className="bg-background-container-light dark:bg-background-container-dark rounded-xl p-6">
                  <h2 className="text-xl font-semibold mb-4">Activity Stats</h2>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm text-gray-500">Total Messages</dt>
                      <dd className="font-medium">{userDetails.stats?.totalMessages || 0}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">Characters Created</dt>
                      <dd className="font-medium">{userDetails.stats?.charactersCreated || 0}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">Active Sessions</dt>
                      <dd className="font-medium">{userDetails.stats?.activeSessions || 0}</dd>
                    </div>
                  </dl>
                </div>

                {/* Recent Activity */}
                <div className="bg-background-container-light dark:bg-background-container-dark rounded-xl p-6 md:col-span-2">
                  <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
                  <div className="space-y-4">
                    {userDetails.activity?.map((activity, index) => (
                      <div
                        key={index}
                        className="flex items-center space-x-4 p-3 rounded-lg bg-background-light dark:bg-background-dark"
                      >
                        <i className={`fas fa-${activity.icon} text-${activity.color}-500`} />
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
        ) : (
          // System stats view
          systemStats && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold">System Overview</h1>
              
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
                      <dt className="text-sm text-gray-500">Today</dt>
                      <dd className="text-2xl font-bold">{systemStats.messagesToday}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">Avg. Per User</dt>
                      <dd className="text-2xl font-bold">{systemStats.avgMessagesPerUser}</dd>
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
                      <dt className="text-sm text-gray-500">Avg. Per User</dt>
                      <dd className="text-2xl font-bold">{systemStats.avgCharactersPerUser}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              {/* Recent System Activity */}
              <div className="bg-background-container-light dark:bg-background-container-dark rounded-xl p-6">
                <h2 className="text-xl font-semibold mb-4">Recent System Activity</h2>
                <div className="space-y-4">
                  {systemStats.recentActivity?.map((activity, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-4 p-3 rounded-lg bg-background-light dark:bg-background-dark"
                    >
                      <i className={`fas fa-${activity.icon} text-${activity.color}-500`} />
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
          )
        )}
      </main>
    </div>
  );
} 