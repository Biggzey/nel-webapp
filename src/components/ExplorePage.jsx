import React, { useState, useEffect } from 'react';
import { useCharacter } from '../context/CharacterContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from './Toast';
import PublicPersonalityModal from './PublicPersonalityModal';
import PersonalityModal from './PersonalityModal';
import Badge from './Badge';

export default function ExplorePage({ onClose }) {
  const { t } = useLanguage();
  const { addToCollection, characters: userCharacters, setSelectedIndex, reloadCharacters } = useCharacter();
  const { addToast } = useToast();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
              <span className="sr-only">{t('explore.view')}</span>
            </div>
          ))}
        </div>
      )}
      {/* Modal for character details */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in-up" onClick={() => setModal(null)}>
          <div
            className="bg-background-container-light dark:bg-background-container-dark rounded-2xl border-2 border-primary/30 shadow-2xl p-8 max-w-lg w-full mx-4 relative animate-fade-in-up"
            onClick={e => e.stopPropagation()}
          >
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-primary text-2xl focus:outline-none"
              onClick={() => setModal(null)}
              title={t('common.close')}
            >
              <i className="fas fa-times" />
            </button>
            <div className="flex flex-col items-center">
              <img
                src={modal.avatar || '/default-avatar.png'}
                alt={modal.name}
                className="w-28 h-28 rounded-full object-cover mb-4 border-4 border-primary/30 shadow-lg"
                onError={e => { e.target.onerror = null; e.target.src = '/default-avatar.png'; }}
              />
              <h2 className="text-2xl font-bold mb-2 text-primary drop-shadow">{modal.name}</h2>
              <div className="text-lg text-text-secondary-light dark:text-text-secondary-dark mb-4">{modal.tagline}</div>
              <div className="mb-4 text-base text-center text-text-light dark:text-text-dark">{modal.description}</div>
              <div className="flex flex-wrap gap-2 justify-center mb-6">
                {(modal.tags || []).map(tag => (
                  <Badge key={tag} variant="primary" size="lg">{tag}</Badge>
                ))}
              </div>
              <button
                className="bg-primary text-white px-6 py-2 rounded-xl shadow-lg transition-all duration-200 text-base font-semibold hover:bg-primary/90"
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
            // Only create the private character and return the result
            const res = await fetch('/api/characters', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : undefined
              },
              body: JSON.stringify({ ...form, isPublic: false })
            });
            if (!res.ok) throw new Error('Failed to create character');
            return await res.json();
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