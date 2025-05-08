import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';

export default function AdminPanel() {
  const { token, isSuperAdmin, userRole, isModerator } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [passwordResetUser, setPasswordResetUser] = useState(null);
  const [customPassword, setCustomPassword] = useState('');
  const [actionInProgress, setActionInProgress] = useState(false);

  // Role hierarchy configuration
  const roleHierarchy = {
    'SUPER_ADMIN': 4,
    'ADMIN': 3,
    'MODERATOR': 2,
    'USER': 1
  };

  // Get available roles based on current user's role
  const getAvailableRoles = (currentUserRole, userRole) => {
    const currentRank = roleHierarchy[currentUserRole];
    const roles = Object.keys(roleHierarchy).filter(role => 
      (roleHierarchy[role] < currentRank && role !== 'SUPER_ADMIN') || role === userRole
    );
    
    // Ensure the user's current role is in the list
    if (!roles.includes(userRole)) {
      roles.push(userRole);
    }
    
    // Sort roles by hierarchy (highest first)
    return roles.sort((a, b) => roleHierarchy[b] - roleHierarchy[a]);
  };

  // Load users on mount
  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      const res = await fetch('/api/admin/users', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.status === 403) {
        navigate('/');
        return;
      }

      if (!res.ok) {
        throw new Error('Failed to load users');
      }

      const data = await res.json();
      console.log('Loaded users:', data); // Debug log
      setUsers(data);
    } catch (err) {
      console.error('Error loading users:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteUser(userId) {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      setActionInProgress(true);
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) {
        throw new Error('Failed to delete user');
      }

      setUsers(users.filter(u => u.id !== userId));
      addToast({
        type: 'success',
        message: 'User deleted successfully',
        duration: 10000
      });
    } catch (err) {
      console.error('Error deleting user:', err);
      addToast({
        type: 'error',
        message: 'Failed to delete user',
        duration: 10000
      });
    } finally {
      setActionInProgress(false);
    }
  }

  async function handleResetPassword(userId, password = null) {
    try {
      setActionInProgress(true);
      console.log('Resetting password:', {
        userId,
        hasCustomPassword: !!password,
        customPassword: password
      });

      const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ customPassword: password })
      });

      console.log('Password reset response status:', res.status);

      if (!res.ok) {
        const errorData = await res.json();
        console.error('Password reset failed:', errorData);
        throw new Error(errorData.error || 'Failed to reset password');
      }

      const data = await res.json();
      console.log('Password reset successful:', {
        success: data.success,
        hasTemporaryPassword: !!data.temporaryPassword
      });

      addToast({
        type: 'success',
        message: password 
          ? 'Password has been reset successfully'
          : `Password reset successful. Temporary password: ${data.temporaryPassword}`,
        duration: 10000
      });
      setPasswordResetUser(null);
      setCustomPassword('');
    } catch (err) {
      console.error('Error resetting password:', err);
      addToast({
        type: 'error',
        message: 'Failed to reset password',
        duration: 10000
      });
    } finally {
      setActionInProgress(false);
    }
  }

  async function handleBlockUser(userId, duration) {
    try {
      setActionInProgress(true);
      const res = await fetch(`/api/admin/users/${userId}/block`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ duration })
      });

      if (!res.ok) {
        throw new Error('Failed to block user');
      }

      await loadUsers(); // Reload users to get updated status
      addToast({
        type: 'success',
        message: `User blocked successfully. Blocked until ${new Date(user.blockedUntil).toLocaleString()}`,
        duration: 10000
      });
    } catch (err) {
      console.error('Error blocking user:', err);
      addToast({
        type: 'error',
        message: 'Failed to block user',
        duration: 10000
      });
    } finally {
      setActionInProgress(false);
    }
  }

  async function handleUnblockUser(userId) {
    try {
      setActionInProgress(true);
      const res = await fetch(`/api/admin/users/${userId}/unblock`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) {
        throw new Error('Failed to unblock user');
      }

      await loadUsers(); // Reload users to get updated status
      addToast({
        type: 'success',
        message: 'User unblocked successfully',
        duration: 10000
      });
    } catch (err) {
      console.error('Error unblocking user:', err);
      addToast({
        type: 'error',
        message: 'Failed to unblock user',
        duration: 10000
      });
    } finally {
      setActionInProgress(false);
    }
  }

  async function handleRoleChange(userId, newRole) {
    try {
      setActionInProgress(true);
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRole })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update user role');
      }

      const data = await res.json();
      console.log('Role update response:', data); // Debug log

      // Update the user's role in the local state
      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: data.user.role } : user
      ));

      // Reload users to ensure we have the latest data
      await loadUsers();
      addToast({
        type: 'success',
        message: 'User role updated successfully',
        duration: 10000
      });
    } catch (err) {
      console.error('Error updating user role:', err);
      addToast({
        type: 'error',
        message: 'Failed to update user role',
        duration: 10000
      });
    } finally {
      setActionInProgress(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600 dark:text-gray-300">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600 dark:text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mb-4"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
        </svg>
        <span>Back to Chats</span>
      </button>
      <h1 className="text-2xl font-bold mb-6">Admin Panel</h1>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Username
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Characters
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {users.map(user => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {user.username}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {(user.role === 'SUPER_ADMIN' || user.username === 'Biggzey') ? (
                      <span className="text-purple-600 dark:text-purple-400 font-medium">
                        Super Admin
                      </span>
                    ) : (
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        disabled={actionInProgress || 
                                 roleHierarchy[user.role] >= roleHierarchy[userRole] ||
                                 user.username === 'Biggzey'}
                        className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm
                                 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                                 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {getAvailableRoles(userRole, user.role).map(role => (
                          <option 
                            key={role} 
                            value={role}
                            disabled={roleHierarchy[role] >= roleHierarchy[userRole]}
                          >
                            {role.charAt(0) + role.slice(1).toLowerCase()}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {user._count?.characters || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {user.blocked ? (
                      <span className="text-red-600 dark:text-red-400">
                        Blocked until {new Date(user.blockedUntil).toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-green-600 dark:text-green-400">Active</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    <div className="flex space-x-2">
                      {isModerator && roleHierarchy[userRole] > roleHierarchy[user.role] && user.username !== 'Biggzey' && (
                        <>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            disabled={actionInProgress || user.username === 'Biggzey'}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => setPasswordResetUser(user)}
                            disabled={actionInProgress}
                            className="text-blue-600 hover:text-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Reset Password
                          </button>
                          {user.blocked ? (
                            <button
                              onClick={() => handleUnblockUser(user.id)}
                              disabled={actionInProgress || user.username === 'Biggzey'}
                              className="text-green-600 hover:text-green-900 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Unblock
                            </button>
                          ) : (
                          <button
                            onClick={() => setSelectedUser(user)}
                            disabled={actionInProgress || user.username === 'Biggzey'}
                            className="text-yellow-600 hover:text-yellow-900 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Block
                          </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Password Reset Modal */}
      {passwordResetUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full">
            <h2 className="text-xl font-bold mb-4">Reset Password</h2>
            <p className="mb-4">Choose how to reset password for {passwordResetUser.username}:</p>
            <div className="space-y-4">
              <button
                onClick={() => handleResetPassword(passwordResetUser.id)}
                className="w-full p-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Generate Temporary Password
              </button>
              
              <div className="space-y-2">
                <input
                  type="password"
                  value={customPassword}
                  onChange={(e) => setCustomPassword(e.target.value)}
                  placeholder="Enter custom password"
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  minLength={8}
                />
                <button
                  onClick={() => handleResetPassword(passwordResetUser.id, customPassword)}
                  disabled={!customPassword || customPassword.length < 8}
                  className="w-full p-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Set Custom Password
                </button>
              </div>

              <button
                onClick={() => {
                  setPasswordResetUser(null);
                  setCustomPassword('');
                }}
                className="w-full p-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Block User Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full">
            <h2 className="text-xl font-bold mb-4">Block User</h2>
            <p className="mb-4">Select duration to block {selectedUser.username}:</p>
            <div className="space-y-2">
              <button
                onClick={() => {
                  handleBlockUser(selectedUser.id, '1h');
                  setSelectedUser(null);
                }}
                className="w-full p-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
              >
                1 Hour
              </button>
              <button
                onClick={() => {
                  handleBlockUser(selectedUser.id, '24h');
                  setSelectedUser(null);
                }}
                className="w-full p-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
              >
                24 Hours
              </button>
              <button
                onClick={() => {
                  handleBlockUser(selectedUser.id, '7d');
                  setSelectedUser(null);
                }}
                className="w-full p-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
              >
                7 Days
              </button>
              <button
                onClick={() => {
                  handleBlockUser(selectedUser.id, 'permanent');
                  setSelectedUser(null);
                }}
                className="w-full p-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Permanent
              </button>
              <button
                onClick={() => setSelectedUser(null)}
                className="w-full p-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 