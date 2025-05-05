// src/components/Sidebar.jsx
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useCharacter } from "../context/CharacterContext";

export default function Sidebar({ className = "", onLinkClick = () => {}, onSettingsClick }) {
  const navigate = useNavigate();
  const { logout, isModerator } = useAuth();
  const { dark, toggleDark } = useTheme();
  const {
    characters,
    selectedIndex,
    bookmarks,
    current,
    setSelectedIndex,
    handleNewCharacter,
    handleOpenModal,
    handleSaveCharacter,
    handleDeleteCharacter,
    toggleBookmark,
    setCurrent,
  } = useCharacter();

  const isBookmarked = bookmarks.includes(selectedIndex);

  function handleLogout() {
    logout();
    onLinkClick();
    navigate("/login");
  }

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

  return (
    <aside className={`${className} flex flex-col items-center p-6 bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark border-r border-border-light dark:border-border-dark`}>
      {/* Avatar + edit */}
      <div className="relative">
        <img
          src={current.avatar}
          alt={`${current.name} Avatar`}
          className="h-24 w-24 rounded-full border-2 border-primary object-cover"
        />
        <label
          className="absolute bottom-0 right-0 bg-primary rounded-full p-1 hover:bg-primary/90 cursor-pointer"
          title="Change Avatar"
        >
          <input
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            className="hidden"
          />
          <i className="fas fa-camera text-white" />
        </label>
      </div>

      {/* Name + bookmark + edit */}
      <div className="mt-4 flex items-center space-x-2">
        <h2 className="text-2xl font-semibold">{current.name}</h2>
        <button
          onClick={() => toggleBookmark(selectedIndex)}
          className={`text-xl ${
            isBookmarked
              ? "text-yellow-400"
              : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          }`}
          title={isBookmarked ? "Remove Bookmark" : "Bookmark Character"}
        >
          <i className={isBookmarked ? "fas fa-star" : "far fa-star"} />
        </button>
        <button
          onClick={handleOpenModal}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          title="Edit Personality"
        >
          <i className="fas fa-pencil-alt" />
        </button>
      </div>

      {/* Bookmarks */}
      {bookmarks.length > 0 && (
        <div className="mt-6 w-full space-y-2">
          <h3 className="px-4 text-gray-500 dark:text-gray-400 uppercase text-xs">Bookmarks</h3>
          {bookmarks.map((idx) => (
            <button
              key={`bm-${idx}`}
              onClick={() => {
                setSelectedIndex(idx);
                onLinkClick();
              }}
              className="w-full text-left px-4 py-2 hover:bg-background-secondary-light dark:hover:bg-background-secondary-dark rounded text-yellow-500"
            >
              <div className="flex items-center space-x-2">
                <img
                  src={characters[idx]?.avatar}
                  alt=""
                  className="w-6 h-6 rounded-full object-cover"
                />
                <i className="fas fa-star" />
                <span>{characters[idx]?.name || "Unknown"}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Character list */}
      <div className="mt-6 w-full space-y-2">
        <h3 className="px-4 text-gray-500 dark:text-gray-400 uppercase text-xs">Characters</h3>
        {characters.map((c, i) => (
          <div
            key={c.id}
            className="group flex items-center justify-between px-4 py-1 rounded hover:bg-background-secondary-light dark:hover:bg-background-secondary-dark"
          >
            <button
              onClick={() => {
                setSelectedIndex(i);
                onLinkClick();
              }}
              className={`flex-1 text-left flex items-center space-x-2 ${
                i === selectedIndex
                  ? "text-gray-900 dark:text-white"
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <img
                src={c.avatar}
                alt=""
                className="w-6 h-6 rounded-full object-cover"
              />
              <span>{c.name}</span>
            </button>
            {i !== 0 && (
              <button
                onClick={() => handleDeleteCharacter(i)}
                className="ml-2 p-1 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600"
                title="Delete character"
              >
                <i className="fas fa-trash" />
              </button>
            )}
          </div>
        ))}
        <button
          onClick={() => {
            handleNewCharacter();
            onLinkClick();
          }}
          className="w-full text-left px-4 py-2 hover:bg-background-secondary-light dark:hover:bg-background-secondary-dark rounded"
        >
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <i className="fas fa-plus text-sm text-gray-600 dark:text-gray-400" />
            </div>
            <span>New Character</span>
          </div>
        </button>
      </div>

      {/* Bottom controls */}
      <div className="mt-auto w-full space-y-2">
        {isModerator && (
          <Link
            to="/admin"
            className="block px-4 py-2 hover:bg-background-secondary-light dark:hover:bg-background-secondary-dark rounded"
          >
            Admin Panel
          </Link>
        )}
        <button
          onClick={() => {
            onSettingsClick();
            onLinkClick();
          }}
          className="w-full flex items-center px-4 py-2 hover:bg-background-secondary-light dark:hover:bg-background-secondary-dark rounded"
        >
          <i className="fas fa-cog mr-2" />
          Settings
        </button>
        <div className="flex items-center justify-between px-2 py-2">
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 text-red-600 dark:text-red-400 hover:bg-background-secondary-light dark:hover:bg-background-secondary-dark rounded px-2 py-1"
          >
            <i className="fas fa-sign-out-alt" />
            <span>Logout</span>
          </button>
          
          <div className="flex items-center space-x-2">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={dark}
                onChange={toggleDark}
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
            <span className="text-gray-600 dark:text-gray-400">
              <i className={`fas ${dark ? 'fa-moon' : 'fa-sun'}`} />
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
