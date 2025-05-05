// src/components/PersonalityModal.jsx
import React, { useState, useEffect, useRef } from "react";
import { useCharacter } from "../context/CharacterContext";
import { CharacterPrompts } from "./CharacterPrompts";

export default function PersonalityModal({ isOpen, initialData, onClose, onSave }) {
  const { resetCurrentCharacter } = useCharacter();
  const [form, setForm] = useState(initialData);
  const inputRefs = useRef({});

  useEffect(() => {
    setForm(initialData);
  }, [initialData]);

  if (!isOpen) return null;

  const isNew = initialData.name === "New Character";
  const title = isNew ? "New Character" : "Edit Character";

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

  function handleSubmit(e) {
    e.preventDefault();
    onSave(form);
  }

  function handleReset() {
    resetCurrentCharacter();
    onClose();
  }

  // Field configurations with custom widths and placeholders
  const fields = [
    { label: "Name", field: "name", placeholder: "Character name" },
    { label: "Age", field: "age", placeholder: "Age" },
    { label: "Gender", field: "gender", placeholder: "Gender" },
    { label: "Race", field: "race", placeholder: "Race/Species" },
    { label: "Occupation", field: "occupation", placeholder: "Character's role" },
    { label: "Likes", field: "likes", placeholder: "Enter likes separated by commas (e.g., cats, reading, coffee)", multiline: true },
    { label: "Dislikes", field: "dislikes", placeholder: "Enter dislikes separated by commas (e.g., rain, loud noises, spiders)", multiline: true },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />

      {/* Modal */}
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-6xl rounded-lg bg-background-light dark:bg-background-dark text-gray-800 dark:text-gray-100 p-5 shadow-lg overflow-y-auto max-h-[90vh] border-2 border-border-light dark:border-border-dark"
      >
        <h2 className="text-2xl font-semibold mb-3">{title}</h2>

        <div className="flex gap-5">
          {/* Left Column - Character Details */}
          <div className="w-[400px] space-y-3">
            <h3 className="text-lg font-semibold mb-2">Character Details</h3>
            
            <div className="grid grid-cols-2 gap-3">
              {fields.map(({ label, field, placeholder, multiline }) => (
                <div key={field} className={multiline ? "col-span-2" : ""}>
                  <label className="block mb-1 text-sm font-medium">{label}</label>
                  {multiline ? (
                    <textarea
                      ref={el => inputRefs.current[field] = el}
                      name={field}
                      value={form[field] || ""}
                      onChange={handleChange}
                      placeholder={placeholder}
                      className="w-full min-h-[32px] max-h-[120px] p-1.5 border rounded bg-background-light dark:bg-background-dark border-border-light dark:border-border-dark resize-none overflow-hidden"
                      rows={1}
                    />
                  ) : (
                    <input
                      name={field}
                      value={form[field] || ""}
                      onChange={handleChange}
                      placeholder={placeholder}
                      className="w-full h-8 px-2 border rounded bg-background-light dark:bg-background-dark border-border-light dark:border-border-dark"
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Images */}
            <div className="space-y-3">
              <div>
                <label className="block mb-1 text-sm font-medium">Avatar URL or Upload</label>
                <input
                  name="avatar"
                  value={form.avatar || ""}
                  onChange={handleChange}
                  placeholder="https://example.com/avatar.png"
                  className="w-full h-8 px-2 mb-1 border rounded bg-background-light dark:bg-background-dark border-border-light dark:border-border-dark"
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, "avatar")}
                  className="text-sm file:mr-4 file:py-1.5 file:px-4 file:rounded file:border-0 file:bg-blue-500 dark:file:bg-blue-600 file:text-white hover:file:bg-blue-600 dark:hover:file:bg-blue-700 file:cursor-pointer"
                />
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium">Full-Body Image URL or Upload</label>
                <input
                  name="fullImage"
                  value={form.fullImage || ""}
                  onChange={handleChange}
                  placeholder="https://example.com/full.png"
                  className="w-full h-8 px-2 mb-1 border rounded bg-background-light dark:bg-background-dark border-border-light dark:border-border-dark"
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, "fullImage")}
                  className="text-sm file:mr-4 file:py-1.5 file:px-4 file:rounded file:border-0 file:bg-blue-500 dark:file:bg-blue-600 file:text-white hover:file:bg-blue-600 dark:hover:file:bg-blue-700 file:cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Right Column - Custom Prompts */}
          <div className="flex-1 space-y-3">
            <h3 className="text-lg font-semibold mb-2">Personality Configuration</h3>
            
            {/* Personality */}
            <div>
              <label className="block mb-1 text-sm font-medium">Personality</label>
              <textarea
                name="personality"
                value={form.personality || ""}
                onChange={handleChange}
                rows={2}
                className="w-full min-h-[32px] max-h-[120px] p-1.5 border rounded bg-background-light dark:bg-background-dark border-border-light dark:border-border-dark"
                placeholder="Describe the character's core personality traits and behaviors..."
              />
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Define the character's personality traits, mannerisms, and general behavior patterns.
              </p>
            </div>

            {/* Backstory */}
            <div>
              <label className="block mb-1 text-sm font-medium">Backstory</label>
              <textarea
                name="backstory"
                value={form.backstory || ""}
                onChange={handleChange}
                rows={2}
                className="w-full min-h-[32px] max-h-[120px] p-1.5 border rounded bg-background-light dark:bg-background-dark border-border-light dark:border-border-dark"
                placeholder="Write the character's background story and history..."
              />
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Provide background information that shapes the character's perspective and responses.
              </p>
            </div>

            <CharacterPrompts
              systemPrompt={form.systemPrompt || ""}
              customInstructions={form.customInstructions || ""}
              onChange={(field, value) => handleChange({ target: { name: field, value } })}
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="mt-4 flex items-center justify-between border-t border-border-light dark:border-border-dark pt-3">
          <div className="flex items-center space-x-3">
            {!isNew && (
              <button
                type="button"
                onClick={handleReset}
                title="Reset to Defaults"
                className="p-2 text-red-500 hover:text-red-600 transition"
              >
                <i className="fas fa-sync-alt" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded bg-background-secondary-light dark:bg-background-secondary-dark hover:bg-background-light/90 dark:hover:bg-background-dark/90 transition"
            >
              Cancel
            </button>
          </div>
          <button
            type="submit"
            className="px-4 py-1.5 rounded bg-primary text-white hover:bg-primary/90 transition"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
