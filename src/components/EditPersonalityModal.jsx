import React, { useState, useEffect, useRef } from "react";
import { useCharacter } from "../context/CharacterContext";
import { useLanguage } from "../context/LanguageContext";
import { useIsMobile } from "../hooks/useIsMobile";
import { useToast } from './Toast';

const DEFAULT_AVATAR = '/default-avatar.png';

export default function EditPersonalityModal({ isOpen, initialData = {}, onClose, onSave }) {
  const { reloadCharacters } = useCharacter();
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const { addToast } = useToast();

  const [form, setForm] = useState(() => ({
    name: '',
    description: '',
    age: '',
    gender: '',
    race: '',
    occupation: '',
    likes: '',
    dislikes: '',
    avatar: DEFAULT_AVATAR,
    fullImage: '',
    personality: '',
    systemPrompt: '',
    customInstructions: '',
    backstory: '',
    firstMessage: '',
    messageExample: '',
    scenario: '',
    creatorNotes: '',
    alternateGreetings: [],
    tags: [],
    ...initialData
  }));

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState(null);
  const modalRef = useRef(null);

  useEffect(() => {
    setForm(prev => ({
      ...prev,
      ...initialData,
      avatar: initialData.avatar || DEFAULT_AVATAR
    }));
  }, [initialData, isOpen]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    if (isOpen) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (modalRef.current && !modalRef.current.contains(e.target)) onClose();
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setGlobalError(null);
    try {
      if (!initialData.id) throw new Error('No character ID provided');
      const updateRes = await fetch(`/api/characters/${initialData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : undefined
        },
        body: JSON.stringify(form)
      });
      if (!updateRes.ok) {
        const errorData = await updateRes.json();
        throw new Error(errorData.message || 'Failed to update character');
      }
      const updatedChar = await updateRes.json();
      await reloadCharacters();
      onSave(updatedChar);
      addToast({
        type: 'success',
        message: t('character.editSuccess'),
        duration: 3000
      });
      onClose();
    } catch (err) {
      setGlobalError(err.message);
      addToast({
        type: 'error',
        message: err.message || t('character.createError'),
        duration: 3000
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  function handleFileUpload(e, fieldName) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm(prev => ({ ...prev, [fieldName]: reader.result }));
    };
    reader.readAsDataURL(file);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="absolute inset-0 opacity-70 pointer-events-none">
        <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-accent-primary-light dark:bg-accent-primary-dark blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 rounded-full bg-accent-secondary-light dark:bg-accent-secondary-dark blur-3xl" />
      </div>
      <form
        ref={modalRef}
        onSubmit={handleSubmit}
        className={`relative z-10 ${isMobile ? 'w-full h-full max-w-none max-h-none rounded-none' : 'w-full max-w-[90rem] rounded-xl max-h-[90vh]'} bg-background-container-light dark:bg-background-container-dark text-text-light dark:text-text-dark p-4 md:p-6 shadow-xl overflow-y-auto border-2 border-container-border-light dark:border-container-border-dark transition-all duration-300 hover:border-primary/40 hover:shadow-2xl animate-fade-in-up`}
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-accent-primary-light/5 to-transparent dark:from-accent-primary-dark/5 rounded-xl pointer-events-none" />
        <div className="relative">
          <div className={`flex ${isMobile ? 'flex-col' : 'gap-6'}`}>
            {/* Left Column - Character Details */}
            <div className={`${isMobile ? 'w-full' : 'w-[500px]'} space-y-3`}>
              <div className="bg-background-light dark:bg-background-dark rounded-lg p-3 border border-border-light dark:border-border-dark">
                <h3 className="text-lg font-semibold mb-2">{t('character.details')}</h3>
                {/* Name field */}
                <div className="mb-2">
                  <label className="block mb-1 text-sm font-medium">{t('character.fields.name')}</label>
                  <input
                    name="name"
                    value={form.name || ""}
                    onChange={handleChange}
                    className="w-full h-9 px-3 border rounded bg-background-container-light dark:bg-background-container-dark border-border-light dark:border-border-dark focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    placeholder={t('character.fields.namePlaceholder')}
                  />
                </div>
                {/* Description field */}
                <div className="mb-2">
                  <label className="block mb-1 text-sm font-medium">{t('character.fields.description')}</label>
                  <textarea
                    name="description"
                    value={form.description || ""}
                    onChange={handleChange}
                    className="w-full p-2 border rounded bg-background-container-light dark:bg-background-container-dark border-border-light dark:border-border-dark focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    placeholder={t('character.fields.descriptionPlaceholder')}
                    rows={3}
                  />
                </div>
                {/* Other fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { label: t('character.fields.age'), field: "age", placeholder: t('character.fields.agePlaceholder') },
                    { label: t('character.fields.gender'), field: "gender", placeholder: t('character.fields.genderPlaceholder') },
                    { label: t('character.fields.race'), field: "race", placeholder: t('character.fields.racePlaceholder') },
                    { label: t('character.fields.occupation'), field: "occupation", placeholder: t('character.fields.occupationPlaceholder') }
                  ].map(({ label, field, placeholder }) => (
                    <div key={field}>
                      <label className="block mb-1 text-sm font-medium">{label}</label>
                      <input
                        name={field}
                        value={form[field] || ""}
                        onChange={handleChange}
                        placeholder={placeholder}
                        className="w-full h-9 px-3 border rounded bg-background-container-light dark:bg-background-container-dark border-border-light dark:border-border-dark focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                      />
                    </div>
                  ))}
                </div>
              </div>
              {/* Images */}
              <div className="bg-background-light dark:bg-background-dark rounded-lg p-3 border border-border-light dark:border-border-dark">
                <div className="space-y-4">
                  <div>
                    <label className="block mb-1 text-sm font-medium">{t('character.fields.avatar')}</label>
                    <input
                      name="avatar"
                      value={form.avatar || ""}
                      onChange={handleChange}
                      placeholder={t('character.fields.avatarPlaceholder')}
                      className="w-full h-9 px-3 mb-2 border rounded bg-background-container-light dark:bg-background-container-dark border-border-light dark:border-border-dark focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, "avatar")}
                      className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-white hover:file:bg-primary/90 file:transition-colors file:cursor-pointer w-full"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-sm font-medium">{t('character.fields.fullImage')}</label>
                    <input
                      name="fullImage"
                      value={form.fullImage || ""}
                      onChange={handleChange}
                      placeholder={t('character.fields.fullImagePlaceholder')}
                      className="w-full h-9 px-3 mb-2 border rounded bg-background-container-light dark:bg-background-container-dark border-border-light dark:border-border-dark focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, "fullImage")}
                      className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-white hover:file:bg-primary/90 file:transition-colors file:cursor-pointer w-full"
                    />
                  </div>
                </div>
              </div>
            </div>
            {/* Right Column - Personality Configuration */}
            <div className={`${isMobile ? 'w-full mt-4' : 'flex-1'} space-y-2 flex flex-col`}>
              <div className="bg-background-light dark:bg-background-dark rounded-lg p-3 border border-border-light dark:border-border-dark flex-1 flex flex-col">
                <h3 className="text-lg font-semibold mb-2">{t('character.personality.title')}</h3>
                {/* Personality */}
                <div className="mb-2">
                  <label className="block mb-1 text-sm font-medium">{t('character.fields.personality')}</label>
                  <textarea
                    name="personality"
                    value={form.personality || ""}
                    onChange={handleChange}
                    className="w-full p-2 border rounded bg-background-container-light dark:bg-background-container-dark border-border-light dark:border-border-dark focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    placeholder={t('character.fields.personalityPlaceholder')}
                    rows={3}
                  />
                </div>
                {/* System Prompt */}
                <div className="mb-2">
                  <label className="block mb-1 text-sm font-medium">{t('character.personality.systemPrompt')}</label>
                  <textarea
                    name="systemPrompt"
                    value={form.systemPrompt || ""}
                    onChange={handleChange}
                    className="w-full p-2 border rounded bg-background-container-light dark:bg-background-container-dark border-border-light dark:border-border-dark focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    placeholder={t('character.personality.systemPromptPlaceholder')}
                    rows={3}
                  />
                </div>
                {/* Tags */}
                <div className="mb-2">
                  <label className="block mb-1 text-sm font-medium">{t('character.fields.tags')}</label>
                  <input
                    name="tags"
                    value={Array.isArray(form.tags) ? form.tags.join(", ") : form.tags || ""}
                    onChange={e => handleChange({ target: { name: "tags", value: e.target.value.split(/,\s*/) } })}
                    className="w-full h-9 px-3 border rounded bg-background-container-light dark:bg-background-container-dark border-border-light dark:border-border-dark focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    placeholder={t('character.fields.tagsPlaceholder')}
                  />
                </div>
                {/* Other fields */}
                <div className="space-y-2">
                  {[
                    { label: t('character.personality.customInstructions'), field: "customInstructions", placeholder: t('character.personality.customInstructionsPlaceholder') },
                    { label: t('character.personality.backstory'), field: "backstory", placeholder: t('character.personality.backstoryPlaceholder') },
                    { label: t('character.personality.firstMessage'), field: "firstMessage", placeholder: t('character.personality.firstMessagePlaceholder') },
                    { label: t('character.personality.messageExample'), field: "messageExample", placeholder: t('character.personality.messageExamplePlaceholder') },
                    { label: t('character.personality.scenario'), field: "scenario", placeholder: t('character.personality.scenarioPlaceholder') },
                    { label: t('character.personality.creatorNotes'), field: "creatorNotes", placeholder: t('character.personality.creatorNotesPlaceholder') }
                  ].map(({ label, field, placeholder }) => (
                    <div key={field}>
                      <label className="block mb-1 text-sm font-medium">{label}</label>
                      <textarea
                        name={field}
                        value={form[field] || ""}
                        onChange={handleChange}
                        className="w-full p-2 border rounded bg-background-container-light dark:bg-background-container-dark border-border-light dark:border-border-dark focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                        placeholder={placeholder}
                        rows={2}
                      />
                    </div>
                  ))}
                </div>
                {/* Buttons */}
                <div className="flex items-center justify-end space-x-2 mt-auto pt-3 border-t border-border-light dark:border-border-dark">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-1.5 rounded-lg bg-background-secondary-light dark:bg-background-secondary-dark hover:bg-background-light/90 dark:hover:bg-background-dark/90 transition-all duration-200 hover:scale-105 transform"
                  >
                    {t('character.actions.cancel')}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-all duration-200 hover:scale-105 transform"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <span className="loader border-2 border-white border-t-transparent rounded-full w-5 h-5 mr-2 animate-spin" />
                    ) : null}
                    {t('common.actions.save')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
} 