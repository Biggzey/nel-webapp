import React, { useState, useEffect, useRef } from 'react';
import { useCharacter } from '../context/CharacterContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from './Toast';
import PublicPersonalityModal from './PublicPersonalityModal';
import Badge from './Badge';
import { useAuth } from '../context/AuthContext';

export default function ExplorePage({ onClose }) {
  const { t } = useLanguage();
  const { addToCollection, characters: userCharacters, setSelectedIndex, reloadCharacters } = useCharacter();
  const { addToast } = useToast();
  const { isAdmin, isSuperAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openMenuIndex, setOpenMenuIndex] = useState(null);
  const menuRef = useRef(null);

  // Fetch public/explore characters
  useEffect(() => {
    async function fetchCharacters() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/explore/characters', {
          headers: { 'Authorization': localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : undefined }
        });
        if (!res.ok) throw new Error('Failed to fetch characters');
        const data = await res.json();
        setCharacters(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchCharacters();
  }, []);

  // Filter characters by search
  const filtered = characters.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.tags || []).some(tag => tag.toLowerCase().includes(search.toLowerCase()))
  );

  // Add character handler
  async function handleAdd(character) {
    try {
      await addToCollection(character.id);
      addToast({
        type: 'success',
        message: t('explore.added', { name: character.name }) || `${character.name} added to your characters!`,
        duration: 3000,
      });
      setModal(null);
    } catch (err) {
      addToast({
        type: 'error',
        message: t('explore.addError'),
        duration: 3000,
      });
    }
  }

  // Add delete handler
  async function handleDelete(character) {
    try {
      const res = await fetch(`/api/characters/${character.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : undefined
        }
      });
      if (!res.ok) throw new Error('Failed to delete character');
      setCharacters(prev => prev.filter(c => c.id !== character.id));
      addToast({
        type: 'success',
        message: t('explore.deleteSuccess', 'Character deleted successfully'),
        duration: 3000
      });
    } catch (err) {
      addToast({
        type: 'error',
        message: t('explore.deleteError', 'Failed to delete character'),
        duration: 3000
      });
    }
  }

  return (
    <div className="flex flex-col items-center justify-start min-h-screen w-full bg-gradient-to-b from-primary/10 via-background-light to-background-container-light dark:from-primary/20 dark:via-background-dark dark:to-background-container-dark px-2 py-8 animate-fade-in-up">
      {/* Back to Chats button, only if user has characters */}
      {userCharacters && userCharacters.length > 0 && (
        <button
          className="mb-4 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-all duration-200 text-base font-semibold self-start"
          onClick={onClose}
        >
          <i className="fas fa-arrow-left mr-2" />{t('explore.back')}
        </button>
      )}
      <h1 className="text-4xl font-bold mb-4 text-primary drop-shadow-lg">{t('explore.title')}</h1>
      <p className="mb-8 text-lg max-w-xl text-center text-text-secondary-light dark:text-text-secondary-dark">
        {t('explore.description')}
      </p>
      {/* Create Public Character Button */}
      <button
        className="mb-6 px-6 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-all duration-200 text-lg font-semibold shadow-md"
        onClick={() => setShowCreate(true)}
      >
        {t('explore.create')}
      </button>
      {/* Search bar */}
      <div className="w-full max-w-md mb-8">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('explore.search')}
          className="w-full px-5 py-3 rounded-2xl border-2 border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary bg-background-container-light dark:bg-background-container-dark text-lg transition-all duration-200 shadow-md focus:shadow-lg outline-none"
        />
      </div>
      {/* Character grid */}
      {loading ? (
        <div className="text-xl text-text-secondary-light dark:text-text-secondary-dark py-12">{t('explore.loading')}</div>
      ) : error ? (
        <div className="text-xl text-red-500 py-12">{t('explore.error')}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 w-full max-w-5xl">
          {filtered.length === 0 ? (
            <div className="col-span-full text-center text-xl text-text-secondary-light dark:text-text-secondary-dark py-12">
              {t('explore.noResults')}
            </div>
          ) : filtered.map(character => (
            <div
              key={character.id}
              className="group relative bg-background-container-light dark:bg-background-container-dark rounded-2xl border-2 border-primary/20 hover:border-primary shadow-md hover:shadow-xl transition-all duration-200 flex flex-col items-center p-6 cursor-pointer hover:scale-[1.03] focus-within:scale-[1.03]"
              tabIndex={0}
              onClick={() => setModal(character)}
              onKeyDown={e => { if (e.key === 'Enter') setModal(character); }}
            >
              <img
                src={character.avatar || '/default-avatar.png'}
                alt={character.name}
                className="w-20 h-20 rounded-full object-cover mb-4 border-4 border-primary/30 group-hover:border-primary shadow-lg transition-all duration-200"
                onError={e => { e.target.onerror = null; e.target.src = '/default-avatar.png'; }}
              />
              <h2 className="text-xl font-semibold mb-1 text-primary drop-shadow">{character.name}</h2>
              <div className="text-base text-text-secondary-light dark:text-text-secondary-dark mb-2">{character.tagline}</div>
              <div className="flex flex-wrap gap-2 justify-center mb-2">
                {(character.tags || []).map(tag => (
                  <Badge key={tag} variant="primary" size="md">{tag}</Badge>
                ))}
              </div>
              {/* Status badge if not approved */}
              {character.reviewStatus && character.reviewStatus !== 'approved' && (
                <Badge 
                  variant={character.reviewStatus === 'pending' ? 'warning' : 'danger'}
                  size="md"
                  className="absolute top-4 right-4"
                >
                  {t(`explore.${character.reviewStatus}`)}
                </Badge>
              )}
              {/* Context menu button */}
              <button
                ref={menuRef}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenuIndex(openMenuIndex === character.id ? null : character.id);
                }}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-primary focus:outline-none"
                title="More options"
              >
                <i className="fas fa-ellipsis-v" />
              </button>
              {/* Context menu */}
              {openMenuIndex === character.id && (
                <div
                  ref={menuRef}
                  className="absolute top-12 right-4 z-50 min-w-[180px] bg-background-container-light dark:bg-background-container-dark border border-container-border-light dark:border-container-border-dark rounded-lg shadow-lg py-2"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAdd(character);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-background-container-hover-light dark:hover:bg-background-container-hover-dark"
                  >
                    <i className="fas fa-plus mr-2" /> {t('explore.add')}
                  </button>
                  {(isAdmin || isSuperAdmin) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(character);
                      }}
                      className="w-full text-left px-4 py-2 text-red-500 hover:bg-background-container-hover-light dark:hover:bg-background-container-hover-dark"
                    >
                      <i className="fas fa-trash mr-2" /> {t('explore.delete')}
                    </button>
                  )}
                </div>
              )}
              <span className="sr-only">{t('explore.view')}</span>
            </div>
          ))}
        </div>
      )}
      {/* Modal for character details */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in-up" onClick={() => setModal(null)}>
          <div
            className="bg-background-container-light dark:bg-background-container-dark rounded-2xl border-2 border-primary/30 shadow-2xl p-8 max-w-7xl w-full mx-4 relative animate-fade-in-up overflow-y-auto max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-primary text-2xl focus:outline-none"
              onClick={() => setModal(null)}
              title={t('common.close')}
            >
              <i className="fas fa-times" />
            </button>
            <div className="grid grid-cols-3 gap-8">
              {/* Left Column - Images */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">{t('character.fields.avatar')}</h3>
                  <img
                    src={modal.avatar || '/default-avatar.png'}
                    alt="Avatar"
                    className="w-32 h-32 rounded-full object-cover border-2 border-primary/30"
                  />
                </div>
                {modal.fullImage && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2">{t('character.fields.fullImage')}</h3>
                    <img
                      src={modal.fullImage}
                      alt="Full Image"
                      className="w-full rounded-lg border-2 border-primary/30"
                    />
                  </div>
                )}
              </div>

              {/* Middle Column - Basic Details */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">{t('character.details')}</h3>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm text-gray-500">{t('character.fields.name')}</dt>
                      <dd className="font-medium">{modal.name}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">{t('character.fields.description')}</dt>
                      <dd className="font-medium">{modal.description}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">{t('character.fields.age')}</dt>
                      <dd className="font-medium">{modal.age || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">{t('character.fields.gender')}</dt>
                      <dd className="font-medium">{modal.gender || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">{t('character.fields.race')}</dt>
                      <dd className="font-medium">{modal.race || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">{t('character.fields.occupation')}</dt>
                      <dd className="font-medium">{modal.occupation || 'N/A'}</dd>
                    </div>
                  </dl>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(modal.tags || []).map(tag => (
                    <Badge key={tag} variant="primary" size="lg">{tag}</Badge>
                  ))}
                </div>
              </div>

              {/* Right Column - Personality Configuration */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">{t('character.personality.title')}</h3>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm text-gray-500">{t('character.fields.personality')}</dt>
                      <dd className="font-medium">{modal.personality || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">{t('character.personality.systemPrompt')}</dt>
                      <dd className="font-medium">{modal.systemPrompt || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">{t('character.personality.backstory')}</dt>
                      <dd className="font-medium">{modal.backstory || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">{t('character.personality.firstMessage')}</dt>
                      <dd className="font-medium">{modal.firstMessage || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">{t('character.personality.messageExample')}</dt>
                      <dd className="font-medium">{modal.messageExample || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">{t('character.personality.scenario')}</dt>
                      <dd className="font-medium">{modal.scenario || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">{t('character.personality.creatorNotes')}</dt>
                      <dd className="font-medium">{modal.creatorNotes || 'N/A'}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>

            {/* Add button centered at bottom */}
            <div className="mt-8 flex justify-center">
              <button
                className="bg-primary text-white px-8 py-3 rounded-xl shadow-lg transition-all duration-200 text-base font-semibold hover:bg-primary/90"
                onClick={() => handleAdd(modal)}
              >
                {t('explore.add')}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Create Public Character Modal */}
      {showCreate && (
        <PublicPersonalityModal
          isOpen={showCreate}
          initialData={{ name: '', isPublic: true }}
          onClose={() => setShowCreate(false)}
          onSave={async (form) => {
              const res = await fetch('/api/characters', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : undefined
                },
              body: JSON.stringify({ ...form, isPublic: true })
              });
              if (!res.ok) throw new Error('Failed to create character');
            const response = await res.json();
              await reloadCharacters();
            return response;
          }}
        />
      )}
      {globalLoading && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40">
          <div className="loader border-4 border-primary border-t-transparent rounded-full w-16 h-16 animate-spin" />
        </div>
      )}
    </div>
  );
} 