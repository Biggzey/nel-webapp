import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import AdminPanel from '../pages/AdminPanel';
import { AuthProvider } from '../context/AuthContext';

// Mock the useNavigate hook
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

// Mock the auth context
const mockAuthContext = {
  token: 'fake-token',
  userRole: 'SUPER_ADMIN',
  isAdmin: true,
  isSuperAdmin: true,
  isModerator: true
};

jest.mock('../context/AuthContext', () => ({
  useAuth: () => mockAuthContext,
  AuthProvider: ({ children }) => <div>{children}</div>
}));

// Mock fetch
global.fetch = jest.fn();

describe('AdminPanel Component', () => {
  const mockUsers = [
    {
      id: '1',
      username: 'testuser',
      email: 'test@example.com',
      role: 'MODERATOR',
      blocked: false,
      characters: [],
      _count: { characters: 0 }
    },
    {
      id: '2',
      username: 'adminuser',
      email: 'admin@example.com',
      role: 'ADMIN',
      blocked: false,
      characters: [],
      _count: { characters: 0 }
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock successful users fetch
    global.fetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockUsers)
      })
    );
  });

  const renderAdminPanel = async (role = 'SUPER_ADMIN') => {
    mockAuthContext.userRole = role;
    mockAuthContext.isSuperAdmin = role === 'SUPER_ADMIN';
    mockAuthContext.isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(role);
    mockAuthContext.isModerator = ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'].includes(role);
    
    let result;
    await act(async () => {
      result = render(
        <BrowserRouter>
          <AuthProvider>
            <AdminPanel />
          </AuthProvider>
        </BrowserRouter>
      );
    });
    return result;
  };

  it('renders admin panel with user list', async () => {
    await renderAdminPanel('SUPER_ADMIN');
    
    await waitFor(() => {
      expect(screen.getByText('Admin Panel')).toBeInTheDocument();
    });
    
    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
      expect(screen.getByText('adminuser')).toBeInTheDocument();
    });
  });

  it('shows correct role options based on user role', async () => {
    await renderAdminPanel('ADMIN');
    
    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    const roleSelects = screen.getAllByRole('combobox');
    expect(roleSelects[0]).toBeInTheDocument();
    
    // Admin should not see SUPER_ADMIN option
    const options = roleSelects[0].querySelectorAll('option');
    const optionValues = Array.from(options).map(opt => opt.value);
    expect(optionValues).not.toContain('SUPER_ADMIN');
  });

  it('handles role change successfully', async () => {
    const updatedUser = {
      ...mockUsers[0],
      role: 'ADMIN'
    };

    global.fetch
      .mockImplementationOnce(() => // Initial users fetch
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockUsers)
        })
      )
      .mockImplementationOnce(() => // Role update
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ 
            message: 'Role updated successfully',
            user: updatedUser
          })
        })
      )
      .mockImplementationOnce(() => // Refresh users
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockUsers.map(user => 
            user.id === '1' ? updatedUser : user
          ))
        })
      );

    await renderAdminPanel('SUPER_ADMIN');
    
    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    const roleSelect = screen.getAllByRole('combobox')[0];
    await act(async () => {
      await userEvent.selectOptions(roleSelect, 'ADMIN');
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/users/1/role'),
        expect.objectContaining({
          method: 'PATCH',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer fake-token'
          }),
          body: JSON.stringify({ role: 'ADMIN' })
        })
      );
    });
  });

  it('handles user blocking successfully', async () => {
    const blockedUser = {
      ...mockUsers[0],
      blocked: true,
      blockedUntil: new Date(Date.now() + 3600000).toISOString() // 1 hour from now
    };

    global.fetch
      .mockImplementationOnce(() => // Initial users fetch
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockUsers)
        })
      )
      .mockImplementationOnce(() => // Block user
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ message: 'User blocked successfully' })
        })
      )
      .mockImplementationOnce(() => // Refresh users
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockUsers.map(user => 
            user.id === '1' ? blockedUser : user
          ))
        })
      );

    await renderAdminPanel('SUPER_ADMIN');
    
    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    // Click block button
    const blockButtons = screen.getAllByText('Block');
    await act(async () => {
      await userEvent.click(blockButtons[0]);
    });

    // Click 1 Hour block option
    const blockOptions = screen.getAllByText('1 Hour');
    await act(async () => {
      await userEvent.click(blockOptions[0]);
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/users/1/block'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer fake-token'
          }),
          body: JSON.stringify({ duration: '1h' })
        })
      );
    });
  });

  it('handles role change failure', async () => {
    global.fetch
      .mockImplementationOnce(() => // Initial users fetch
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockUsers)
        })
      )
      .mockImplementationOnce(() => // Role update failure
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ message: 'Failed to update user role' })
        })
      );

    await renderAdminPanel('SUPER_ADMIN');
    
    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    const roleSelect = screen.getAllByRole('combobox')[0];
    await act(async () => {
      await userEvent.selectOptions(roleSelect, 'ADMIN');
    });

    await waitFor(() => {
      expect(screen.getByText('Failed to update user role')).toBeInTheDocument();
    });
  });

  it('handles user blocking failure', async () => {
    global.fetch
      .mockImplementationOnce(() => // Initial users fetch
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockUsers)
        })
      )
      .mockImplementationOnce(() => // Block user failure
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ message: 'Failed to block user' })
        })
      );

    await renderAdminPanel('SUPER_ADMIN');
    
    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    // Click block button
    const blockButtons = screen.getAllByText('Block');
    await act(async () => {
      await userEvent.click(blockButtons[0]);
    });

    // Click 1 Hour block option
    const blockOptions = screen.getAllByText('1 Hour');
    await act(async () => {
      await userEvent.click(blockOptions[0]);
    });

    await waitFor(() => {
      expect(screen.getByText('Failed to block user')).toBeInTheDocument();
    });
  });

  it('handles unblock user successfully', async () => {
    const blockedUser = {
      ...mockUsers[0],
      blocked: true,
      blockedUntil: new Date(Date.now() + 3600000).toISOString() // 1 hour from now
    };

    const unblockedUser = {
      ...mockUsers[0],
      blocked: false,
      blockedUntil: null
    };

    global.fetch
      .mockImplementationOnce(() => // Initial users fetch with blocked user
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([blockedUser, mockUsers[1]])
        })
      )
      .mockImplementationOnce(() => // Unblock user
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ message: 'User unblocked successfully' })
        })
      )
      .mockImplementationOnce(() => // Refresh users
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([unblockedUser, mockUsers[1]])
        })
      );

    await renderAdminPanel('SUPER_ADMIN');
    
    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    // Wait for the block status to be visible
    await waitFor(() => {
      expect(screen.getByText(/Blocked until/)).toBeInTheDocument();
    });

    // Find and click the unblock button
    const unblockButton = screen.getByText('Unblock');
    await act(async () => {
      await userEvent.click(unblockButton);
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/users/1/unblock'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer fake-token'
          })
        })
      );
    });

    // Verify the success toast is shown
    await waitFor(() => {
      expect(screen.getByText('User unblocked successfully')).toBeInTheDocument();
    });
  });
}); 