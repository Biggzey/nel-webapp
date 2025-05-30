// src/components/Sidebar.jsx
import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCharacter } from "../context/CharacterContext";
import { useLanguage } from "../context/LanguageContext";
import ProfileDropdown from "./ProfileDropdown";
import { useChat } from "../hooks/useChat";
import CharacterImportModal from "./CharacterImportModal";
import { useToast } from "./Toast";
import { useIsMobile } from '../hooks/useIsMobile';
import { TrashIcon } from "@heroicons/react/24/outline";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ReactDOM from "react-dom";
import PrivatePersonalityModal from './PrivatePersonalityModal';
import Notifications from './Notifications';
import { useNotifications } from '../context/NotificationContext';

// Portal component for context menu
function ContextMenuPortal({ anchorRef, isOpen, children, onClose }) {
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const menuRef = useRef(null);

  useEffect(() => {
    if (isOpen && anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      // Clamp left to sidebar (assume sidebar is at left: 0)
      const sidebar = document.querySelector('.w-72, .md\\:w-80');
      let sidebarLeft = 0;
      let sidebarWidth = 320; // fallback
      if (sidebar) {
        const sidebarRect = sidebar.getBoundingClientRect();
        sidebarLeft = sidebarRect.left + window.scrollX;
        sidebarWidth = sidebarRect.width;
      }
      let left = rect.left + window.scrollX;
      // Clamp right edge to sidebar right edge
      const menuWidth = 200; // min width
      if (left + menuWidth > sidebarLeft + sidebarWidth) {
        left = sidebarLeft + sidebarWidth - menuWidth - 8; // 8px padding
      }
      if (left < sidebarLeft) left = sidebarLeft + 8;
      setPosition({
        top: rect.bottom + window.scrollY,
        left,
        width: rect.width,
      });
    }
  }, [isOpen, anchorRef]);

  // Click-away and Escape handling
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose && onClose();
      }
    }
    function handleKey(e) {
      if (e.key === 'Escape') {
        onClose && onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div
      ref={menuRef}
      className="z-[9999] min-w-[180px] bg-background-container-light dark:bg-background-container-dark border border-container-border-light dark:border-container-border-dark rounded-lg shadow-lg py-2 flex flex-col fixed"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      {children}
    </div>,
    document.body
  );
}

// Sortable character item component
function SortableCharacterItem({ character, characters, index, isSelected, onSelect, onClearChat, onDelete, onMenuClick, isMenuOpen, menuRef }) {
  const isNelliel = character.name === "Nelliel";
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: character.id,
    disabled: isNelliel, // Disable dragging for Nelliel
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0,
  };

  const buttonRef = useRef();
  const handleCloseMenu = () => {
    if (isMenuOpen) onMenuClick(null);
  };

  const [showNelGlow, setShowNelGlow] = useState(false);

  useEffect(() => {
    const seenNel = localStorage.getItem("nelGlowSeen");
    const nelExists = characters?.some(c => c.name === "Nelliel");

    if (!seenNel && nelExists) {
      setShowNelGlow(true);
      localStorage.setItem("nelGlowSeen", "true");

      setTimeout(() => {
        setShowNelGlow(false);
      }, 2000);
    }
  }, [characters]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center justify-between px-3 py-3 rounded-lg bg-background-container-hover-light/20 dark:bg-background-container-hover-dark/20 transition-all duration-200 hover:bg-background-container-hover-light/100 dark:hover:bg-background-container-hover-dark/100 relative ${isDragging ? 'shadow-lg' : ''} ${isMenuOpen ? 'pointer-events-none' : ''}`}
      {...(!isNelliel ? { ...attributes, ...listeners } : {})}
    >
      <button
        onClick={() => onSelect(index)}
        className={`flex-1 text-left flex items-center space-x-3 ${
          isSelected
            ? "text-text-light dark:text-text-dark"
            : "text-text-light/80 dark:text-text-dark/80 hover:text-text-light dark:hover:text-text-dark"
        }`}
      >
        <img
          src={character.avatar}
          alt=""
          className={`w-10 h-10 rounded-full object-cover ring-1 ring-white/10 ${isNelliel && showNelGlow ? 'nelliel-glow' : ''}`}
          onError={e => { e.target.onerror = null; e.target.src = '/default-avatar.png'; }}
        />
        <span className="font-medium truncate max-w-[160px]" title={character.name}>
          {character.name.length > 20 ? `${character.name.substring(0, 20)}...` : character.name}
        </span>
      </button>
      {/* Ellipsis/context menu for all characters */}
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          onMenuClick(index);
        }}
        className="ml-2 p-2 text-gray-400 hover:text-primary focus:outline-none"
        title="More options"
      >
        <i className="fas fa-ellipsis-v" />
      </button>
      {/* Context menu rendered in a portal */}
      <ContextMenuPortal anchorRef={buttonRef} isOpen={isMenuOpen} onClose={handleCloseMenu}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClearChat(character);
          }}
          className="w-full text-left px-4 py-3 hover:bg-background-container-hover-light dark:hover:bg-background-container-hover-dark transition-colors"
        >
          <i className="fas fa-trash-alt text-white mr-2" /> Clear Chat
        </button>
        {/* Only show delete for non-Nelliel characters */}
        {!isNelliel && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(character, index);
            }}
            className="w-full text-left px-4 py-3 text-red-500 hover:bg-background-container-hover-light dark:hover:bg-background-container-hover-dark transition-colors"
          >
            <i className="fas fa-ban text-red-500 mr-2" /> Delete
          </button>
        )}
      </ContextMenuPortal>
    </div>
  );
}

export default function Sidebar({
  className = "",
  onLinkClick = () => {},
  onSettingsClick,
  onClearChat,
  sidebarReloadKey,
  setSidebarReloadKey,
  setShowExplore
}) {
  const navigate = useNavigate();
  const { isModerator, token, user } = useAuth();

  const {
    characters,
    selectedIndex,
    current,
    setSelectedIndex,
    setSelectedIndexRaw,
    handleNewCharacter,
    handleOpenModal,
    handleSaveCharacter,
    handleDeleteCharacter,
    setCurrent,
    setCharacters,
    reloadCharacters,
    reorderCharacters,
    isLoading,
    isImporting,
    setIsImporting,
    isReloadingCharacters,
    setIsReloadingCharacters,
  } = useCharacter();

  const { t } = useLanguage();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { clearChat } = useChat();
  const isMobile = useIsMobile();
  const [openMenuIndex, setOpenMenuIndex] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const menuRef = useRef(null);
  const { addToast } = useToast();
  const [showImportModal, setShowImportModal] = useState(false);
  const [pendingImportToast, setPendingImportToast] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef();
  const [showNewCharacterModal, setShowNewCharacterModal] = useState(false);
  const [newCharacterInitialData, setNewCharacterInitialData] = useState({ name: '', isPublic: false });
  const DEFAULT_AVATAR = '/assets/default-avatar.png'; // Adjust path as needed
  const { unreadCount } = useNotifications();

  // Configure sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end
  function handleDragEnd(event) {
    const { active, over } = event;
    if (active.id !== over.id) {
      setCharacters((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  // Click-away handler for context menu
  useEffect(() => {
    if (openMenuIndex === null) return;
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuIndex(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openMenuIndex]);

  // Add file upload handler
  function handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      // Save the character with the new avatar
      handleSaveCharacter({
        ...current,
        avatar: reader.result
      });
    };
    reader.readAsDataURL(file);
  }

  const handleClearChat = (character) => {
    setOpenMenuIndex(null);
    onClearChat(character);
  };

  const handleDeleteCharacterWithConfirm = (character, idx) => {
    setOpenMenuIndex(null);
    setConfirmDelete({ character, idx });
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    try {
      await handleDeleteCharacter(confirmDelete.idx);
      addToast({
        type: 'success',
        message: t('character.deleted') || 'Character deleted',
        duration: 3000,
      });
    } catch (err) {
      addToast({
        type: 'error',
        message: t('character.deleteFailed') || 'Failed to delete character',
        duration: 5000,
      });
    }
    setConfirmDelete(null);
  };

  const handleCancelDelete = () => {
    setConfirmDelete(null);
  };

  // Remove the local reloadCharacters useEffect and use the context function instead
  useEffect(() => {
  if (sidebarReloadKey > 0) {
    const delay = setTimeout(() => {
      reloadCharacters();
    }, 300); // Debounce by 300ms
    return () => clearTimeout(delay);
  }
}, [sidebarReloadKey, reloadCharacters]);

  useEffect(() => {
    if (pendingImportToast && !isReloadingCharacters) {
      setIsImporting(false);
      addToast({
        type: "success",
        message: "Character imported successfully!",
        duration: 3000,
      });
      setPendingImportToast(false);
    }
  }, [pendingImportToast, isReloadingCharacters, setIsImporting, addToast]);

  // Filter characters by search query (case-insensitive, match any part of name)
  const filteredCharacters = characters.filter(c =>
    c.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  // Handle Escape to clear search
  useEffect(() => {
    function handleKey(e) {
      if (document.activeElement === searchInputRef.current && e.key === "Escape") {
        setSearchQuery("");
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  // Debug: log before rendering PrivatePersonalityModal
  console.log('Sidebar: About to render PrivatePersonalityModal', { showNewCharacterModal, newCharacterInitialData });
  let privateModal = null;
  try {
    if (showNewCharacterModal) {
      // Debug: try rendering with normal data, fallback to hardcoded if error
      privateModal = (
        (() => { console.log('Rendering PrivatePersonalityModal from Sidebar'); return null; })(),
        <PrivatePersonalityModal
          isOpen={showNewCharacterModal}
          initialData={newCharacterInitialData}
          onClose={() => {
            setShowNewCharacterModal(false);
            setNewCharacterInitialData({});
          }}
          onSave={async (form) => {
            console.log('PrivatePersonalityModal onSave called');
            // Reload characters to get the new one
            await reloadCharacters();
            setShowNewCharacterModal(false);
            setNewCharacterInitialData({});
          }}
        />
      );
    }
  } catch (error) {
    console.error('Error rendering PrivatePersonalityModal:', error);
  }

  // Always render Nelliel row at the top if she exists in characters
  const nelliel = characters.find(c => c.name === 'Nelliel');

  return (
    <aside className={`w-72 md:w-80 flex-shrink-0 h-full flex flex-col bg-background-container-light dark:bg-background-container-dark border-r border-border-light dark:border-border-dark ${className}`}>
      <div className="relative w-full h-full flex flex-col items-center">
        {/* Top controls section */}
        <div className="w-full px-2 flex flex-row gap-x-2 mb-6 mt-4">
          <button
            onClick={() => {
              setNewCharacterInitialData({ name: '', isPublic: false });
              setShowNewCharacterModal(true);
              onLinkClick();
            }}
            className="new-character-button w-1/2 bg-background-container-light dark:bg-background-container-dark rounded-xl border-2 border-container-border-light dark:border-container-border-dark shadow-lg shadow-container-shadow-light dark:shadow-container-shadow-dark p-2 transition-all duration-300 hover:border-primary/40 hover:shadow-xl flex items-center justify-center"
          >
            <span className="text-primary mr-1 text-base">
              <i className="fas fa-plus" />
            </span>
            <span className="font-medium text-sm">{t('sidebar.newCharacter')}</span>
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="w-1/2 bg-background-container-light dark:bg-background-container-dark rounded-xl border-2 border-container-border-light dark:border-container-border-dark shadow-lg shadow-container-shadow-light dark:shadow-container-shadow-dark p-2 transition-all duration-300 hover:border-primary/40 hover:shadow-xl flex items-center justify-center"
          >
            <span className="text-primary mr-1 text-base">
              <i className="fas fa-file-import" />
            </span>
            <span className="font-medium text-sm">Import</span>
          </button>
        </div>

        {/* Explore button */}
        <div className="w-full px-2 mb-4">
          <button
            className="explore-button w-full py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-all duration-200 font-semibold"
            onClick={() => {
              if (typeof setShowExplore === 'function') setShowExplore(true);
            }}
          >
            Explore Characters
          </button>
        </div>

        {/* Search/filter bar */}
        <div className="w-full px-2 mb-2">
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search characters..."
              className="w-full pl-10 pr-10 py-2 rounded-lg bg-background-container-light dark:bg-background-container-dark border-2 border-container-border-light dark:border-container-border-dark focus:outline-none focus:ring-2 focus:ring-primary text-sm text-text-light dark:text-text-dark placeholder:text-text-secondary-light dark:placeholder:text-text-secondary-dark"
              aria-label="Search characters"
            />
            {searchQuery && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary focus:outline-none"
                onClick={() => setSearchQuery("")}
                tabIndex={0}
                aria-label="Clear search"
              >
                <i className="fas fa-times-circle" />
              </button>
            )}
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary-light dark:text-text-secondary-dark" />
          </div>
        </div>

        {/* Character list with dnd-kit */}
        <div className="w-full flex-1 space-y-2 mb-6 px-2 overflow-y-auto">
          <div className="text-xl font-bold text-white-500 dark:text-white-500 px-2 mb-4 [text-shadow:0.1px_0.1px_0_#000,0_0.1px_0_#000,0.1px_0_0_#000,0_-0.1px_0_#000]">
            {t('sidebar.characters')}
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="loader border-4 border-primary border-t-transparent rounded-full w-10 h-10 animate-spin" />
            </div>
          ) : (
            <>
              {/* Render Nelliel at the top if she exists */}
              {nelliel && (
                <div className="nelliel-row-onboarding-anchor">
                  <SortableCharacterItem
                    key={nelliel.id}
                    character={nelliel}
                    characters={characters}
                    index={characters.findIndex(c => c.id === nelliel.id)}
                    isSelected={selectedIndex === characters.findIndex(c => c.id === nelliel.id)}
                    onSelect={idx => { setSelectedIndex(idx); if (typeof setShowExplore === 'function') setShowExplore(false); }}
                    onClearChat={handleClearChat}
                    onDelete={handleDeleteCharacterWithConfirm}
                    onMenuClick={(idx) => setOpenMenuIndex(openMenuIndex === idx ? null : idx)}
                    isMenuOpen={openMenuIndex === characters.findIndex(c => c.id === nelliel.id)}
                    menuRef={menuRef}
                  />
                </div>
              )}

              {/* Render other characters */}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={filteredCharacters.filter(c => c.name !== 'Nelliel').map(c => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {filteredCharacters
                    .filter(c => c.name !== 'Nelliel')
                    .map((character, index) => (
                      <SortableCharacterItem
                        key={character.id}
                        character={character}
                        characters={characters}
                        index={characters.findIndex(c => c.id === character.id)}
                        isSelected={characters.findIndex(c => c.id === character.id) === selectedIndex}
                        onSelect={idx => { setSelectedIndex(idx); if (typeof setShowExplore === 'function') setShowExplore(false); }}
                        onClearChat={handleClearChat}
                        onDelete={handleDeleteCharacterWithConfirm}
                        onMenuClick={(idx) => setOpenMenuIndex(openMenuIndex === idx ? null : idx)}
                        isMenuOpen={openMenuIndex === characters.findIndex(c => c.id === character.id)}
                        menuRef={menuRef}
                      />
                    ))}
                </SortableContext>
              </DndContext>
            </>
          )}
        </div>

        {/* Bottom section */}
        <div className="w-full mt-auto px-2 pb-2">
          <div className="bg-background-container-light dark:bg-background-container-dark rounded-xl border-2 border-container-border-light dark:border-container-border-dark shadow-lg shadow-container-shadow-light dark:shadow-container-shadow-dark p-2 transition-all duration-300 hover:border-primary/40 hover:shadow-xl flex flex-col space-y-1">
            {isModerator && (
              <button
                onClick={() => navigate('/admin')}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg font-semibold text-text-light dark:text-text-dark transition-all duration-200 hover:bg-background-container-hover-light dark:hover:bg-background-container-hover-dark group"
              >
                <span className="flex items-center gap-2">
                  <i className="fas fa-shield-alt text-2xl text-primary" />
                  <span>Admin Panel</span>
                </span>
              </button>
            )}
            
            {/* Profile section with dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg font-semibold text-text-light dark:text-text-dark transition-all duration-200 hover:bg-background-container-hover-light dark:hover:bg-background-container-hover-dark group"
              >
                <span className="flex items-center gap-2">
                  <i className="fas fa-user-circle text-2xl text-primary" />
                  <span>{t('settings.profile', 'Profile')}</span>
                </span>
                <span className="flex items-center ml-auto gap-2">
                  {unreadCount > 0 && (
                    <span className="relative inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                  <i className="fas fa-chevron-down text-xl text-text-light/60 dark:text-text-dark/60 group-hover:text-text-light dark:group-hover:text-text-dark transition-colors ml-2" style={{ marginRight: 4 }} />
                </span>
              </button>
              <ProfileDropdown
                isOpen={isProfileOpen}
                onClose={() => setIsProfileOpen(false)}
                onSettingsClick={onSettingsClick}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Import Modal */}
      <CharacterImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={() => {
          setPendingImportToast(true);
          setShowImportModal(false);
        }}
      />

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background-container-light dark:bg-background-container-dark rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">{t('character.confirmDelete')}</h3>
            <div className="flex justify-end space-x-4">
              <button
                onClick={handleCancelDelete}
                className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                {t('common.actions.cancel')}
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                {t('common.actions.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Character Modal */}
      {privateModal}
    </aside>
  );
}
