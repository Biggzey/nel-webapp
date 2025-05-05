import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ReactionPicker from '../components/ReactionPicker';

describe('ReactionPicker Component', () => {
  const mockOnSelect = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    // Clear mock function calls before each test
    jest.clearAllMocks();
  });

  it('renders all emoji buttons', () => {
    render(<ReactionPicker onSelect={mockOnSelect} onClose={mockOnClose} />);
    
    // Check if all emojis are rendered
    const expectedEmojis = ["👍", "❤️", "😄", "🎉", "👎"];
    expectedEmojis.forEach(emoji => {
      expect(screen.getByText(emoji)).toBeInTheDocument();
    });
  });

  it('calls onSelect and onClose when an emoji is clicked', () => {
    render(<ReactionPicker onSelect={mockOnSelect} onClose={mockOnClose} />);
    
    // Click the first emoji (👍)
    fireEvent.click(screen.getByText('👍'));
    
    // Verify that both callbacks were called with correct arguments
    expect(mockOnSelect).toHaveBeenCalledWith('👍');
    expect(mockOnClose).toHaveBeenCalled();
    expect(mockOnSelect).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls callbacks for each emoji when clicked', () => {
    render(<ReactionPicker onSelect={mockOnSelect} onClose={mockOnClose} />);
    
    // Test clicking each emoji
    const emojis = ["👍", "❤️", "😄", "🎉", "👎"];
    emojis.forEach(emoji => {
      fireEvent.click(screen.getByText(emoji));
      expect(mockOnSelect).toHaveBeenCalledWith(emoji);
      expect(mockOnClose).toHaveBeenCalled();
    });
    
    // Verify total number of calls
    expect(mockOnSelect).toHaveBeenCalledTimes(5);
    expect(mockOnClose).toHaveBeenCalledTimes(5);
  });

  it('renders with correct styling classes', () => {
    render(<ReactionPicker onSelect={mockOnSelect} onClose={mockOnClose} />);
    
    // Check container styling
    const container = screen.getByTestId('reaction-picker');
    expect(container).toHaveClass(
      'absolute',
      'flex',
      'space-x-1',
      'bg-[#f0f2f5]',
      'dark:bg-[#1e1e1e]',
      'border',
      'border-gray-300',
      'dark:border-gray-600',
      'rounded',
      'shadow-lg',
      'p-1'
    );
    
    // Check button styling
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toHaveClass(
        'px-1',
        'text-xl',
        'hover:bg-gray-200',
        'dark:hover:bg-gray-700',
        'rounded'
      );
    });
  });
}); 