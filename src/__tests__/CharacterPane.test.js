import React from 'react';
import { render, screen } from '@testing-library/react';
import CharacterPane from '../components/CharacterPane';
import { useCharacter } from '../context/CharacterContext';

// Mock the CharacterContext
jest.mock('../context/CharacterContext', () => ({
  useCharacter: jest.fn()
}));

describe('CharacterPane Component', () => {
  const mockCharacter = {
    name: 'Test Character',
    age: 25,
    gender: 'Female',
    race: 'Human',
    occupation: 'Developer',
    likes: 'coding, coffee, music',
    dislikes: 'bugs, meetings, deadlines',
    avatar: 'test-avatar.jpg',
    fullImage: 'test-full-image.jpg'
  };

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('renders with all character information', () => {
    useCharacter.mockReturnValue({ current: mockCharacter });
    
    render(<CharacterPane />);
    
    // Check if all character information is displayed
    expect(screen.getByText('Test Character')).toBeInTheDocument();
    expect(screen.getByText('25 years old')).toBeInTheDocument();
    expect(screen.getByText('Female')).toBeInTheDocument();
    expect(screen.getByText('Human')).toBeInTheDocument();
    expect(screen.getByText('Developer')).toBeInTheDocument();
    expect(screen.getByText('coding, coffee, music')).toBeInTheDocument();
    expect(screen.getByText('bugs, meetings, deadlines')).toBeInTheDocument();
    
    // Check if image is rendered with correct src
    const image = screen.getByAltText('Test Character full');
    expect(image).toHaveAttribute('src', 'test-full-image.jpg');
  });

  it('renders with minimal character information', () => {
    const minimalCharacter = {
      name: 'Minimal Character',
      avatar: 'minimal-avatar.jpg'
    };
    useCharacter.mockReturnValue({ current: minimalCharacter });
    
    render(<CharacterPane />);
    
    // Check if only available information is displayed
    expect(screen.getByText('Minimal Character')).toBeInTheDocument();
    
    // Check if optional fields are not rendered
    expect(screen.queryByText(/years old/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Female/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Human/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Developer/)).not.toBeInTheDocument();
    
    // Check if image falls back to avatar
    const image = screen.getByAltText('Minimal Character full');
    expect(image).toHaveAttribute('src', 'minimal-avatar.jpg');
  });

  it('handles long lists of likes and dislikes', () => {
    const characterWithLongLists = {
      ...mockCharacter,
      likes: 'item1, item2, item3, item4, item5',
      dislikes: 'dislike1, dislike2, dislike3, dislike4, dislike5'
    };
    useCharacter.mockReturnValue({ current: characterWithLongLists });
    
    render(<CharacterPane />);
    
    // Check if lists are truncated with ellipsis
    expect(screen.getByText('item1, item2, item3...')).toBeInTheDocument();
    expect(screen.getByText('dislike1, dislike2, dislike3...')).toBeInTheDocument();
  });

  it('renders empty state when no character is provided', () => {
    useCharacter.mockReturnValue({ current: null });
    
    render(<CharacterPane />);
    
    // The component should render but with empty content
    const aside = document.querySelector('aside');
    expect(aside).toBeInTheDocument();
    
    // Heading should be empty but present
    const heading = screen.getByRole('heading');
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('');
  });
}); 