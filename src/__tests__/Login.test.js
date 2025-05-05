import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Login from '../pages/Login';
import { AuthProvider } from '../context/AuthContext';

const mockNavigate = jest.fn();
const mockLogin = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    isAuthenticated: false,
  }),
  AuthProvider: ({ children }) => <div>{children}</div>,
}));

describe('Login Component', () => {
  const renderLogin = () => {
    return render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders login form', () => {
    renderLogin();
    expect(screen.getByRole('heading', { name: /log in/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter email or username/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
  });

  it('shows validation errors for empty fields', async () => {
    renderLogin();
    const loginButton = screen.getByRole('button', { name: /log in/i });
    
    await act(async () => {
      await userEvent.click(loginButton);
    });
    
    expect(screen.getByPlaceholderText(/enter email or username/i)).toBeRequired();
    expect(screen.getByPlaceholderText(/enter password/i)).toBeRequired();
  });

  it('handles successful login', async () => {
    mockLogin.mockResolvedValueOnce(true);
    renderLogin();
    
    await act(async () => {
      await userEvent.type(screen.getByPlaceholderText(/enter email or username/i), 'testuser');
      await userEvent.type(screen.getByPlaceholderText(/enter password/i), 'Password123');
      await userEvent.click(screen.getByRole('button', { name: /log in/i }));
    });

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith(
        'testuser',
        'Password123'
      );
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('handles login failure', async () => {
    const errorMessage = 'Invalid credentials';
    mockLogin.mockRejectedValueOnce(new Error(errorMessage));
    renderLogin();
    
    await act(async () => {
      await userEvent.type(screen.getByPlaceholderText(/enter email or username/i), 'testuser');
      await userEvent.type(screen.getByPlaceholderText(/enter password/i), 'Password123');
      await userEvent.click(screen.getByRole('button', { name: /log in/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('navigates to signup page', async () => {
    renderLogin();
    const signupLink = screen.getByRole('link', { name: /sign up/i });
    
    await act(async () => {
      await userEvent.click(signupLink);
    });
    
    expect(window.location.pathname).toBe('/signup');
  });
}); 