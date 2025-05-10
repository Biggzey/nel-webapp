import React, { useRef, useState } from 'react';
import { useToast } from './Toast';
import extractChunks from 'png-chunks-extract';
import PNGText from 'png-chunk-text';

const FORMATS = [
  { key: 'json', label: 'JSON', accept: '.json', icon: <i className="fas fa-file-code" /> },
  { key: 'png', label: 'PNG Card', accept: '.png', icon: <i className="fas fa-image" /> },
];

export default function CharacterImportModal({ open, onClose, onImport }) {
  const [error, setError] = useState(null);
  const fileInputs = useRef({});
  const { addToast } = useToast();

  if (!open) return null;

  function handleFileChange(format, e) {
    const file = e.target.files[0];
    if (!file) return;
    setError(null);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        let characterData;
        if (format === 'json') {
          // Restore robust JSON import logic
          let raw;
          try {
            raw = JSON.parse(event.target.result);
          } catch (err) {
            throw new Error('Invalid JSON file.');
          }
          if (raw.spec && raw.data) {
            // chub.ai/Character.AI card format
            const d = raw.data;
            characterData = {
              spec: raw.spec,
              specVersion: raw.spec_version || raw.specVersion,
              name: d.name,
              avatar: d.avatar,
              personality: d.personality || d.description || '',
              description: d.description || '',
              systemPrompt: d.system_prompt || '',
              customInstructions: d.creator_notes || '',
              firstMessage: d.first_mes || '',
              messageExample: d.mes_example || '',
              scenario: d.scenario || '',
              creatorNotes: d.creator_notes || '',
              alternateGreetings: d.alternate_greetings || [],
              tags: d.tags || [],
              creator: d.creator || '',
              characterVersion: d.character_version || '',
              extensions: d.extensions || null,
              age: d.age || '',
              gender: d.gender || '',
              race: d.race || '',
              occupation: d.job || d.occupation || '',
              likes: d.likes || '',
              dislikes: d.dislikes || '',
              backstory: d.backstory || '',
              fullImage: d.full_image || d.background_image || '',
              status: 'Ready to chat',
              bookmarked: false,
            };
          } else {
            // Fallback: assume it's already in our format
            characterData = raw;
          }
          // Validate required fields
          if (!characterData.name || !characterData.avatar) {
            throw new Error('Imported card is missing required fields (name, avatar).');
          }
        } else if (format === 'png') {
          // Use robust PNG chunk extraction
          const jsonData = await extractCharacterJsonFromPng(file);
          if (!jsonData) {
            throw new Error('No valid character data found in PNG. Only PNG cards exported from Character.AI, Janitor.AI, or compatible tools are supported.');
          }
          let d;
          if (jsonData.spec && jsonData.data) {
            d = jsonData.data;
          } else {
            d = jsonData;
          }
          characterData = {
            spec: jsonData.spec,
            specVersion: jsonData.spec_version || jsonData.specVersion,
            name: d.name,
            avatar: URL.createObjectURL(file),
            personality: d.personality || d.description || '',
            description: d.description || '',
            systemPrompt: d.system_prompt || '',
            customInstructions: d.creator_notes || '',
            firstMessage: d.first_mes || '',
            messageExample: d.mes_example || '',
            scenario: d.scenario || '',
            creatorNotes: d.creator_notes || '',
            alternateGreetings: d.alternate_greetings || [],
            tags: d.tags || [],
            creator: d.creator || '',
            characterVersion: d.character_version || '',
            extensions: d.extensions || null,
            age: d.age || '',
            gender: d.gender || '',
            race: d.race || '',
            occupation: d.job || d.occupation || '',
            likes: d.likes || '',
            dislikes: d.dislikes || '',
            backstory: d.backstory || '',
            fullImage: d.full_image || d.background_image || '',
            status: 'Ready to chat',
            bookmarked: false,
          };
          if (!characterData.name) {
            throw new Error('Imported PNG card is missing required field (name). Only PNG cards exported from Character.AI, Janitor.AI, or compatible tools are supported.');
          }
        }

        if (!characterData) throw new Error('Could not parse character card.');
        
        // Show success toast
        addToast({
          type: 'success',
          message: `Successfully imported ${characterData.name}`,
          duration: 3000
        });
        
        onImport(characterData);
        onClose();
      } catch (err) {
        console.error('Import error:', err);
        setError('Failed to import: ' + err.message);
        addToast({
          type: 'error',
          message: 'Failed to import character: ' + err.message,
          duration: 5000
        });
      }
    };
    if (format === 'png') {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  }

  function handleButtonClick(format) {
    fileInputs.current[format].click();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-background-container-light dark:bg-background-container-dark rounded-xl shadow-2xl p-8 w-full max-w-lg mx-auto relative"
        onClick={e => e.stopPropagation()}
      >
        <button
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-200"
          onClick={onClose}
          aria-label="Close import"
        >
          <i className="fas fa-times" />
        </button>
        <h2 className="text-xl font-bold mb-6">Import Character Card</h2>
        <div className="flex space-x-4 mb-4">
          {FORMATS.map(fmt => (
            <div key={fmt.key} className="flex flex-col items-center">
              <button
                className="flex flex-col items-center justify-center w-20 h-20 rounded-lg bg-background-light dark:bg-background-dark border border-gray-300 dark:border-gray-700 hover:bg-primary/10 focus:ring-2 focus:ring-primary transition"
                onClick={() => handleButtonClick(fmt.key)}
                type="button"
              >
                <span className="text-2xl mb-2">{fmt.icon}</span>
                <span className="text-xs font-semibold">{fmt.label}</span>
              </button>
              <input
                ref={el => (fileInputs.current[fmt.key] = el)}
                type="file"
                accept={fmt.accept}
                className="hidden"
                onChange={e => handleFileChange(fmt.key, e)}
              />
            </div>
          ))}
        </div>
        {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
        <div className="text-xs text-gray-400 mt-4">Supported: JSON, PNG Card (Character.AI, Janitor.AI, etc.)</div>
      </div>
    </div>
  );
}

// Extract embedded JSON from PNG tEXt chunks
async function extractCharacterJsonFromPng(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    const chunks = extractChunks(uint8);
    // Find all tEXt chunks
    const textChunks = chunks
      .filter(chunk => chunk.name === 'tEXt')
      .map(chunk => PNGText.decode(chunk.data));
    // Look for a chunk with JSON (commonly key is 'chara' or 'character')
    for (const { keyword, text } of textChunks) {
      if (
        keyword.toLowerCase().includes('chara') ||
        keyword.toLowerCase().includes('character') ||
        text.trim().startsWith('{')
      ) {
        try {
          const json = JSON.parse(text);
          return json;
        } catch (e) {
          // Not valid JSON, skip
        }
      }
    }
    return null;
  } catch (e) {
    return null;
  }
} 