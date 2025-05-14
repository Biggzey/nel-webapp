import React, { useState, useEffect, useRef } from "react";
import { useCharacter } from "../context/CharacterContext";
import { useLanguage } from "../context/LanguageContext";
import { useIsMobile } from "../hooks/useIsMobile";
import { useToast } from './Toast';

const DEFAULT_AVATAR = '/default-avatar.png';

/**
 * PrivatePersonalityModal is a wrapper for PersonalityModal that always enforces private mode.
 * Use this for private character creation (e.g., Sidebar).
 */
export default function PrivatePersonalityModal({ isOpen, initialData = {}, onClose, onSave }) {
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const { addToast } = useToast();
  const [form, setForm] = useState(initialData);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRefs = useRef({});

  useEffect(() => {
    setForm(initialData);
  }, [initialData]);

  function validateRequiredFields() {
    const errors = {};
    if (!form.name || form.name.trim() === '') errors.name = t('character.fields.nameRequired');
    if (!form.description || form.description.trim() === '') errors.description = t('character.fields.descriptionRequired');
    if (!form.avatar || form.avatar.trim() === '') errors.avatar = t('character.fields.avatarRequired');
    if (!form.personality || form.personality.trim() === '') errors.personality = t('character.fields.personalityRequired');
    if (!form.systemPrompt || form.systemPrompt.trim() === '') errors.systemPrompt = t('character.fields.systemPromptRequired');
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

    try {
      const errors = validateRequiredFields();
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        addToast({ type: 'error', message: t('character.fields.missingFields'), duration: 3000 });
        return;
      }

      const res = await fetch('/api/characters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : undefined
        },
        body: JSON.stringify({ ...form, isPublic: false })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to create character');
      }

      const newChar = await res.json();
      onSave(newChar);
      addToast({ type: 'success', message: t('character.addedToPrivate'), duration: 3000 });
    } catch (err) {
      addToast({ type: 'error', message: err.message || t('character.createError'), duration: 3000 });
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
      <div className="relative z-10 w-full max-w-4xl bg-background-container-light dark:bg-background-container-dark rounded-xl p-6 shadow-xl">
        <h2 className="text-2xl font-bold mb-4">{t('character.new')}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Required Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1 text-sm font-medium">
                {t('character.fields.name')}
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                name="name"
                value={form.name || ""}
                onChange={handleChange}
                className={`w-full p-2 border rounded bg-primary/10 dark:bg-primary/20 border-primary/30 focus:border-primary focus:ring-1 focus:ring-primary transition-colors ${fieldErrors.name ? 'border-red-500' : ''}`}
                placeholder={t('character.fields.namePlaceholder')}
              />
              {fieldErrors.name && <p className="text-red-500 text-xs mt-1">{fieldErrors.name}</p>}
            </div>

            <div>
              <label className="block mb-1 text-sm font-medium">
                {t('character.fields.description')}
                <span className="text-red-500 ml-1">*</span>
              </label>
              <textarea
                name="description"
                value={form.description || ""}
                onChange={handleChange}
                className={`w-full p-2 border rounded bg-primary/10 dark:bg-primary/20 border-primary/30 focus:border-primary focus:ring-1 focus:ring-primary transition-colors ${fieldErrors.description ? 'border-red-500' : ''}`}
                placeholder={t('character.fields.descriptionPlaceholder')}
                rows={3}
              />
              {fieldErrors.description && <p className="text-red-500 text-xs mt-1">{fieldErrors.description}</p>}
            </div>
          </div>

          {/* Other fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1 text-sm font-medium">{t('character.fields.age')}</label>
              <input
                name="age"
                value={form.age || ""}
                onChange={handleChange}
                className="w-full p-2 border rounded bg-background-container-light dark:bg-background-container-dark border-border-light dark:border-border-dark focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                placeholder={t('character.fields.agePlaceholder')}
              />
            </div>

            <div>
              <label className="block mb-1 text-sm font-medium">{t('character.fields.gender')}</label>
              <input
                name="gender"
                value={form.gender || ""}
                onChange={handleChange}
                className="w-full p-2 border rounded bg-background-container-light dark:bg-background-container-dark border-border-light dark:border-border-dark focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                placeholder={t('character.fields.genderPlaceholder')}
              />
            </div>
          </div>

          {/* Required Personality Fields */}
          <div>
            <label className="block mb-1 text-sm font-medium">
              {t('character.fields.personality')}
              <span className="text-red-500 ml-1">*</span>
            </label>
            <textarea
              name="personality"
              value={form.personality || ""}
              onChange={handleChange}
              className={`w-full p-2 border rounded bg-primary/10 dark:bg-primary/20 border-primary/30 focus:border-primary focus:ring-1 focus:ring-primary transition-colors ${fieldErrors.personality ? 'border-red-500' : ''}`}
              placeholder={t('character.fields.personalityPlaceholder')}
              rows={3}
            />
            {fieldErrors.personality && <p className="text-red-500 text-xs mt-1">{fieldErrors.personality}</p>}
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">
              {t('character.personality.systemPrompt')}
              <span className="text-red-500 ml-1">*</span>
            </label>
            <textarea
              name="systemPrompt"
              value={form.systemPrompt || ""}
              onChange={handleChange}
              className={`w-full p-2 border rounded bg-primary/10 dark:bg-primary/20 border-primary/30 focus:border-primary focus:ring-1 focus:ring-primary transition-colors ${fieldErrors.systemPrompt ? 'border-red-500' : ''}`}
              placeholder={t('character.personality.systemPromptPlaceholder')}
              rows={3}
            />
            {fieldErrors.systemPrompt && <p className="text-red-500 text-xs mt-1">{fieldErrors.systemPrompt}</p>}
          </div>

          {/* Required Tags */}
          <div>
            <label className="block mb-1 text-sm font-medium">
              {t('character.fields.tags')}
              <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              name="tags"
              value={Array.isArray(form.tags) ? form.tags.join(", ") : form.tags || ""}
              onChange={e => handleChange({ target: { name: "tags", value: e.target.value.split(/,\s*/) } })}
              className={`w-full p-2 border rounded bg-primary/10 dark:bg-primary/20 border-primary/30 focus:border-primary focus:ring-1 focus:ring-primary transition-colors ${fieldErrors.tags ? 'border-red-500' : ''}`}
              placeholder={t('character.fields.tagsPlaceholder')}
            />
            {fieldErrors.tags && <p className="text-red-500 text-xs mt-1">{fieldErrors.tags}</p>}
          </div>

          {/* Required Avatar */}
          <div>
            <label className="block mb-1 text-sm font-medium">
              {t('character.fields.avatar')}
              <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              name="avatar"
              value={form.avatar || ""}
              onChange={handleChange}
              className={`w-full p-2 border rounded bg-primary/10 dark:bg-primary/20 border-primary/30 focus:border-primary focus:ring-1 focus:ring-primary transition-colors ${fieldErrors.avatar ? 'border-red-500' : ''}`}
              placeholder={t('character.fields.avatarPlaceholder')}
            />
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileUpload(e, "avatar")}
              className="mt-2 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-white hover:file:bg-primary/90 file:transition-colors file:cursor-pointer w-full"
            />
            {fieldErrors.avatar && <p className="text-red-500 text-xs mt-1">{fieldErrors.avatar}</p>}
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-background-secondary-light dark:bg-background-secondary-dark hover:bg-background-light/90 dark:hover:bg-background-dark/90 transition-all duration-200"
            >
              {t('common.actions.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-all duration-200"
            >
              {isSubmitting ? t('common.actions.saving') : t('common.actions.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 