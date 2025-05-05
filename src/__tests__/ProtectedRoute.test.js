import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import { AuthProvider } from '../context/AuthContext';

// Mock the auth context
const mockAuthContext = {
  token: null
};

jest.mock('../context/AuthContext', () => ({
  useAuth: () => mockAuthContext,
  AuthProvider: ({ children }) => <div>{children}</div>
}));

describe('ProtectedRoute Component', () => {
  const TestComponent = () => <div>Protected Content</div>;
  const LoginComponent = () => <div>Login Page</div>;

  const renderProtectedRoute = (authenticated = false) => {
    mockAuthContext.token = authenticated ? 'fake-token' : null;
    
    return render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/login" element={<LoginComponent />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <TestComponent />
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );
  };

  it('redirects to login when not authenticated', () => {
    renderProtectedRoute(false);
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('renders protected content when authenticated', () => {
    renderProtectedRoute(true);
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
}); 