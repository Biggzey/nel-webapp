import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Profile from '../pages/Profile';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

// Mock the hooks
jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn()
}));

jest.mock('../context/AuthContext', () => ({
  useAuth: jest.fn()
}));

// Mock ThemePicker component since it's tested separately
jest.mock('../components/ThemePicker', () => {
  return function MockThemePicker() {
    return <div data-testid="theme-picker">Theme Picker</div>;
  };
});

describe('Profile Component', () => {
  const mockNavigate = jest.fn();
  const mockToken = 'mock-token';
  const mockUser = {
    username: 'testuser',
    email: 'test@example.com'
  };

  beforeEach(() => {
    useNavigate.mockReturnValue(mockNavigate);
    useAuth.mockReturnValue({ token: mockToken });
    
    // Mock fetch for initial user data load
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockUser)
      })
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders profile page with user data', async () => {
    await act(async () => {
      render(<Profile />);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Your Profile')).toBeInTheDocument();
      expect(screen.getByText(mockUser.username)).toBeInTheDocument();
      expect(screen.getByDisplayValue(mockUser.email)).toBeInTheDocument();
    });
  });

  it('navigates back when clicking back button', async () => {
    await act(async () => {
      render(<Profile />);
    });
    
    const backButton = screen.getByText('← Back to Chats');
    await act(async () => {
      fireEvent.click(backButton);
    });
    
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('updates email successfully', async () => {
    const newEmail = 'newemail@example.com';
    
    global.fetch
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockUser)
      }))
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ email: newEmail })
      }));

    await act(async () => {
      render(<Profile />);
    });
    
    const emailInput = await screen.findByPlaceholderText('New email address');
    await act(async () => {
      await userEvent.clear(emailInput);
      await userEvent.type(emailInput, newEmail);
    });
    
    const updateButton = screen.getByRole('button', { name: 'Update Email' });
    await act(async () => {
      fireEvent.click(updateButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Email updated successfully!')).toBeInTheDocument();
    });
    
    expect(global.fetch).toHaveBeenCalledWith('/api/user', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mockToken}`
      },
      body: JSON.stringify({ email: newEmail })
    });
  });

  it('handles email update error', async () => {
    global.fetch
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockUser)
      }))
      .mockImplementationOnce(() => Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'Invalid email' })
      }));

    await act(async () => {
      render(<Profile />);
    });
    
    const updateButton = screen.getByRole('button', { name: 'Update Email' });
    await act(async () => {
      fireEvent.click(updateButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Invalid email')).toBeInTheDocument();
    });
  });

  it('changes password successfully', async () => {
    global.fetch
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockUser)
      }))
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ message: 'Password updated' })
      }));

    await act(async () => {
      render(<Profile />);
    });
    
    const oldPwdInput = screen.getByPlaceholderText('Current password');
    const newPwdInput = screen.getByPlaceholderText('New password');
    const confirmPwdInput = screen.getByPlaceholderText('Confirm new password');
    
    await act(async () => {
      await userEvent.type(oldPwdInput, 'oldpass123');
      await userEvent.type(newPwdInput, 'newpass123');
      await userEvent.type(confirmPwdInput, 'newpass123');
    });
    
    const changeButton = screen.getByRole('button', { name: 'Change Password' });
    await act(async () => {
      fireEvent.click(changeButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Password changed successfully!')).toBeInTheDocument();
    });
    
    expect(global.fetch).toHaveBeenCalledWith('/api/user/password', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mockToken}`
      },
      body: JSON.stringify({
        oldPassword: 'oldpass123',
        newPassword: 'newpass123',
        confirmPassword: 'newpass123'
      })
    });
  });

  it('handles password change error', async () => {
    global.fetch
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockUser)
      }))
      .mockImplementationOnce(() => Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'Invalid password' })
      }));

    await act(async () => {
      render(<Profile />);
    });
    
    const changeButton = screen.getByRole('button', { name: 'Change Password' });
    await act(async () => {
      fireEvent.click(changeButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Invalid password')).toBeInTheDocument();
    });
  });
}); 