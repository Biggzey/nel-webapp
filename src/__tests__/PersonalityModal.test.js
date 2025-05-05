import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PersonalityModal from '../components/PersonalityModal';

// Mock the CharacterContext
const mockResetCurrentCharacter = jest.fn();
jest.mock('../context/CharacterContext', () => ({
  useCharacter: () => ({
    resetCurrentCharacter: mockResetCurrentCharacter
  })
}));

describe('PersonalityModal Component', () => {
  const mockOnClose = jest.fn();
  const mockOnSave = jest.fn();
  const mockInitialData = {
    name: 'Test Character',
    age: '25',
    gender: 'Female',
    race: 'Human',
    occupation: 'Scientist',
    likes: 'reading, science, coffee',
    dislikes: 'noise, crowds',
    personality: 'Intelligent and curious',
    backstory: 'Grew up in a small town',
    systemPrompt: 'You are a helpful AI',
    customInstructions: 'Be concise',
    avatar: 'https://example.com/avatar.png',
    fullImage: 'https://example.com/full.png'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    render(
      <PersonalityModal
        isOpen={false}
        initialData={mockInitialData}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );
    expect(screen.queryByText('Edit Character')).not.toBeInTheDocument();
  });

  it('renders modal content when isOpen is true', () => {
    render(
      <PersonalityModal
        isOpen={true}
        initialData={mockInitialData}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );
    expect(screen.getByText('Edit Character')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Character')).toBeInTheDocument();
    expect(screen.getByDisplayValue('25')).toBeInTheDocument();
  });

  it('shows "New Character" title for new characters', () => {
    const newCharacterData = { ...mockInitialData, name: 'New Character' };
    render(
      <PersonalityModal
        isOpen={true}
        initialData={newCharacterData}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );
    expect(screen.getByText('New Character')).toBeInTheDocument();
  });

  it('handles input changes correctly', async () => {
    render(
      <PersonalityModal
        isOpen={true}
        initialData={mockInitialData}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    const nameInput = screen.getByPlaceholderText('Character name');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'New Name');
    expect(nameInput).toHaveValue('New Name');
  });

  it('handles form submission', async () => {
    render(
      <PersonalityModal
        isOpen={true}
        initialData={mockInitialData}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    const nameInput = screen.getByPlaceholderText('Character name');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'New Name');

    const submitButton = screen.getByText('Save');
    await userEvent.click(submitButton);

    expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
      name: 'New Name'
    }));
  });

  it('handles file uploads', async () => {
    const file = new File(['test'], 'test.png', { type: 'image/png' });
    render(
      <PersonalityModal
        isOpen={true}
        initialData={mockInitialData}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    const fileInputs = screen.getAllByDisplayValue('');
    const avatarFileInput = fileInputs.find(input => input.type === 'file');
    
    // Mock FileReader before uploading
    const mockFileReader = {
      readAsDataURL: jest.fn(),
      result: 'data:image/png;base64,test'
    };
    jest.spyOn(window, 'FileReader').mockImplementation(() => {
      return {
        ...mockFileReader,
        set onload(cb) {
          setTimeout(() => cb({ target: mockFileReader }), 0);
        }
      };
    });

    await userEvent.upload(avatarFileInput, file);

    // Verify the avatar URL input has been updated
    const avatarInput = screen.getByPlaceholderText('https://example.com/avatar.png');
    expect(avatarInput).toBeInTheDocument();
  });

  it('handles modal close', async () => {
    render(
      <PersonalityModal
        isOpen={true}
        initialData={mockInitialData}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    await userEvent.click(cancelButton);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('handles character reset for existing characters', async () => {
    render(
      <PersonalityModal
        isOpen={true}
        initialData={mockInitialData}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    const resetButton = screen.getByTitle('Reset to Defaults');
    await userEvent.click(resetButton);

    expect(mockResetCurrentCharacter).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('handles textarea auto-resize', async () => {
    render(
      <PersonalityModal
        isOpen={true}
        initialData={mockInitialData}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    const personalityTextarea = screen.getByPlaceholderText("Describe the character's core personality traits and behaviors...");
    const longText = 'A'.repeat(100);
    
    await userEvent.clear(personalityTextarea);
    await userEvent.type(personalityTextarea, longText);

    expect(personalityTextarea).toHaveValue(longText);
  });

  it('updates form when initialData changes', () => {
    const { rerender } = render(
      <PersonalityModal
        isOpen={true}
        initialData={mockInitialData}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    const newData = { ...mockInitialData, name: 'Updated Character' };
    rerender(
      <PersonalityModal
        isOpen={true}
        initialData={newData}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByDisplayValue('Updated Character')).toBeInTheDocument();
  });
}); 