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
          const raw = JSON.parse(event.target.result);
          // Detect chub.ai/Character.AI card format
          if (raw.spec && raw.data) {
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
              status: d.status || '',
              bookmarked: false,
            };
          } else {
            // Fallback: assume it's already in our format
            characterData = raw;
          }
          // Validate required fields
          if (!characterData.name || !characterData.avatar) {
            setError('Imported card is missing required fields (name, avatar).');
            return;
          }
        } else if (format === 'v2') {
          characterData = parseV2Card(event.target.result);
        } else if (format === 'png') {
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

// V2 card parser
function parseV2Card(text) {
  try {
    // Split the text into sections
    const sections = text.split('---').map(s => s.trim()).filter(Boolean);
    const data = {};

    // Parse each section
    sections.forEach(section => {
      const lines = section.split('\n').map(l => l.trim()).filter(Boolean);
      const key = lines[0].toLowerCase();
      const value = lines.slice(1).join('\n');

      switch (key) {
        case 'name':
          data.name = value;
          break;
        case 'avatar':
          data.avatar = value;
          break;
        case 'description':
          data.personality = value;
          break;
        case 'personality':
          data.personality = value;
          break;
        case 'first_mes':
          data.firstMessage = value;
          break;
        case 'mes_example':
          data.messageExample = value;
          break;
        case 'scenario':
          data.scenario = value;
          break;
        case 'creator_notes':
          data.creatorNotes = value;
          break;
        case 'tags':
          data.tags = value.split(',').map(t => t.trim());
          break;
        case 'creator':
          data.creator = value;
          break;
        case 'character_version':
          data.characterVersion = value;
          break;
        case 'age':
          data.age = value;
          break;
        case 'gender':
          data.gender = value;
          break;
        case 'race':
          data.race = value;
          break;
        case 'occupation':
          data.occupation = value;
          break;
        case 'likes':
          data.likes = value;
          break;
        case 'dislikes':
          data.dislikes = value;
          break;
        case 'backstory':
          data.backstory = value;
          break;
        case 'full_image':
        case 'background_image':
          data.fullImage = value;
          break;
      }
    });

    // Validate required fields
    if (!data.name || !data.avatar) {
      throw new Error('Imported card is missing required fields (name, avatar).');
    }

    return {
      ...data,
      bookmarked: false,
      status: 'Ready to chat'
    };
  } catch (error) {
    console.error('Error parsing V2 card:', error);
    throw new Error('Failed to parse V2 card format.');
  }
}

// PNG card parser
async function parsePngCard(file) {
  try {
    // Create a canvas to load the image
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Load the image
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });

    // Set canvas size to image size
    canvas.width = img.width;
    canvas.height = img.height;

    // Draw image to canvas
    ctx.drawImage(img, 0, 0);

    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Look for PNG tEXt chunks (metadata)
    let metadata = {};
    let offset = 0;

    while (offset < data.length) {
      // Check for tEXt chunk
      if (data[offset] === 116 && // 't'
          data[offset + 1] === 69 && // 'E'
          data[offset + 2] === 88 && // 'X'
          data[offset + 3] === 116) { // 't'
        
        // Get chunk length
        const length = (data[offset - 4] << 24) | 
                      (data[offset - 3] << 16) | 
                      (data[offset - 2] << 8) | 
                      data[offset - 1];

        // Extract key-value pair
        const text = new TextDecoder().decode(data.slice(offset + 4, offset + 4 + length));
        const [key, value] = text.split('\0');
        
        // Map common metadata keys to our schema
        switch (key.toLowerCase()) {
          case 'name':
            metadata.name = value;
            break;
          case 'description':
          case 'personality':
            metadata.personality = value;
            break;
          case 'first_mes':
            metadata.firstMessage = value;
            break;
          case 'mes_example':
            metadata.messageExample = value;
            break;
          case 'scenario':
            metadata.scenario = value;
            break;
          case 'creator_notes':
            metadata.creatorNotes = value;
            break;
          case 'tags':
            metadata.tags = value.split(',').map(t => t.trim());
            break;
          case 'creator':
            metadata.creator = value;
            break;
          case 'character_version':
            metadata.characterVersion = value;
            break;
          case 'age':
            metadata.age = value;
            break;
          case 'gender':
            metadata.gender = value;
            break;
          case 'race':
            metadata.race = value;
            break;
          case 'occupation':
            metadata.occupation = value;
            break;
          case 'likes':
            metadata.likes = value;
            break;
          case 'dislikes':
            metadata.dislikes = value;
            break;
          case 'backstory':
            metadata.backstory = value;
            break;
        }
      }
      offset += 4;
    }

    // Use the image itself as the avatar
    metadata.avatar = URL.createObjectURL(file);

    // Validate required fields
    if (!metadata.name) {
      throw new Error('Imported card is missing required field (name).');
    }

    return {
      ...metadata,
      bookmarked: false,
      status: 'Ready to chat'
    };
  } catch (error) {
    console.error('Error parsing PNG card:', error);
    throw new Error('Failed to parse PNG card format.');
  }
} 