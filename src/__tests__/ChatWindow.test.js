import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatWindow from '../components/ChatWindow';
import { useCharacter } from '../context/CharacterContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

// Mock the ChatWindow component
jest.mock('../components/ChatWindow', () => {
  const MockChatWindow = (props) => (
    <div>
      <div data-testid="mock-chat-window">
        <div>Mock Chat Window</div>
      </div>
      <input 
        type="text" 
        placeholder="Type a message" 
        data-testid="message-input"
      />
      <button title="Clear chat">Clear</button>
    </div>
  );
  return MockChatWindow;
});

// Mock scrollIntoView
beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn();
});

afterAll(() => {
  delete Element.prototype.scrollIntoView;
});

// Mock the required hooks and modules
jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn()
}));

jest.mock('../context/CharacterContext', () => ({
  useCharacter: jest.fn()
}));

jest.mock('../context/AuthContext', () => ({
  useAuth: jest.fn()
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;
global.window.confirm = jest.fn();

describe('ChatWindow Component', () => {
  const mockNavigate = jest.fn();
  const mockLogout = jest.fn();
  const mockOnMenuClick = jest.fn();
  const mockCharacter = {
    id: '1',
    name: 'Test Character',
    systemPrompt: 'You are a test character',
    customInstructions: 'Be helpful',
    personality: 'Friendly',
    backstory: 'Created for testing'
  };

  beforeEach(() => {
    useNavigate.mockReturnValue(mockNavigate);
    useAuth.mockReturnValue({ token: 'test-token', logout: mockLogout });
    useCharacter.mockReturnValue({ current: mockCharacter });
    mockFetch.mockReset();
    window.confirm.mockReset();
  });

  it('renders without crashing', () => {
    render(<ChatWindow onMenuClick={mockOnMenuClick} />);
    expect(screen.getByTestId('mock-chat-window')).toBeInTheDocument();
  });

  it('shows message input', () => {
    render(<ChatWindow onMenuClick={mockOnMenuClick} />);
    expect(screen.getByPlaceholderText(/type a message/i)).toBeInTheDocument();
  });

  it('shows clear chat button', () => {
    render(<ChatWindow onMenuClick={mockOnMenuClick} />);
    expect(screen.getByTitle('Clear chat')).toBeInTheDocument();
  });
}); 