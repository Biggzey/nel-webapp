import React, { useRef, useState } from 'react';

const FORMATS = [
  { key: 'json', label: 'JSON', accept: '.json', icon: <i className="fas fa-file-code" /> },
  { key: 'v2', label: 'V2 Card', accept: '.v2,.card', icon: <i className="fas fa-id-card" /> },
  { key: 'png', label: 'PNG Card', accept: '.png', icon: <i className="fas fa-image" /> },
];

export default function CharacterImportModal({ open, onClose, onImport }) {
  const [error, setError] = useState(null);
  const fileInputs = useRef({});

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
          characterData = JSON.parse(event.target.result);
        } else if (format === 'v2') {
          // TODO: parse V2 card format
          characterData = parseV2Card(event.target.result);
        } else if (format === 'png') {
          // TODO: parse PNG card format (extract metadata)
          characterData = await parsePngCard(file);
        }
        if (!characterData) throw new Error('Could not parse character card.');
        onImport(characterData);
        onClose();
      } catch (err) {
        setError('Failed to import: ' + err.message);
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
        <div className="text-xs text-gray-400 mt-4">Supported: JSON, V2 Card, PNG Card (Character.AI, Janitor.AI, etc.)</div>
      </div>
    </div>
  );
}

// Placeholder for V2 card parsing
function parseV2Card(text) {
  // TODO: implement actual V2 card parsing
  throw new Error('V2 card import not yet implemented.');
}

// Placeholder for PNG card parsing
async function parsePngCard(file) {
  // TODO: implement actual PNG card metadata extraction
  throw new Error('PNG card import not yet implemented.');
} 