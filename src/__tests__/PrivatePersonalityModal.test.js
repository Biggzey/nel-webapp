import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PrivatePersonalityModal from '../components/PrivatePersonalityModal';

// Mock the CharacterContext
const mockResetCurrentCharacter = jest.fn();
jest.mock('../context/CharacterContext', () => ({
  useCharacter: () => ({
    resetCurrentCharacter: mockResetCurrentCharacter
  })
}));

describe('PrivatePersonalityModal Component', () => {
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
    isPublic: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    render(
      <PrivatePersonalityModal
        isOpen={false}
        initialData={mockInitialData}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );
    expect(screen.queryByText('Create Private Character')).not.toBeInTheDocument();
  });

  it('renders modal content when isOpen is true', () => {
    render(
      <PrivatePersonalityModal
        isOpen={true}
        initialData={mockInitialData}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );
    expect(screen.getByText('Create Private Character')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Character')).toBeInTheDocument();
    expect(screen.getByDisplayValue('25')).toBeInTheDocument();
  });

  it('handles input changes correctly', async () => {
    render(
      <PrivatePersonalityModal
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
      <PrivatePersonalityModal
        isOpen={true}
        initialData={mockInitialData}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    const nameInput = screen.getByPlaceholderText('Character name');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'New Name');

    const submitButton = screen.getByText('Create');
    await userEvent.click(submitButton);

    expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
      name: 'New Name',
      isPublic: false
    }));
  });

  it('handles file uploads', async () => {
    const file = new File(['test'], 'test.png', { type: 'image/png' });
    render(
      <PrivatePersonalityModal
        isOpen={true}
        initialData={mockInitialData}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    const fileInput = screen.getByLabelText('Avatar');
    
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

    await userEvent.upload(fileInput, file);

    // Verify the avatar preview is shown
    const avatarPreview = screen.getByAltText('Avatar preview');
    expect(avatarPreview).toBeInTheDocument();
  });

  it('handles modal close', async () => {
    render(
      <PrivatePersonalityModal
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

  it('validates required fields', async () => {
    render(
      <PrivatePersonalityModal
        isOpen={true}
        initialData={{}}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    const submitButton = screen.getByText('Create');
    await userEvent.click(submitButton);

    // Check for validation messages
    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('Age is required')).toBeInTheDocument();
    expect(screen.getByText('Gender is required')).toBeInTheDocument();
    expect(screen.getByText('Race is required')).toBeInTheDocument();
    expect(screen.getByText('Occupation is required')).toBeInTheDocument();
    expect(screen.getByText('Personality is required')).toBeInTheDocument();
    expect(screen.getByText('Backstory is required')).toBeInTheDocument();
    expect(screen.getByText('System prompt is required')).toBeInTheDocument();

    // Verify onSave was not called
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('handles textarea auto-resize', async () => {
    render(
      <PrivatePersonalityModal
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
      <PrivatePersonalityModal
        isOpen={true}
        initialData={mockInitialData}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    const newInitialData = {
      ...mockInitialData,
      name: 'Updated Name',
      age: '30'
    };

    rerender(
      <PrivatePersonalityModal
        isOpen={true}
        initialData={newInitialData}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByDisplayValue('Updated Name')).toBeInTheDocument();
    expect(screen.getByDisplayValue('30')).toBeInTheDocument();
  });
}); 