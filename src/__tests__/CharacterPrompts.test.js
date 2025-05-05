import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CharacterPrompts } from '../components/CharacterPrompts';

describe('CharacterPrompts Component', () => {
  const mockOnChange = jest.fn();
  const defaultProps = {
    systemPrompt: 'Initial system prompt',
    customInstructions: 'Initial custom instructions',
    onChange: mockOnChange,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders both textareas with labels', () => {
    render(<CharacterPrompts {...defaultProps} />);
    
    // Check for labels
    expect(screen.getByText('System Prompt')).toBeInTheDocument();
    expect(screen.getByText('Custom Instructions')).toBeInTheDocument();
    
    // Check for textareas
    const textareas = screen.getAllByRole('textbox');
    expect(textareas).toHaveLength(2);
    
    // Check textarea values
    expect(textareas[0]).toHaveValue('Initial system prompt');
    expect(textareas[1]).toHaveValue('Initial custom instructions');
  });

  it('renders help text for both fields', () => {
    render(<CharacterPrompts {...defaultProps} />);
    
    expect(screen.getByText(/This is the initial system message/)).toBeInTheDocument();
    expect(screen.getByText(/Additional instructions that will be appended/)).toBeInTheDocument();
  });

  it('calls onChange with correct parameters when system prompt changes', () => {
    render(<CharacterPrompts {...defaultProps} />);
    
    const systemPromptTextarea = screen.getByPlaceholderText(/Define the core personality/);
    fireEvent.change(systemPromptTextarea, { target: { value: 'New system prompt' } });
    
    expect(mockOnChange).toHaveBeenCalledWith('systemPrompt', 'New system prompt');
    expect(mockOnChange).toHaveBeenCalledTimes(1);
  });

  it('calls onChange with correct parameters when custom instructions change', () => {
    render(<CharacterPrompts {...defaultProps} />);
    
    const customInstructionsTextarea = screen.getByPlaceholderText(/Add any additional instructions/);
    fireEvent.change(customInstructionsTextarea, { target: { value: 'New custom instructions' } });
    
    expect(mockOnChange).toHaveBeenCalledWith('customInstructions', 'New custom instructions');
    expect(mockOnChange).toHaveBeenCalledTimes(1);
  });

  it('renders with empty values', () => {
    render(
      <CharacterPrompts
        systemPrompt=""
        customInstructions=""
        onChange={mockOnChange}
      />
    );
    
    const textareas = screen.getAllByRole('textbox');
    expect(textareas[0]).toHaveValue('');
    expect(textareas[1]).toHaveValue('');
  });

  it('renders with correct placeholder text', () => {
    render(<CharacterPrompts {...defaultProps} />);
    
    expect(screen.getByPlaceholderText(/Define the core personality/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Add any additional instructions/)).toBeInTheDocument();
  });

  it('applies correct styling classes', () => {
    render(<CharacterPrompts {...defaultProps} />);
    
    const textareas = screen.getAllByRole('textbox');
    textareas.forEach(textarea => {
      expect(textarea).toHaveClass(
        'w-full',
        'min-h-[100px]',
        'p-2',
        'border',
        'rounded',
        'bg-background-secondary-light',
        'dark:bg-background-secondary-dark',
        'border-border-light',
        'dark:border-border-dark',
        'text-text-light',
        'dark:text-text-dark',
        'focus:outline-none',
        'focus:ring-2',
        'focus:ring-primary'
      );
    });
  });
}); 