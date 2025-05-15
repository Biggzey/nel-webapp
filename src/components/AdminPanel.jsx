import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { toast } from 'react-hot-toast';
import { Badge } from './ui/Badge';

const AdminPanel = () => {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [users, setUsers] = useState([]);
  const [pendingCharacters, setPendingCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        // Fetch users
        const usersResponse = await fetch('/api/admin/users', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!usersResponse.ok) throw new Error('Failed to fetch users');
        const usersData = await usersResponse.json();
        setUsers(usersData);

        // Fetch pending characters
        const pendingResponse = await fetch('/api/admin/pending-characters', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!pendingResponse.ok) throw new Error('Failed to fetch pending characters');
        const pendingData = await pendingResponse.json();
        setPendingCharacters(pendingData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [token]);

  const handleResetOnboarding = async (userId) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/reset-onboarding`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success('Onboarding reset successfully');
      } else {
        throw new Error('Failed to reset onboarding');
      }
    } catch (error) {
      console.error('Error resetting onboarding:', error);
      toast.error('Failed to reset onboarding');
    }
  };

  const handleApproveCharacter = async (characterId) => {
    try {
      const response = await fetch(`/api/admin/characters/${characterId}/approve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setPendingCharacters(prev => prev.filter(char => char.id !== characterId));
        toast.success('Character approved successfully');
      } else {
        throw new Error('Failed to approve character');
      }
    } catch (error) {
      console.error('Error approving character:', error);
      toast.error('Failed to approve character');
    }
  };

  const handleRejectCharacter = async (characterId) => {
    try {
      const response = await fetch(`/api/admin/characters/${characterId}/reject`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setPendingCharacters(prev => prev.filter(char => char.id !== characterId));
        toast.success('Character rejected successfully');
      } else {
        throw new Error('Failed to reject character');
      }
    } catch (error) {
      console.error('Error rejecting character:', error);
      toast.error('Failed to reject character');
    }
  };

  const handleRejectAllCharacters = async () => {
    if (!window.confirm(t('admin.confirmRejectAll') || 'Are you sure you want to reject all pending characters?')) {
      return;
    }

    try {
      const response = await fetch('/api/admin/characters/reject-all', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setPendingCharacters([]);
        toast.success(t('admin.allCharactersRejected') || 'All characters rejected successfully');
      } else {
        throw new Error('Failed to reject all characters');
      }
    } catch (error) {
      console.error('Error rejecting all characters:', error);
      toast.error(t('admin.rejectAllError') || 'Failed to reject all characters');
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">{t('admin.title')}</h1>
      
      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : (
        <div className="space-y-8">
          {/* Pending Characters Section */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow relative">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">{t('admin.pendingCharacters')}</h2>
              {pendingCharacters.length > 0 && (
                <div className="flex items-center gap-4">
                  <Badge variant="default">
                    {pendingCharacters.length}
                  </Badge>
                  <button
                    onClick={handleRejectAllCharacters}
                    className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    {t('admin.rejectAll') || 'Reject All'}
                  </button>
                </div>
              )}
            </div>
            <div className="space-y-4">
              {pendingCharacters.length === 0 ? (
                <p className="text-gray-500">{t('admin.noPendingCharacters') || 'No pending characters.'}</p>
              ) : (
                pendingCharacters.map((character) => (
                  <div key={character.id} className="border-b dark:border-gray-700 pb-4 last:border-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{character.name}</h3>
                        <p className="text-sm text-gray-500">{character.description}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {t('admin.submittedBy')}: {character.submittedBy}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleApproveCharacter(character.id)}
                          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                        >
                          {t('admin.approve')}
                        </button>
                        <button
                          onClick={(() => {
                            if (!character._rejecting) {
                              character._rejecting = true;
                              handleRejectCharacter(character.id).finally(() => { character._rejecting = false; });
                            }
                          })}
                          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                        >
                          {t('admin.reject')}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Users Section */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">{t('admin.users')}</h2>
            <div className="space-y-4">
              {users.map((user) => (
                <div key={user.id} className="border-b dark:border-gray-700 pb-4 last:border-0">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold">{user.username}</h3>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleResetOnboarding(user.id)}
                        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        {t('admin.resetOnboarding')}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel; 