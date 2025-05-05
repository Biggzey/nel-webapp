import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { CharacterProvider, useCharacter } from '../context/CharacterContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

// Mock the hooks
jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn()
}));

jest.mock('../context/AuthContext', () => ({
  useAuth: jest.fn()
}));

// Test component to consume the context
function TestComponent() {
  const { 
    current, 
    characters, 
    isLoading,
    handleNewCharacter,
    handleSaveCharacter,
    handleDeleteCharacter,
    toggleBookmark
  } = useCharacter();

  if (isLoading) return <div>Loading characters...</div>;

  return (
    <div>
      <div data-testid="current-character">
        {current ? JSON.stringify(current) : 'No character selected'}
      </div>
      <div data-testid="characters-list">
        {characters.map((char, i) => (
          <div key={char.id} data-testid={`character-${i}`}>
            <span>{char.name}</span>
            <button onClick={() => toggleBookmark(i)}>
              {char.bookmarked ? 'Unbookmark' : 'Bookmark'}
            </button>
            <button onClick={() => handleDeleteCharacter(i)}>Delete</button>
          </div>
        ))}
      </div>
      <button onClick={handleNewCharacter}>New Character</button>
      {current && (
        <button 
          onClick={() => handleSaveCharacter({
            ...current,
            name: 'Updated Name'
          })}
        >
          Update Character
        </button>
      )}
    </div>
  );
}

describe('CharacterContext', () => {
  const mockNavigate = jest.fn();
  const mockToken = 'mock-token';
  const mockLogout = jest.fn();
  
  const defaultNelliel = {
    id: 1,
    name: 'Nelliel',
    personality: 'Your custom AI companion.',
    avatar: '/nel-avatar.png',
    bookmarked: false,
    systemPrompt: 'You are Nelliel, a helpful and friendly AI companion. You are knowledgeable, empathetic, and always eager to assist users with their questions and tasks.',
    customInstructions: '',
  };

  beforeEach(() => {
    useNavigate.mockReturnValue(mockNavigate);
    useAuth.mockReturnValue({ token: mockToken, logout: mockLogout });
    
    // Reset fetch mock
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('loads characters and preferences on mount', async () => {
    // Mock initial loading state
    global.fetch
      .mockImplementationOnce(() => new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve([defaultNelliel])
      }), 100)))
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ selectedCharId: 1 })
      }));

    render(
      <CharacterProvider>
        <TestComponent />
      </CharacterProvider>
    );

    // Should show loading initially
    expect(screen.getByText('Loading characters...')).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByText('Loading characters...')).not.toBeInTheDocument();
    });

    const currentChar = JSON.parse(screen.getByTestId('current-character').textContent);
    expect(currentChar).toEqual(defaultNelliel);
  });

  it('creates Nelliel if not present', async () => {
    // Mock fetch to return empty characters list
    global.fetch
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve([])
      }))
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      }))
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve(defaultNelliel)
      }));

    await act(async () => {
      render(
        <CharacterProvider>
          <TestComponent />
        </CharacterProvider>
      );
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading characters...')).not.toBeInTheDocument();
    });

    // Verify the API call to create Nelliel
    expect(global.fetch).toHaveBeenCalledWith('/api/characters', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mockToken}`
      }),
      body: expect.stringContaining('Nelliel')
    }));
  });

  it('creates a new character', async () => {
    const newCharacter = {
      id: 2,
      name: 'New Character',
      personality: '',
      avatar: '/nel-avatar.png',
      bookmarked: false,
      systemPrompt: '',
      customInstructions: '',
    };

    // Mock initial data load and character creation
    global.fetch
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve([defaultNelliel])
      }))
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ selectedCharId: 1 })
      }))
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve(newCharacter)
      }))
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ selectedCharId: 2 })
      }));

    await act(async () => {
      render(
        <CharacterProvider>
          <TestComponent />
        </CharacterProvider>
      );
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading characters...')).not.toBeInTheDocument();
    });

    const newButton = screen.getByText('New Character');
    await act(async () => {
      fireEvent.click(newButton);
    });

    await waitFor(() => {
      const characterElement = screen.getByTestId('character-1');
      expect(characterElement).toHaveTextContent('New Character');
    });

    // Verify the API call
    const createCall = global.fetch.mock.calls.find(
      call => call[0] === '/api/characters' && call[1].method === 'POST'
    );
    expect(createCall).toBeTruthy();
    expect(createCall[1]).toEqual(expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mockToken}`
      })
    }));
  });

  it('updates a character', async () => {
    const updatedCharacter = {
      ...defaultNelliel,
      name: 'Updated Name'
    };

    global.fetch
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve([defaultNelliel])
      }))
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ selectedCharId: 1 })
      }))
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve(updatedCharacter)
      }));

    await act(async () => {
      render(
        <CharacterProvider>
          <TestComponent />
        </CharacterProvider>
      );
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading characters...')).not.toBeInTheDocument();
    });

    const updateButton = screen.getByText('Update Character');
    await act(async () => {
      fireEvent.click(updateButton);
    });

    await waitFor(() => {
      expect(screen.getByTestId('character-0')).toHaveTextContent('Updated Name');
    });

    // Verify the API call
    const updateCall = global.fetch.mock.calls.find(
      call => call[0] === `/api/characters/${defaultNelliel.id}` && call[1].method === 'PUT'
    );
    expect(updateCall).toBeTruthy();
    expect(updateCall[1]).toEqual(expect.objectContaining({
      method: 'PUT',
      headers: expect.objectContaining({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mockToken}`
      })
    }));
  });

  it('toggles character bookmark', async () => {
    const bookmarkedCharacter = {
      ...defaultNelliel,
      bookmarked: true
    };

    global.fetch
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve([defaultNelliel])
      }))
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ selectedCharId: 1 })
      }))
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve(bookmarkedCharacter)
      }));

    await act(async () => {
      render(
        <CharacterProvider>
          <TestComponent />
        </CharacterProvider>
      );
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading characters...')).not.toBeInTheDocument();
    });

    const bookmarkButton = screen.getByText('Bookmark');
    await act(async () => {
      fireEvent.click(bookmarkButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Unbookmark')).toBeInTheDocument();
    });

    // Verify the API call
    const bookmarkCall = global.fetch.mock.calls.find(
      call => call[0] === `/api/characters/${defaultNelliel.id}` && call[1].method === 'PUT'
    );
    expect(bookmarkCall).toBeTruthy();
    expect(bookmarkCall[1]).toEqual(expect.objectContaining({
      method: 'PUT',
      headers: expect.objectContaining({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mockToken}`
      })
    }));
  });

  it('prevents deleting Nelliel', async () => {
    global.fetch
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve([defaultNelliel])
      }))
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ selectedCharId: 1 })
      }));

    await act(async () => {
      render(
        <CharacterProvider>
          <TestComponent />
        </CharacterProvider>
      );
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading characters...')).not.toBeInTheDocument();
    });

    const deleteButton = screen.getByText('Delete');
    await act(async () => {
      fireEvent.click(deleteButton);
    });

    // Nelliel should still be in the list
    expect(screen.getByTestId('character-0')).toHaveTextContent('Nelliel');
    expect(global.fetch).not.toHaveBeenCalledWith(`/api/characters/${defaultNelliel.id}`, expect.objectContaining({
      method: 'DELETE'
    }));
  });

  it('handles unauthorized access', async () => {
    global.fetch.mockImplementationOnce(() => Promise.resolve({
      status: 401,
      ok: false
    }));

    await act(async () => {
      render(
        <CharacterProvider>
          <TestComponent />
        </CharacterProvider>
      );
    });

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
    });
  });
}); 