// src/components/PersonalityModal.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useCharacter } from "../context/CharacterContext";
import { useLanguage } from "../context/LanguageContext";
import { CharacterPrompts } from "./CharacterPrompts";
import { useIsMobile } from "../hooks/useIsMobile";
import { extractCharacterDetails } from "../utils/characterDetails";
import { useToast } from './Toast';
import { useNotifications } from '../context/NotificationContext';

const DEFAULT_AVATAR = '/default-avatar.png'; // Use public root for default avatar

export default function PersonalityModal({ isOpen, initialData = {}, onClose, onSave, publicOnly = false, editOnly = false }) {
  console.log('Rendering PersonalityModal component');
  const { resetCurrentCharacter, submitForReview, reloadCharacters } = useCharacter();
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  // Defensive: ensure initialData is always an object
  const safeInitialData = typeof initialData === 'object' && initialData !== null ? initialData : {};
  // Defensive: ensure all fields are strings or arrays as expected
  function sanitizeForm(data) {
    const safe = { ...data };
    if (typeof safe.name !== 'string') safe.name = '';
    if (typeof safe.age !== 'string') safe.age = '';
    if (typeof safe.gender !== 'string') safe.gender = '';
    if (typeof safe.race !== 'string') safe.race = '';
    if (typeof safe.occupation !== 'string') safe.occupation = '';
    if (typeof safe.likes !== 'string') safe.likes = '';
    if (typeof safe.dislikes !== 'string') safe.dislikes = '';
    if (typeof safe.avatar !== 'string') safe.avatar = DEFAULT_AVATAR;
    if (typeof safe.fullImage !== 'string') safe.fullImage = '';
    if (typeof safe.description !== 'string') safe.description = '';
    if (typeof safe.backstory !== 'string') safe.backstory = '';
    if (typeof safe.systemPrompt !== 'string') safe.systemPrompt = '';
    if (typeof safe.customInstructions !== 'string') safe.customInstructions = '';
    if (!Array.isArray(safe.alternateGreetings)) safe.alternateGreetings = typeof safe.alternateGreetings === 'string' ? safe.alternateGreetings.split(/,\s*/) : [];
    if (!Array.isArray(safe.tags)) safe.tags = typeof safe.tags === 'string' ? safe.tags.split(/,\s*/) : [];
    if (typeof safe.creator !== 'string') safe.creator = '';
    if (typeof safe.characterVersion !== 'string') safe.characterVersion = '';
    if (typeof safe.extensions !== 'string') {
      try {
        safe.extensions = JSON.stringify(safe.extensions || {}, null, 2);
      } catch {
        safe.extensions = '{}';
      }
    }
    return safe;
  }
  // Log initialData and form
  console.log('Rendering PersonalityModal', { isOpen, initialData: safeInitialData });
  const [form, setForm] = useState(() => sanitizeForm(safeInitialData));
  const inputRefs = useRef({});
  const modalRef = useRef(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmPublic, setConfirmPublic] = useState(false);
  const { addToast } = useToast();
  const { fetchNotifications } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [nameError, setNameError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState(null);

  useEffect(() => {
    setForm(prev => sanitizeForm({
      ...safeInitialData,
      avatar: safeInitialData.avatar || DEFAULT_AVATAR
    }));
    setShowConfirm(false);
    setConfirmPublic(false);
  }, [safeInitialData, isOpen]);

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

  // Extract details when description changes
  useEffect(() => {
    if (form.description) {
      extractCharacterDetails(form.description);
    }
  }, [form.description, extractCharacterDetails]);

  if (!isOpen) return null;

  const isNew = initialData.name === "New Character";
  const title = isNew ? t('character.new') : t('character.edit');

  function autoResize(field) {
    const el = inputRefs.current[field];
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    autoResize(name);
  }

  function handleFileUpload(e, fieldName) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm((prev) => ({ ...prev, [fieldName]: reader.result }));
    };
    reader.readAsDataURL(file);
  }

  function validateRequiredFields() {
    if (editOnly) return {}; // Skip required validation in edit-only mode
    const errors = {};
    if (!form.name || form.name.trim() === '') errors.name = t('character.fields.nameRequired', 'Name is required');
    if (!form.description || form.description.trim() === '') errors.description = t('character.fields.descriptionRequired', 'Description is required');
    if (!form.avatar || form.avatar.trim() === '') errors.avatar = t('character.fields.avatarRequired', 'Avatar is required');
    if (!form.personality || form.personality.trim() === '') errors.personality = t('character.fields.personalityRequired', 'Personality is required');
    if (!form.systemPrompt || form.systemPrompt.trim() === '') errors.systemPrompt = t('character.fields.systemPromptRequired', 'System prompt is required');
    // Tags: always required, min 3
    const tagsArr = Array.isArray(form.tags) ? form.tags : (typeof form.tags === 'string' ? form.tags.split(/,\s*/) : []);
    if (!tagsArr || tagsArr.length < 3 || tagsArr.some(tag => !tag.trim())) {
      errors.tags = t('character.fields.tagsRequired', 'At least 3 tags are required.');
    }
    return errors;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFieldErrors({});
    setGlobalError(null);

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
        return;
      }

      // For new characters, create private first
      const privateRes = await fetch('/api/characters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : undefined
        },
        body: JSON.stringify({ ...form, isPublic: false })
      });

      if (!privateRes.ok) {
        const errorData = await privateRes.json();
        throw new Error(errorData.message || 'Failed to create character');
      }

      const privateChar = await privateRes.json();

      // If public, create public copy and submit for review
      if (form.isPublic) {
        try {
          const publicRes = await fetch('/api/characters', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : undefined
            },
            body: JSON.stringify({ ...privateChar, isPublic: true, id: undefined })
          });

          if (!publicRes.ok) {
            throw new Error('Failed to create public character for review');
          }

          const publicChar = await publicRes.json();

          // Send notification for character submission
          await fetch('/api/notifications', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : undefined
            },
            body: JSON.stringify({
              type: 'CHARACTER_SUBMITTED',
              title: t('notifications.characterSubmitted.title', 'Character submitted for approval'),
              message: t('notifications.characterSubmitted.message', 'Your character has been submitted for admin review. Please note any changes to your private version of this character will have no effect on the version pending approval. For any changes please contact support.'),
              metadata: { characterId: publicChar.id }
            })
          });

          addToast({
            type: 'success',
            message: t('character.submittedForApproval', 'Character created and submitted for review!'),
            duration: 3000
          });
        } catch (err) {
          addToast({
            type: 'error',
            message: t('character.reviewError', 'Character created but failed to submit for review. You can try submitting it later.'),
            duration: 4000
          });
        }
      }

      await reloadCharacters();
      onSave(privateChar);
    } catch (err) {
      setGlobalError(err.message);
      addToast({
        type: 'error',
        message: err.message || t('character.createError', 'Failed to create character'),
        duration: 3000
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  function handleReset() {
    resetCurrentCharacter();
    onClose();
  }

  // Field configurations with custom widths and placeholders
  const fields = [
    { label: t('character.fields.name'), field: "name", placeholder: t('character.fields.namePlaceholder') },
    { label: t('character.fields.description'), field: "description", placeholder: t('character.fields.descriptionPlaceholder') },
    { label: t('character.fields.age'), field: "age", placeholder: t('character.fields.agePlaceholder') },
    { label: t('character.fields.gender'), field: "gender", placeholder: t('character.fields.genderPlaceholder') },
    { label: t('character.fields.race'), field: "race", placeholder: t('character.fields.racePlaceholder') },
    { label: t('character.fields.occupation'), field: "occupation", placeholder: t('character.fields.occupationPlaceholder') },
    { label: t('character.fields.likes'), field: "likes", placeholder: t('character.fields.likesPlaceholder'), multiline: true },
    { label: t('character.fields.dislikes'), field: "dislikes", placeholder: t('character.fields.dislikesPlaceholder'), multiline: true },
  ];

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        {/* Backdrop */}
        <div className="absolute inset-0" onClick={onClose} />
        {/* Decorative background patterns */}
        <div className="absolute inset-0 opacity-70 pointer-events-none">
          {/* Top right decorative circle */}
          <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-accent-primary-light dark:bg-accent-primary-dark blur-3xl" />
          {/* Bottom left decorative circle */}
          <div className="absolute -bottom-20 -left-20 w-40 h-40 rounded-full bg-accent-secondary-light dark:bg-accent-secondary-dark blur-3xl" />
        </div>

        {/* Modal */}
        <form
          ref={modalRef}
          onSubmit={handleSubmit}
          className={`relative z-10 ${isMobile ? 'w-full h-full max-w-none max-h-none rounded-none' : 'w-full max-w-[90rem] rounded-xl max-h-[90vh]'} bg-background-container-light dark:bg-background-container-dark text-text-light dark:text-text-dark p-4 md:p-6 shadow-xl overflow-y-auto border-2 border-container-border-light dark:border-container-border-dark transition-all duration-300 hover:border-primary/40 hover:shadow-2xl animate-fade-in-up`}
          onClick={e => e.stopPropagation()}
        >
          {/* Subtle background gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-accent-primary-light/5 to-transparent dark:from-accent-primary-dark/5 rounded-xl pointer-events-none" />

          {/* Content container with backdrop blur */}
          <div className="relative">
            <div className={`flex ${isMobile ? 'flex-col' : 'gap-6'}`}>
              {/* Left Column - Character Details */}
              <div className={`${isMobile ? 'w-full' : 'w-[500px]'} space-y-3`}>
                <div className="bg-background-light dark:bg-background-dark rounded-lg p-3 border border-border-light dark:border-border-dark">
                  <h3 className="text-lg font-semibold mb-2">{t('character.details')}</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {fields.map(({ label, field, placeholder, multiline }) => (
                      <div key={field} className={multiline ? "col-span-1 md:col-span-2" : ""}>
                        <label className="block mb-1 text-sm font-medium">
                          {label}
                        </label>
                        {multiline ? (
                          <textarea
                            ref={el => inputRefs.current[field] = el}
                            name={field}
                            value={form[field] || ""}
                            onChange={handleChange}
                            placeholder={placeholder}
                            className={`w-full min-h-[32px] max-h-[120px] p-2 border rounded bg-background-container-light dark:bg-background-container-dark border-border-light dark:border-border-dark focus:border-primary focus:ring-1 focus:ring-primary transition-colors resize-none overflow-hidden ${fieldErrors[field] ? 'border-red-500' : ''}`}
                            rows={1}
                          />
                        ) : (
                          <input
                            name={field}
                            value={form[field] || ""}
                            onChange={handleChange}
                            placeholder={placeholder}
                            className={`w-full h-9 px-3 border rounded bg-background-container-light dark:bg-background-container-dark border-border-light dark:border-border-dark focus:border-primary focus:ring-1 focus:ring-primary transition-colors ${fieldErrors[field] ? 'border-red-500' : ''}`}
                          />
                        )}
                        {attemptedSubmit && fieldErrors[field] && (
                          <p className="text-red-500 text-xs mt-1 min-h-[18px]">{fieldErrors[field]}</p>
                        )}
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
                        className={`w-full h-9 px-3 mb-2 border rounded bg-background-container-light dark:bg-background-container-dark border-border-light dark:border-border-dark focus:border-primary focus:ring-1 focus:ring-primary transition-colors${fieldErrors.avatar ? ' border-red-500' : ''}`}
                      />
                      {fieldErrors.avatar && <p className="text-red-500 text-xs mt-1">{fieldErrors.avatar}</p>}
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

              {/* Right Column - Custom Prompts */}
              <div className={`${isMobile ? 'w-full mt-4' : 'flex-1'} space-y-2 flex flex-col`}>
                <div className="bg-background-light dark:bg-background-dark rounded-lg p-3 border border-border-light dark:border-border-dark flex-1 flex flex-col">
                  <h3 className="text-lg font-semibold mb-2">{t('character.personality.title')}</h3>
                  
                  {/* Main content wrapper */}
                  <div className="flex-1 flex flex-col">
                    {/* Personality */}
                    <div className="mb-2">
                      <label className="block mb-1 text-sm font-medium">
                        {t('character.fields.personality')}
                      </label>
                      <textarea
                        name="personality"
                        value={form.personality || ""}
                        onChange={handleChange}
                        rows={2}
                        className={`w-full p-2 border rounded bg-primary/10 dark:bg-primary/20 border-primary/30 focus:border-primary focus:ring-1 focus:ring-primary transition-colors${fieldErrors.personality ? ' border-red-500' : ''}`}
                        placeholder={t('character.fields.personalityPlaceholder')}
                      />
                      {attemptedSubmit && fieldErrors.personality && (
                        <p className="text-red-500 text-xs mt-1 min-h-[18px]">{fieldErrors.personality}</p>
                      )}
                      <p className="mt-0.5 text-xs text-text-secondary-light dark:text-text-secondary-dark">
                        {t('character.personality.traitsHelp')}
                      </p>
                    </div>

                    {/* System Prompt */}
                    <div className="mb-2">
                      <label className="block mb-1 text-sm font-medium">
                        {t('character.personality.systemPrompt')}
                      </label>
                      <textarea
                        name="systemPrompt"
                        value={form.systemPrompt || ""}
                        onChange={handleChange}
                        rows={2}
                        className={`w-full p-2 border rounded bg-primary/10 dark:bg-primary/20 border-primary/30 focus:border-primary focus:ring-1 focus:ring-primary transition-colors${fieldErrors.systemPrompt ? ' border-red-500' : ''}`}
                        placeholder={t('character.personality.systemPromptPlaceholder')}
                      />
                      {attemptedSubmit && fieldErrors.systemPrompt && (
                        <p className="text-red-500 text-xs mt-1 min-h-[18px]">{fieldErrors.systemPrompt}</p>
                      )}
                      <p className="mt-0.5 text-xs text-text-secondary-light dark:text-text-secondary-dark">
                        {t('character.personality.systemPromptHelp')}
                      </p>
                    </div>

                    {/* Tags */}
                    <div className="mb-2">
                      <label className="block mb-1 text-sm font-medium">
                        {t('character.fields.tags')}
                      </label>
                      <input
                        name="tags"
                        value={Array.isArray(form.tags) ? form.tags.join(", ") : form.tags || ""}
                        onChange={e => handleChange({ target: { name: "tags", value: e.target.value.split(/,\s*/) } })}
                        className={`w-full h-9 px-3 border rounded bg-primary/10 dark:bg-primary/20 border-primary/30 focus:border-primary focus:ring-1 focus:ring-primary transition-colors${fieldErrors.tags ? ' border-red-500' : ''}`}
                        placeholder={t('character.fields.tagsPlaceholder')}
                      />
                      {attemptedSubmit && fieldErrors.tags && (
                        <p className="text-red-500 text-xs mt-1 min-h-[18px]">{fieldErrors.tags}</p>
                      )}
                      <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-1">
                        {t('character.fields.tagsRequired', 'At least 3 tags are required.')}
                      </p>
                    </div>

                    {/* Custom Instructions */}
                    <div className="mb-2">
                      <label className="block mb-1 text-sm font-medium">
                        {t('character.personality.customInstructions')}
                      </label>
                      <textarea
                        name="customInstructions"
                        value={form.customInstructions || ""}
                        onChange={handleChange}
                        rows={2}
                        className="w-full p-2 border rounded bg-background-container-light dark:bg-background-container-dark border-border-light dark:border-border-dark focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                        placeholder={t('character.personality.customInstructionsPlaceholder')}
                      />
                      <p className="mt-0.5 text-xs text-text-secondary-light dark:text-text-secondary-dark">
                        {t('character.personality.customInstructionsHelp')}
                      </p>
                    </div>

                    {/* Backstory */}
                    <div className="mb-2">
                      <label className="block mb-1 text-sm font-medium">
                        {t('character.personality.backstory')}
                      </label>
                      <textarea
                        name="backstory"
                        value={form.backstory || ""}
                        onChange={handleChange}
                        rows={2}
                        className="w-full p-2 border rounded bg-background-container-light dark:bg-background-container-dark border-border-light dark:border-border-dark focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                        placeholder={t('character.personality.backstoryPlaceholder')}
                      />
                      <p className="mt-0.5 text-xs text-text-secondary-light dark:text-text-secondary-dark">
                        {t('character.personality.backstoryHelp')}
                      </p>
                    </div>

                    {/* First Message */}
                    <div className="mb-2">
                      <label className="block mb-1 text-sm font-medium">
                        {t('character.personality.firstMessage')}
                      </label>
                      <textarea
                        name="firstMessage"
                        value={form.firstMessage || ""}
                        onChange={handleChange}
                        rows={2}
                        className="w-full p-2 border rounded bg-background-container-light dark:bg-background-container-dark border-border-light dark:border-border-dark focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                        placeholder={t('character.personality.firstMessagePlaceholder')}
                      />
                    </div>

                    {/* Message Example */}
                    <div className="mb-2">
                      <label className="block mb-1 text-sm font-medium">
                        {t('character.personality.messageExample')}
                      </label>
                      <textarea
                        name="messageExample"
                        value={form.messageExample || ""}
                        onChange={handleChange}
                        rows={2}
                        className="w-full p-2 border rounded bg-background-container-light dark:bg-background-container-dark border-border-light dark:border-border-dark focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                        placeholder={t('character.personality.messageExamplePlaceholder')}
                      />
                    </div>

                    {/* Scenario */}
                    <div className="mb-2">
                      <label className="block mb-1 text-sm font-medium">
                        {t('character.personality.scenario')}
                      </label>
                      <textarea
                        name="scenario"
                        value={form.scenario || ""}
                        onChange={handleChange}
                        rows={2}
                        className="w-full p-2 border rounded bg-background-container-light dark:bg-background-container-dark border-border-light dark:border-border-dark focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                        placeholder={t('character.personality.scenarioPlaceholder')}
                      />
                    </div>

                    {/* Creator Notes */}
                    <div className="mb-2">
                      <label className="block mb-1 text-sm font-medium">
                        {t('character.personality.creatorNotes')}
                      </label>
                      <textarea
                        name="creatorNotes"
                        value={form.creatorNotes || ""}
                        onChange={handleChange}
                        rows={2}
                        className="w-full p-2 border rounded bg-background-container-light dark:bg-background-container-dark border-border-light dark:border-border-dark focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                        placeholder={t('character.personality.creatorNotesPlaceholder')}
                      />
                    </div>

                    {/* Alternate Greetings */}
                    <div className="mb-2">
                      <label className="block mb-1 text-sm font-medium">
                        {t('character.personality.alternateGreetings')}
                      </label>
                      <input
                        name="alternateGreetings"
                        value={Array.isArray(form.alternateGreetings) ? form.alternateGreetings.join(", ") : form.alternateGreetings || ""}
                        onChange={e => handleChange({ target: { name: "alternateGreetings", value: e.target.value.split(/,\s*/) } })}
                        className="w-full h-9 px-3 border rounded bg-background-container-light dark:bg-background-container-dark border-border-light dark:border-border-dark focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                        placeholder={t('character.personality.alternateGreetingsPlaceholder')}
                      />
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex items-center justify-end space-x-2 mt-auto pt-3 border-t border-border-light dark:border-border-dark">
                    {!isNew && (
                      <button
                        type="button"
                        onClick={handleReset}
                        title={t('character.actions.resetDefaults')}
                        className="p-2 text-red-500 hover:text-red-600 transition-colors hover:scale-110 transform duration-200"
                      >
                        <i className="fas fa-sync-alt" />
                      </button>
                    )}
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
                      disabled={publicOnly && Object.keys(validateRequiredFields()).length > 0}
                    >
                      {t('common.actions.save', 'Save')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            {/* Confirmation Portal (now inside the modal) */}
            {showConfirm && !editOnly && (
              <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={e => e.stopPropagation()}>
                <div className="bg-background-container-light dark:bg-background-container-dark rounded-2xl border-2 border-primary/30 shadow-2xl p-8 max-w-md w-full mx-4 relative animate-fade-in-up flex flex-col items-center">
                  <h2 className="text-xl font-bold mb-4 text-primary">{publicOnly ? t('character.confirmCreatePublic', 'Submit Public Character') : t('character.confirmCreate', 'Confirm Character Creation')}</h2>
                  <p className="mb-4 text-base text-center text-text-light dark:text-text-dark">{publicOnly ? t('character.confirmCreatePublicDesc', 'This character will be submitted for public review and, if approved, will be visible to all users.') : t('character.confirmCreateDesc', 'Are you sure you want to create this character?')}</p>
                  {!publicOnly && (
                    <>
                      <div className="flex items-center gap-2 mb-2">
                        {/* Toggle for Make Public */}
                        <button
                          type="button"
                          aria-pressed={confirmPublic}
                          onClick={e => { e.preventDefault(); e.stopPropagation(); setConfirmPublic(v => !v); }}
                          className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${confirmPublic ? 'bg-primary' : 'bg-gray-400'}`}
                        >
                          <span
                            className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform duration-200 ${confirmPublic ? 'translate-x-6' : ''}`}
                          />
                        </button>
                        <label htmlFor="public-toggle" className="text-sm text-text-light dark:text-text-dark cursor-pointer select-none">
                          {t('character.public.title', 'Make Public')}
                        </label>
                      </div>
                      <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mb-2">
                        {t('character.public.description', 'Submit this character to the public explore page for others to use. Requires admin approval.')}
                      </p>
                      {confirmPublic && (
                        <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mb-2">
                          {t('character.public.warning', 'Note: Deleting your private character will not remove your public submission. If you wish to request deletion of your public submission, please contact support (feature coming soon).')}
                        </p>
                      )}
                    </>
                  )}
                  <div className="flex gap-3 mt-4 w-full justify-center">
                    <button
                      className="px-4 py-1.5 rounded-lg bg-background-secondary-light dark:bg-background-secondary-dark hover:bg-background-light/90 dark:hover:bg-background-dark/90 transition-all duration-200 text-base font-semibold"
                      onClick={() => { setShowConfirm(false); onClose(); }}
                      type="button"
                    >
                      {t('common.actions.cancel', 'Cancel')}
                    </button>
                    <button
                      className="px-4 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-all duration-200 text-base font-semibold flex items-center justify-center min-w-[80px]"
                      onClick={async () => { await handleSubmit(e); }}
                      type="button"
                      disabled={loading}
                    >
                      {loading ? (
                        <span className="loader border-2 border-white border-t-transparent rounded-full w-5 h-5 mr-2 animate-spin" />
                      ) : null}
                      {t('common.actions.save', 'Save')}
                    </button>
                  </div>
                  {nameError && (
                    <div className="text-red-500 text-sm mt-2">{nameError}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </form>
      </div>
    </>
  );
}
