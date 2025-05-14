import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PublicPersonalityModal from '../components/PublicPersonalityModal';

// Mock the CharacterContext
const mockResetCurrentCharacter = jest.fn();
jest.mock('../context/CharacterContext', () => ({
  useCharacter: () => ({
    resetCurrentCharacter: mockResetCurrentCharacter
  })
}));

describe('PublicPersonalityModal Component', () => {
  const mockOnClose = jest.fn();
  const mockOnSave = jest.fn();
  const mockInitialData = {
    name: 'Test Character',
    tagline: 'A friendly AI assistant',
    description: 'A helpful and knowledgeable AI',
    tags: ['friendly', 'helpful'],
    avatar: 'https://example.com/avatar.png',
    isPublic: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    render(
      <PublicPersonalityModal
        isOpen={false}
        initialData={mockInitialData}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );
    expect(screen.queryByText('Create Public Character')).not.toBeInTheDocument();
  });

  it('renders modal content when isOpen is true', () => {
    render(
      <PublicPersonalityModal
        isOpen={true}
        initialData={mockInitialData}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );
    expect(screen.getByText('Create Public Character')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Character')).toBeInTheDocument();
    expect(screen.getByDisplayValue('A friendly AI assistant')).toBeInTheDocument();
  });

  it('handles input changes correctly', async () => {
    render(
      <PublicPersonalityModal
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
      <PublicPersonalityModal
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
      isPublic: true
    }));
  });

  it('handles file uploads', async () => {
    const file = new File(['test'], 'test.png', { type: 'image/png' });
    render(
      <PublicPersonalityModal
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
      <PublicPersonalityModal
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
      <PublicPersonalityModal
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
    expect(screen.getByText('Tagline is required')).toBeInTheDocument();
    expect(screen.getByText('Description is required')).toBeInTheDocument();
    expect(screen.getByText('At least one tag is required')).toBeInTheDocument();

    // Verify onSave was not called
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('handles tag input and removal', async () => {
    render(
      <PublicPersonalityModal
        isOpen={true}
        initialData={mockInitialData}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    const tagInput = screen.getByPlaceholderText('Add a tag');
    await userEvent.type(tagInput, 'newtag{enter}');

    // Check if new tag was added
    expect(screen.getByText('newtag')).toBeInTheDocument();

    // Remove a tag
    const removeButtons = screen.getAllByRole('button', { name: /remove tag/i });
    await userEvent.click(removeButtons[0]);

    // Check if tag was removed
    expect(screen.queryByText('friendly')).not.toBeInTheDocument();
  });
}); 