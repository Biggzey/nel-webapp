import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import * as router from 'react-router-dom';
import Signup from '../pages/Signup';
import { AuthProvider } from '../context/AuthContext';

// Mock the useNavigate hook
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

// Mock the signup function
const mockSignup = jest.fn();
jest.mock('../context/AuthContext', () => ({
  ...jest.requireActual('../context/AuthContext'),
  useAuth: () => ({
    signup: mockSignup
  })
}));

describe('Signup Component', () => {
  const renderSignup = () => {
    return render(
      <BrowserRouter>
        <AuthProvider>
        <Signup />
        </AuthProvider>
      </BrowserRouter>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSignup.mockResolvedValue(true);
  });

  it('renders signup form', () => {
    renderSignup();
    expect(screen.getByRole('heading', { name: /sign up/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter your email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/choose a username/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/create a password/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/confirm your password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('shows validation errors for empty fields', async () => {
    renderSignup();
    const signupButton = screen.getByRole('button', { name: /create account/i });
    
    await act(async () => {
    await userEvent.click(signupButton);
    });
    
    expect(screen.getByPlaceholderText(/enter your email/i)).toBeRequired();
    expect(screen.getByPlaceholderText(/choose a username/i)).toBeRequired();
    expect(screen.getByPlaceholderText(/create a password/i)).toBeRequired();
    expect(screen.getByPlaceholderText(/confirm your password/i)).toBeRequired();
  });

  it('shows error when passwords do not match', async () => {
    renderSignup();
    
    await act(async () => {
    await userEvent.type(screen.getByPlaceholderText(/enter your email/i), 'test@example.com');
    await userEvent.type(screen.getByPlaceholderText(/choose a username/i), 'testuser');
    await userEvent.type(screen.getByPlaceholderText(/create a password/i), 'Password123');
    await userEvent.type(screen.getByPlaceholderText(/confirm your password/i), 'Password456');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    });

    await waitFor(() => {
      const errorMessages = screen.getAllByText(/passwords do not match/i);
      expect(errorMessages.length).toBeGreaterThan(0);
    });
  });

  it('handles successful signup', async () => {
    renderSignup();
    mockSignup.mockResolvedValueOnce(true);
    
    await act(async () => {
    await userEvent.type(screen.getByPlaceholderText(/enter your email/i), 'test@example.com');
    await userEvent.type(screen.getByPlaceholderText(/choose a username/i), 'testuser');
    await userEvent.type(screen.getByPlaceholderText(/create a password/i), 'Password123');
    await userEvent.type(screen.getByPlaceholderText(/confirm your password/i), 'Password123');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    });

    await waitFor(() => {
      expect(mockSignup).toHaveBeenCalledWith(
        'test@example.com',
        'testuser',
        'Password123',
        'Password123'
      );
      });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  it('handles signup failure', async () => {
    const errorMessage = 'Email already exists';
    mockSignup.mockRejectedValueOnce(new Error(errorMessage));
    renderSignup();
    
    await act(async () => {
    await userEvent.type(screen.getByPlaceholderText(/enter your email/i), 'test@example.com');
    await userEvent.type(screen.getByPlaceholderText(/choose a username/i), 'testuser');
    await userEvent.type(screen.getByPlaceholderText(/create a password/i), 'Password123');
    await userEvent.type(screen.getByPlaceholderText(/confirm your password/i), 'Password123');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('navigates to login page', async () => {
    renderSignup();
    const loginLink = screen.getByRole('link', { name: /log in/i });
    
    await act(async () => {
    await userEvent.click(loginLink);
    });
    
    expect(window.location.pathname).toBe('/login');
  });
}); 