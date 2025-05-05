import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ThemePicker from '../components/ThemePicker';
import { useTheme } from '../context/ThemeContext';

// Mock the ThemeContext
jest.mock('../context/ThemeContext', () => ({
  useTheme: jest.fn()
}));

describe('ThemePicker Component', () => {
  const mockThemes = {
    light: {
      '--chat-user-bg': '#ffffff'
    },
    dark: {
      '--chat-user-bg': '#1a1a1a'
    }
  };

  const mockSetChatTheme = jest.fn();

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Default mock implementation
    useTheme.mockImplementation(() => ({
      chatThemes: mockThemes,
      currentChatTheme: 'light',
      setChatTheme: mockSetChatTheme
    }));
  });

  it('renders without crashing', () => {
    render(<ThemePicker />);
    expect(screen.getByText('Chat Theme')).toBeInTheDocument();
  });

  it('displays error message when themes are not available', () => {
    useTheme.mockImplementation(() => ({
      chatThemes: null,
      currentChatTheme: 'light',
      setChatTheme: mockSetChatTheme
    }));

    render(<ThemePicker />);
    expect(screen.getByText('⚠️ Theme options not available.')).toBeInTheDocument();
  });

  it('renders theme buttons for each available theme', () => {
    render(<ThemePicker />);
    const themeButtons = screen.getAllByRole('button');
    expect(themeButtons).toHaveLength(Object.keys(mockThemes).length);
  });

  it('shows current theme button with primary border', () => {
    render(<ThemePicker />);
    const themeButtons = screen.getAllByRole('button');
    const currentThemeButton = themeButtons.find(
      button => button.className.includes('border-primary')
    );
    expect(currentThemeButton).toBeTruthy();
  });

  it('calls setChatTheme when a theme is selected', async () => {
    mockSetChatTheme.mockResolvedValueOnce();
    render(<ThemePicker />);
    
    const themeButtons = screen.getAllByRole('button');
    const darkThemeButton = themeButtons[1]; // dark theme button
    
    fireEvent.click(darkThemeButton);
    
    expect(mockSetChatTheme).toHaveBeenCalledWith('dark');
    
    await waitFor(() => {
      expect(screen.getByText('Chat theme updated to Dark!')).toBeInTheDocument();
    });
  });

  it('shows error toast when theme update fails', async () => {
    const errorMessage = 'Failed to update theme';
    mockSetChatTheme.mockRejectedValueOnce(new Error(errorMessage));
    
    render(<ThemePicker />);
    
    const themeButtons = screen.getAllByRole('button');
    const darkThemeButton = themeButtons[1];
    
    fireEvent.click(darkThemeButton);
    
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('displays help text', () => {
    render(<ThemePicker />);
    expect(screen.getByText('Click a color to change your chat theme')).toBeInTheDocument();
  });
}); 