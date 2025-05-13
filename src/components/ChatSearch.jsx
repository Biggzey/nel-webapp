import React, { useState, useEffect, useRef } from 'react';

export default function ChatSearch({ messages, open, onClose, onJumpToMessage }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef(null);
  const resultsRef = useRef([]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }
    const q = query.toLowerCase();
    setResults(
      messages
        .map((msg, i) => ({ ...msg, index: i }))
        .filter(msg => msg.content && msg.content.toLowerCase().includes(q))
    );
    setSelected(0);
  }, [query, messages]);

  useEffect(() => {
    if (open && resultsRef.current[selected]) {
      resultsRef.current[selected].scrollIntoView({ block: 'nearest' });
    }
  }, [selected, open]);

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected(s => Math.min(s + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected(s => Math.max(s - 1, 0));
    } else if (e.key === 'Enter') {
      if (results[selected]) {
        onJumpToMessage(results[selected].index);
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-background-container-light dark:bg-background-container-dark rounded-xl shadow-2xl p-6 w-full max-w-xl mx-auto relative"
        onClick={e => e.stopPropagation()}
      >
        <button
          className="absolute top-1 right-3 text-gray-400 hover:text-gray-200"
          onClick={onClose}
          aria-label="Close search"
        >
          <i className="fas fa-times" />''
        </button>
        <input
          ref={inputRef}
          type="text"
          className="w-full p-3 rounded-lg bg-background-light dark:bg-background-dark text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary mb-4"
          placeholder="Search chat..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="max-h-80 overflow-y-auto space-y-2">
          {results.length === 0 && query && (
            <div className="text-gray-400 text-center py-8">No results found.</div>
          )}
          {results.map((msg, i) => (
            <div
              key={msg.id}
              ref={el => (resultsRef.current[i] = el)}
              className={`p-3 rounded-lg cursor-pointer transition-colors ${i === selected ? 'bg-primary/20 dark:bg-primary/30' : 'hover:bg-gray-700/30'}`}
              onClick={() => {
                onJumpToMessage(msg.index);
                onClose();
              }}
            >
              <span className="block text-xs text-gray-400 mb-1">{msg.role === 'user' ? 'You' : 'AI'}</span>
              <span className="block text-sm">
                {highlightTerm(msg.content, query)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function highlightTerm(text, term) {
  if (!term) return text;
  const parts = text.split(new RegExp(`(${escapeRegExp(term)})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === term.toLowerCase() ? (
      <mark key={i} className="bg-primary/40 text-primary font-bold rounded px-0.5">{part}</mark>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
} 