import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { AuthProvider } from '../contexts/AuthContext';
import { BrowserRouter } from 'react-router-dom';

// Mock the character context
jest.mock('../context/CharacterContext', () => ({
  CharacterProvider: ({ children }) => <div>{children}</div>,
  useCharacter: () => ({
    characters: [],
    loading: false,
    error: null,
    addCharacter: jest.fn(),
    updateCharacter: jest.fn(),
    deleteCharacter: jest.fn(),
  }),
}));

// Mock the ChatWindow component
jest.mock('../components/ChatWindow', () => {
  return function MockChatWindow() {
    return <div data-testid="chat-window">Chat Window</div>;
  };
});

describe('App Component', () => {
  const renderApp = () => {
    return render(
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    );
  };

  it('renders without crashing', () => {
    renderApp();
    expect(screen.getByRole('heading', { name: /log in/i })).toBeInTheDocument();
  });

  it('shows login form when not authenticated', () => {
    renderApp();
    expect(screen.getByPlaceholderText(/enter email or username/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
  });

  it('shows signup link when not authenticated', () => {
    renderApp();
    const signupLink = screen.getByRole('link', { name: /sign up/i });
    expect(signupLink).toBeInTheDocument();
    expect(signupLink.getAttribute('href')).toBe('/signup');
  });
}); 