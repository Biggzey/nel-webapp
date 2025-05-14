import React, { useState, useEffect, useRef } from "react";
import { useCharacter } from "../context/CharacterContext";
import { useLanguage } from "../context/LanguageContext";
import { useIsMobile } from "../hooks/useIsMobile";
import { useToast } from './Toast';
import { useNotifications } from '../context/NotificationContext';

const DEFAULT_AVATAR = '/default-avatar.png';

export default function PrivatePersonalityModal({ isOpen, initialData = {}, onClose, onSave }) {
  const { resetCurrentCharacter, reloadCharacters } = useCharacter();
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const { addToast } = useToast();
  const { fetchNotifications } = useNotifications();
  
  // State management
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

  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmPublic, setConfirmPublic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState(null);
  
  const inputRefs = useRef({});
  const modalRef = useRef(null);

  useEffect(() => {
    setForm(prev => ({
      ...prev,
      ...initialData,
      avatar: initialData.avatar || DEFAULT_AVATAR
    }));
    setShowConfirm(false);
    setConfirmPublic(false);
  }, [initialData, isOpen]);

  // Add keyboard event listener for ESC key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Add click-outside handler
  useEffect(() => {
    function handleClickOutside(e) {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  function validateRequiredFields() {
    const errors = {};
    if (!form.name || form.name.trim() === '') {
      errors.name = t('character.fields.nameRequired');
    }
    if (!form.description || form.description.trim() === '') {
      errors.description = t('character.fields.descriptionRequired');
    }
    if (!form.personality || form.personality.trim() === '') {
      errors.personality = t('character.fields.personalityRequired');
    }
    if (!form.systemPrompt || form.systemPrompt.trim() === '') {
      errors.systemPrompt = t('character.fields.systemPromptRequired');
    }
    
    const tagsArr = Array.isArray(form.tags) ? form.tags : (typeof form.tags === 'string' ? form.tags.split(/,\s*/) : []);
    if (!tagsArr || tagsArr.length < 3 || tagsArr.some(tag => !tag.trim())) {
      errors.tags = t('character.fields.tagsRequired');
    }
    
    return errors;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFieldErrors({});
    setGlobalError(null);

    // Validate required fields
    const errors = validateRequiredFields();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setAttemptedSubmit(true);
      setIsSubmitting(false);
      addToast({
        type: 'error',
        message: t('character.fields.missingFields'),
        duration: 3000
      });
      return;
    }

    // Show confirmation dialog for new characters
    if (!initialData.id && !showConfirm) {
      setShowConfirm(true);
      setIsSubmitting(false);
      return;
    }

    try {
      // For existing characters, use PUT to update
      if (initialData.id) {
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
        return;
      }

      // For new characters, always create private first
      const privateRes = await fetch('/api/characters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : undefined
        },
        body: JSON.stringify({
          ...form,
          isPublic: confirmPublic,
          name: form.name.trim(),
          description: form.description.trim(),
          personality: form.personality.trim(),
          systemPrompt: form.systemPrompt.trim(),
          tags: Array.isArray(form.tags) ? form.tags.map(tag => tag.trim()) : form.tags.split(/,\s*/).map(tag => tag.trim())
        })
      });

      if (!privateRes.ok) {
        const errorData = await privateRes.json();
        throw new Error(errorData.message || 'Failed to create character');
      }

      const response = await privateRes.json();
      const privateChar = response;

      // If public was requested and we got a pending submission
      if (confirmPublic) {
        if (response.pendingSubmission) {
          // Send notification for character submission
          await fetch('/api/notifications', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : undefined
            },
            body: JSON.stringify({
              type: 'CHARACTER_SUBMITTED',
              title: t('notifications.characterSubmitted.title'),
              message: t('notifications.characterSubmitted.message'),
              metadata: { characterId: response.pendingSubmission.id }
            })
          });

          addToast({
            type: 'success',
            message: t('character.submittedForApproval'),
            duration: 3000
          });
        } else if (response.pendingError) {
          addToast({
            type: 'error',
            message: t('character.reviewError'),
            duration: 4000
          });
        }
      } else {
        addToast({
          type: 'success',
          message: t('character.addedToPrivate'),
          duration: 3000
        });
      }

      // Always reload characters and save the private version
      await reloadCharacters();
      onSave(privateChar);
      onClose();
    } catch (err) {
      console.error('Character creation failed:', err);
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
                  <label className="block mb-1 text-sm font-medium">
                    {t('character.fields.name')}
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    name="name"
                    value={form.name || ""}
                    onChange={handleChange}
                    className="w-full h-9 px-3 border rounded bg-primary/10 dark:bg-primary/20 border-primary/30 focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    placeholder={t('character.fields.namePlaceholder')}
                  />
                  {fieldErrors.name && <p className="text-red-500 text-xs mt-1">{fieldErrors.name}</p>}
                </div>

                {/* Description field */}
                <div className="mb-2">
                  <label className="block mb-1 text-sm font-medium">
                    {t('character.fields.description')}
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <textarea
                    name="description"
                    value={form.description || ""}
                    onChange={handleChange}
                    className="w-full p-2 border rounded bg-primary/10 dark:bg-primary/20 border-primary/30 focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    placeholder={t('character.fields.descriptionPlaceholder')}
                    rows={3}
                  />
                  {fieldErrors.description && <p className="text-red-500 text-xs mt-1">{fieldErrors.description}</p>}
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
                    <label className="block mb-1 text-sm font-medium">
                      {t('character.fields.avatar')}
                    </label>
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
                  <label className="block mb-1 text-sm font-medium">
                    {t('character.fields.personality')}
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <textarea
                    name="personality"
                    value={form.personality || ""}
                    onChange={handleChange}
                    className="w-full p-2 border rounded bg-primary/10 dark:bg-primary/20 border-primary/30 focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    placeholder={t('character.fields.personalityPlaceholder')}
                    rows={3}
                  />
                  {fieldErrors.personality && <p className="text-red-500 text-xs mt-1">{fieldErrors.personality}</p>}
                </div>

                {/* System Prompt */}
                <div className="mb-2">
                  <label className="block mb-1 text-sm font-medium">
                    {t('character.personality.systemPrompt')}
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <textarea
                    name="systemPrompt"
                    value={form.systemPrompt || ""}
                    onChange={handleChange}
                    className="w-full p-2 border rounded bg-primary/10 dark:bg-primary/20 border-primary/30 focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    placeholder={t('character.personality.systemPromptPlaceholder')}
                    rows={3}
                  />
                  {fieldErrors.systemPrompt && <p className="text-red-500 text-xs mt-1">{fieldErrors.systemPrompt}</p>}
                </div>

                {/* Tags */}
                <div className="mb-2">
                  <label className="block mb-1 text-sm font-medium">
                    {t('character.fields.tags')}
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    name="tags"
                    value={Array.isArray(form.tags) ? form.tags.join(", ") : form.tags || ""}
                    onChange={e => handleChange({ target: { name: "tags", value: e.target.value.split(/,\s*/) } })}
                    className="w-full h-9 px-3 border rounded bg-primary/10 dark:bg-primary/20 border-primary/30 focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    placeholder={t('character.fields.tagsPlaceholder')}
                  />
                  {fieldErrors.tags && <p className="text-red-500 text-xs mt-1">{fieldErrors.tags}</p>}
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

          {/* Confirmation Dialog */}
          {showConfirm && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={e => e.stopPropagation()}>
              <div className="bg-background-container-light dark:bg-background-container-dark rounded-2xl border-2 border-primary/30 shadow-2xl p-8 max-w-md w-full mx-4 relative animate-fade-in-up flex flex-col items-center">
                <h2 className="text-xl font-bold mb-4 text-primary">{t('character.confirmCreate')}</h2>
                <p className="mb-4 text-base text-center text-text-light dark:text-text-dark">{t('character.confirmCreateDesc')}</p>
                
                <div className="flex items-center gap-2 mb-2">
                  <button
                    type="button"
                    aria-pressed={confirmPublic}
                    onClick={() => setConfirmPublic(v => !v)}
                    className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${confirmPublic ? 'bg-primary' : 'bg-gray-400'}`}
                  >
                    <span
                      className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform duration-200 ${confirmPublic ? 'translate-x-6' : ''}`}
                    />
                  </button>
                  <label className="text-sm text-text-light dark:text-text-dark cursor-pointer select-none">
                    {t('character.public.title')}
                  </label>
                </div>
                <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mb-2">
                  {t('character.public.description')}
                </p>
                {confirmPublic && (
                  <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mb-2">
                    {t('character.public.warning')}
                  </p>
                )}
                
                <div className="flex gap-3 mt-4 w-full justify-center">
                  <button
                    className="px-4 py-1.5 rounded-lg bg-background-secondary-light dark:bg-background-secondary-dark hover:bg-background-light/90 dark:hover:bg-background-dark/90 transition-all duration-200 text-base font-semibold"
                    onClick={() => { setShowConfirm(false); onClose(); }}
                    type="button"
                  >
                    {t('common.actions.cancel')}
                  </button>
                  <button
                    className="px-4 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-all duration-200 text-base font-semibold flex items-center justify-center min-w-[80px]"
                    onClick={handleSubmit}
                    type="button"
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
          )}
        </div>
      </form>
    </div>
  );
} 