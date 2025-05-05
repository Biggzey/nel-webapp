import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProfileModal from '../components/ProfileModal';
import { useAuth } from '../context/AuthContext';
import { act } from 'react-dom/test-utils';

// Mock the AuthContext
jest.mock('../context/AuthContext', () => ({
  useAuth: jest.fn()
}));

// Mock ThemePicker component
jest.mock('../components/ThemePicker', () => {
  return function MockThemePicker() {
    return <div data-testid="theme-picker">Theme Picker Mock</div>;
  };
});

// Mock Toast component
jest.mock('../components/Toast', () => {
  return function MockToast({ message, type, onClose }) {
    return (
      <div data-testid="toast" onClick={onClose}>
        {message} - {type}
      </div>
    );
  };
});

describe('ProfileModal Component', () => {
  const mockToken = 'mock-token';
  const mockOnClose = jest.fn();
  const mockUserData = {
    email: 'test@example.com',
    username: 'testuser'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({ token: mockToken });
    
    // Mock fetch for user data
    global.fetch = jest.fn((url) => {
      if (url === '/api/user' && !url.includes('password')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockUserData)
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ message: 'Success' })
      });
    });
  });

  it('renders nothing when isOpen is false', () => {
    render(<ProfileModal isOpen={false} onClose={mockOnClose} />);
    expect(screen.queryByText('Settings')).not.toBeInTheDocument();
  });

  it('renders modal content when isOpen is true', async () => {
    await act(async () => {
      render(<ProfileModal isOpen={true} onClose={mockOnClose} />);
    });
    
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Username')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Change Password' })).toBeInTheDocument();
    expect(screen.getByTestId('theme-picker')).toBeInTheDocument();
  });

  it('loads and displays user data on open', async () => {
    await act(async () => {
      render(<ProfileModal isOpen={true} onClose={mockOnClose} />);
    });
    
    expect(screen.getByText('testuser')).toBeInTheDocument();
    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
    
    expect(global.fetch).toHaveBeenCalledWith('/api/user', {
      headers: { Authorization: `Bearer ${mockToken}` }
    });
  });

  it('handles email update', async () => {
    await act(async () => {
      render(<ProfileModal isOpen={true} onClose={mockOnClose} />);
    });
    
    const emailInput = screen.getByPlaceholderText('New email address');
    const updateButton = screen.getByRole('button', { name: 'Update Email' });
    
    await act(async () => {
      fireEvent.change(emailInput, { target: { value: 'new@example.com' } });
      fireEvent.click(updateButton);
    });
    
    expect(screen.getByTestId('toast')).toHaveTextContent('Email updated successfully!');
  });

  it('handles password change', async () => {
    await act(async () => {
      render(<ProfileModal isOpen={true} onClose={mockOnClose} />);
    });
    
    const oldPwdInput = screen.getByPlaceholderText('Current password');
    const newPwdInput = screen.getByPlaceholderText('New password');
    const confirmPwdInput = screen.getByPlaceholderText('Confirm new password');
    const changeButton = screen.getByRole('button', { name: 'Change Password' });
    
    await act(async () => {
      fireEvent.change(oldPwdInput, { target: { value: 'oldpass' } });
      fireEvent.change(newPwdInput, { target: { value: 'newpass' } });
      fireEvent.change(confirmPwdInput, { target: { value: 'newpass' } });
      fireEvent.click(changeButton);
    });
    
    expect(screen.getByTestId('toast')).toHaveTextContent('Password changed successfully!');
    
    // Verify password fields are cleared
    expect(oldPwdInput).toHaveValue('');
    expect(newPwdInput).toHaveValue('');
    expect(confirmPwdInput).toHaveValue('');
  });

  it('handles API errors', async () => {
    // Mock fetch for initial user data load
    global.fetch = jest.fn()
      .mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockUserData)
        })
      )
      // Mock fetch for email update with error
      .mockImplementationOnce(() => 
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'API Error' })
        })
      );
    
    await act(async () => {
      render(<ProfileModal isOpen={true} onClose={mockOnClose} />);
    });
    
    const emailInput = screen.getByPlaceholderText('New email address');
    const updateButton = screen.getByRole('button', { name: 'Update Email' });
    
    await act(async () => {
      fireEvent.change(emailInput, { target: { value: 'new@example.com' } });
      fireEvent.click(updateButton);
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('toast')).toHaveTextContent('API Error');
    });
  });

  it('closes modal when backdrop is clicked', async () => {
    await act(async () => {
      render(<ProfileModal isOpen={true} onClose={mockOnClose} />);
    });
    
    const backdrop = screen.getByTestId('modal-backdrop');
    fireEvent.click(backdrop);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('closes modal when close button is clicked', async () => {
    await act(async () => {
      render(<ProfileModal isOpen={true} onClose={mockOnClose} />);
    });
    
    const closeButton = screen.getByRole('button', { name: '' }); // Close button with FontAwesome icon
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('dismisses toast when clicked', async () => {
    global.fetch = jest.fn().mockImplementationOnce(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ email: 'new@example.com' })
      })
    );
    
    await act(async () => {
      render(<ProfileModal isOpen={true} onClose={mockOnClose} />);
    });
    
    const emailInput = screen.getByPlaceholderText('New email address');
    const updateButton = screen.getByRole('button', { name: 'Update Email' });
    
    await act(async () => {
      fireEvent.change(emailInput, { target: { value: 'new@example.com' } });
      fireEvent.click(updateButton);
    });
    
    const toast = screen.getByTestId('toast');
    expect(toast).toBeInTheDocument();
    fireEvent.click(toast);
    expect(screen.queryByTestId('toast')).not.toBeInTheDocument();
  });
}); 