import React, { useRef, useState } from 'react';
import { useToast } from './Toast';
import extractChunks from 'png-chunks-extract';
import PNGText from 'png-chunk-text';
import pako from 'pako';
import { extractCharacterDetails } from '../utils/characterDetails';

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
    if (format === 'png') {
      console.error('PNG import handler triggered for file:', file);
      console.log('File details:', {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified
      });
    }
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
          // Extract and populate details from description
          characterData = extractCharacterDetails(characterData);
        } else if (format === 'png') {
          // Use robust PNG chunk extraction
          let jsonData;
          try {
            jsonData = await extractCharacterJsonFromPng(file);
          } catch (chunkErr) {
            console.error('Error extracting JSON from PNG:', chunkErr);
            setError('Failed to extract JSON from PNG: ' + (chunkErr.message || chunkErr.toString()));
            addToast({
              type: 'error',
              message: 'Failed to extract JSON from PNG: ' + (chunkErr.message || chunkErr.toString()),
              duration: 5000
            });
            Object.values(fileInputs.current).forEach(input => { if (input) input.disabled = true; });
            return;
          }
          if (!jsonData) {
            setError('No valid character data found in PNG. Only PNG cards exported from Character.AI, Janitor.AI, or compatible tools are supported.');
            addToast({
              type: 'error',
              message: 'No valid character data found in PNG. Only PNG cards exported from Character.AI, Janitor.AI, or compatible tools are supported.',
              duration: 5000
            });
            Object.values(fileInputs.current).forEach(input => { if (input) input.disabled = true; });
            return;
          }
          let d;
          if (jsonData.spec && jsonData.data) {
            d = jsonData.data;
          } else {
            d = jsonData;
          }
          // Read the file as a Data URL for persistent avatar storage
          const avatarDataUrl = await new Promise((resolve, reject) => {
            const reader2 = new FileReader();
            reader2.onload = () => resolve(reader2.result);
            reader2.onerror = reject;
            reader2.readAsDataURL(file);
          });
          characterData = {
            spec: jsonData.spec,
            specVersion: jsonData.spec_version || jsonData.specVersion,
            name: d.name,
            avatar: avatarDataUrl,
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
            setError('Imported PNG card is missing required field (name). Only PNG cards exported from Character.AI, Janitor.AI, or compatible tools are supported.');
            addToast({
              type: 'error',
              message: 'Imported PNG card is missing required field (name). Only PNG cards exported from Character.AI, Janitor.AI, or compatible tools are supported.',
              duration: 5000
            });
            Object.values(fileInputs.current).forEach(input => { if (input) input.disabled = true; });
            return;
          }
          // Extract and populate details from description
          characterData = extractCharacterDetails(characterData);
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
        setError('Failed to import: ' + (err.message || err.toString()));
        addToast({
          type: 'error',
          message: 'Failed to import character: ' + (err.message || err.toString()),
          duration: 5000
        });
        if (err.stack) {
          console.error('Stack trace:', err.stack);
        }
        // Disable further import attempts until modal is closed
        Object.values(fileInputs.current).forEach(input => { if (input) input.disabled = true; });
      }
    };
    if (format === 'png') {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  }

  function handleButtonClick(format) {
    if (error) return; // Prevent import if error is present
    fileInputs.current[format].disabled = false;
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

// Extract embedded JSON from PNG tEXt, zTXt, and iTXt chunks
async function extractCharacterJsonFromPng(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    const chunks = extractChunks(uint8);
    // Debug: log all chunk types and their lengths
    console.log('PNG chunks:', chunks.map(chunk => ({ name: chunk.name, length: chunk.data.length })));
    // tEXt chunks
    const textChunks = chunks
      .filter(chunk => chunk.name === 'tEXt')
      .map(chunk => {
        try {
          return PNGText.decode(chunk.data);
        } catch (e) {
          console.error('Error decoding tEXt chunk:', e, chunk);
          return { keyword: 'tEXt', text: '' };
        }
      });
    // zTXt chunks (compressed)
    const ztxtChunks = chunks
      .filter(chunk => chunk.name === 'zTXt')
      .map(chunk => {
        try {
          return decodeZtxtChunk(chunk.data);
        } catch (e) {
          console.error('Error decoding zTXt chunk:', e, chunk);
          return { keyword: 'zTXt', text: '' };
        }
      });
    // iTXt chunks (optional, not always present)
    const itxtChunks = chunks
      .filter(chunk => chunk.name === 'iTXt')
      .map(chunk => {
        try {
          return decodeITXtChunk(chunk.data);
        } catch (e) {
          console.error('Error decoding iTXt chunk:', e, chunk);
          return { keyword: 'iTXt', text: '' };
        }
      });
    // Combine all chunks
    const allChunks = [...textChunks, ...ztxtChunks, ...itxtChunks];
    // Debug: log all found keywords and first 100 chars of text
    console.log('PNG Card Import: Found chunks:', allChunks.map(c => ({ keyword: c.keyword, text: c.text?.slice(0, 100) })));
    // Look for a chunk with JSON (try common keywords and any chunk that looks like JSON)
    for (const { keyword = '', text = '' } of allChunks) {
      if (
        keyword.toLowerCase().includes('chara') ||
        keyword.toLowerCase().includes('character') ||
        text.trim().startsWith('{')
      ) {
        // Try direct JSON parse
        try {
          return JSON.parse(text);
        } catch (e) {
          // If direct parse fails, try base64 decode then parse
          try {
            const base64 = text.replace(/\s/g, '');
            const decoded = atob(base64);
            return JSON.parse(decoded);
          } catch (e2) {
            console.error('Error parsing JSON from chunk (base64 fallback):', e2, { keyword, text: text.slice(0, 100) });
            // Not valid JSON/base64, skip
          }
        }
      }
    }
    return null;
  } catch (e) {
    console.error('Error in extractCharacterJsonFromPng:', e);
    return null;
  }
}

// Manual zTXt chunk decoder
function decodeZtxtChunk(data) {
  // zTXt: [keyword][null][compression method][compressed text]
  let i = 0;
  while (data[i] !== 0 && i < data.length) i++;
  const keyword = String.fromCharCode(...data.slice(0, i));
  const compressionMethod = data[i + 1];
  const compressedText = data.slice(i + 2);
  if (compressionMethod === 0) {
    try {
      const text = pako.inflate(compressedText, { to: 'string' });
      return { keyword, text };
    } catch (e) {
      return { keyword, text: '' };
    }
  }
  return { keyword, text: '' };
}

// Manual iTXt chunk decoder (basic, non-compressed only)
function decodeITXtChunk(data) {
  // iTXt: [keyword][null][compression flag][compression method][null][lang tag][null][translated keyword][null][text]
  let i = 0;
  while (data[i] !== 0 && i < data.length) i++;
  const keyword = String.fromCharCode(...data.slice(0, i));
  let j = i + 1;
  const compressionFlag = data[j];
  const compressionMethod = data[j + 1];
  j += 2;
  while (data[j] !== 0 && j < data.length) j++;
  j++; // skip lang tag null
  while (data[j] !== 0 && j < data.length) j++;
  j++; // skip translated keyword null
  const textData = data.slice(j);
  let text = '';
  if (compressionFlag === 0) {
    text = String.fromCharCode(...textData);
  } else if (compressionFlag === 1 && compressionMethod === 0) {
    try {
      text = pako.inflate(textData, { to: 'string' });
    } catch (e) {
      text = '';
    }
  }
  return { keyword, text };
} 