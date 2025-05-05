import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useCharacter } from '../context/CharacterContext';

// Mock the router hooks
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

// Mock the auth context
jest.mock('../context/AuthContext', () => ({
  useAuth: jest.fn()
}));

// Mock the theme context
jest.mock('../context/ThemeContext', () => ({
  useTheme: jest.fn()
}));

// Mock the character context
jest.mock('../context/CharacterContext', () => ({
  useCharacter: jest.fn()
}));

describe('Sidebar Component', () => {
  // Mock data
  const mockCharacter = {
    id: '1',
    name: 'Test Character',
    avatar: 'test-avatar.jpg'
  };

  const mockCharacters = [
    mockCharacter,
    {
      id: '2',
      name: 'Second Character',
      avatar: 'avatar2.jpg'
    }
  ];

  // Mock functions
  const mockOnLinkClick = jest.fn();
  const mockOnSettingsClick = jest.fn();
  const mockSetSelectedIndex = jest.fn();
  const mockHandleNewCharacter = jest.fn();
  const mockHandleOpenModal = jest.fn();
  const mockHandleSaveCharacter = jest.fn();
  const mockHandleDeleteCharacter = jest.fn();
  const mockToggleBookmark = jest.fn();
  const mockSetCurrent = jest.fn();
  const mockLogout = jest.fn();
  const mockToggleDark = jest.fn();

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup default auth context
    useAuth.mockImplementation(() => ({
      logout: mockLogout,
      isModerator: false
    }));

    // Setup default theme context
    useTheme.mockImplementation(() => ({
      dark: false,
      toggleDark: mockToggleDark
    }));

    // Setup default character context
    useCharacter.mockImplementation(() => ({
      characters: mockCharacters,
      selectedIndex: 0,
      bookmarks: [],
      current: mockCharacter,
      setSelectedIndex: mockSetSelectedIndex,
      handleNewCharacter: mockHandleNewCharacter,
      handleOpenModal: mockHandleOpenModal,
      handleSaveCharacter: mockHandleSaveCharacter,
      handleDeleteCharacter: mockHandleDeleteCharacter,
      toggleBookmark: mockToggleBookmark,
      setCurrent: mockSetCurrent
    }));
  });

  it('renders without crashing', () => {
    render(
      <BrowserRouter>
        <Sidebar onLinkClick={mockOnLinkClick} onSettingsClick={mockOnSettingsClick} />
      </BrowserRouter>
    );
    expect(screen.getByRole('heading', { name: 'Test Character' })).toBeInTheDocument();
  });

  it('displays current character name and avatar', () => {
    render(
      <BrowserRouter>
        <Sidebar onLinkClick={mockOnLinkClick} onSettingsClick={mockOnSettingsClick} />
      </BrowserRouter>
    );
    expect(screen.getByRole('heading', { name: mockCharacter.name })).toBeInTheDocument();
    expect(screen.getByAltText(`${mockCharacter.name} Avatar`)).toHaveAttribute('src', mockCharacter.avatar);
  });

  it('shows admin panel link only for moderators', () => {
    // First render without moderator privileges
    const { rerender } = render(
      <BrowserRouter>
        <Sidebar onLinkClick={mockOnLinkClick} onSettingsClick={mockOnSettingsClick} />
      </BrowserRouter>
    );
    expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument();

    // Update auth context to include moderator privileges
    useAuth.mockImplementation(() => ({
      logout: mockLogout,
      isModerator: true
    }));

    // Re-render with moderator privileges
    rerender(
      <BrowserRouter>
        <Sidebar onLinkClick={mockOnLinkClick} onSettingsClick={mockOnSettingsClick} />
      </BrowserRouter>
    );
    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
  });

  it('handles logout correctly', () => {
    render(
      <BrowserRouter>
        <Sidebar onLinkClick={mockOnLinkClick} onSettingsClick={mockOnSettingsClick} />
      </BrowserRouter>
    );
    
    const logoutButton = screen.getByText('Logout');
    fireEvent.click(logoutButton);
    
    expect(mockLogout).toHaveBeenCalled();
    expect(mockOnLinkClick).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('handles character selection', () => {
    render(
      <BrowserRouter>
        <Sidebar onLinkClick={mockOnLinkClick} onSettingsClick={mockOnSettingsClick} />
      </BrowserRouter>
    );
    
    const secondCharacter = screen.getByText('Second Character');
    fireEvent.click(secondCharacter);
    
    expect(mockSetSelectedIndex).toHaveBeenCalledWith(1);
    expect(mockOnLinkClick).toHaveBeenCalled();
  });

  it('handles new character creation', () => {
    render(
      <BrowserRouter>
        <Sidebar onLinkClick={mockOnLinkClick} onSettingsClick={mockOnSettingsClick} />
      </BrowserRouter>
    );
    
    const newCharacterButton = screen.getByText('New Character');
    fireEvent.click(newCharacterButton);
    
    expect(mockHandleNewCharacter).toHaveBeenCalled();
    expect(mockOnLinkClick).toHaveBeenCalled();
  });

  it('handles character deletion', () => {
    render(
      <BrowserRouter>
        <Sidebar onLinkClick={mockOnLinkClick} onSettingsClick={mockOnSettingsClick} />
      </BrowserRouter>
    );
    
    // Find and click the delete button for the second character
    const deleteButtons = screen.getAllByTitle('Delete character');
    fireEvent.click(deleteButtons[0]);
    
    expect(mockHandleDeleteCharacter).toHaveBeenCalledWith(1);
  });

  it('handles bookmark toggling', () => {
    render(
      <BrowserRouter>
        <Sidebar onLinkClick={mockOnLinkClick} onSettingsClick={mockOnSettingsClick} />
      </BrowserRouter>
    );
    
    const bookmarkButton = screen.getByTitle('Bookmark Character');
    fireEvent.click(bookmarkButton);
    
    expect(mockToggleBookmark).toHaveBeenCalledWith(0);
  });

  it('handles settings click', () => {
    render(
      <BrowserRouter>
        <Sidebar onLinkClick={mockOnLinkClick} onSettingsClick={mockOnSettingsClick} />
      </BrowserRouter>
    );
    
    const settingsButton = screen.getByText('Settings');
    fireEvent.click(settingsButton);
    
    expect(mockOnSettingsClick).toHaveBeenCalled();
    expect(mockOnLinkClick).toHaveBeenCalled();
  });

  it('handles avatar upload', async () => {
    render(
      <BrowserRouter>
        <Sidebar onLinkClick={mockOnLinkClick} onSettingsClick={mockOnSettingsClick} />
      </BrowserRouter>
    );
    
    const file = new File(['test'], 'test.png', { type: 'image/png' });
    const input = screen.getByTitle('Change Avatar').querySelector('input[type="file"]');
    
    Object.defineProperty(input, 'files', {
      value: [file]
    });
    
    fireEvent.change(input);
    
    await waitFor(() => {
      expect(mockHandleSaveCharacter).toHaveBeenCalled();
    });
  });
}); 