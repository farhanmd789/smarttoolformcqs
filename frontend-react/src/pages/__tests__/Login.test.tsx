import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Login } from '../Login';
import { TestWrapper, mockUseAuth, mockNavigate } from '../../test-utils';

// Mock the useAuth hook
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('Login', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  it('renders the login form', () => {
    render(
      <TestWrapper>
        <Login />
      </TestWrapper>
    );

    expect(screen.getByText('Welcome Back')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your username or email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByText("Don't have an account?")).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const { getByRole, getByPlaceholderText } = render(
      <TestWrapper>
        <Login />
      </TestWrapper>
    );

    const submitButton = getByRole('button', { name: /sign in/i });
    fireEvent.click(submitButton);

    // Check for validation messages
    await waitFor(() => {
      const usernameInput = getByPlaceholderText('Enter your username or email');
      expect(usernameInput).toBeInvalid();
      
      const passwordInput = getByPlaceholderText('Enter your password');
      expect(passwordInput).toBeInvalid();
    });
  });

  it('handles login success', async () => {
    const mockLogin = vi.fn().mockResolvedValue({});
    vi.mocked(require('../../contexts/AuthContext').useAuth).mockReturnValue({
      ...mockUseAuth(),
      login: mockLogin,
    });

    const { getByPlaceholderText, getByRole } = render(
      <TestWrapper>
        <Login />
      </TestWrapper>
    );

    const usernameInput = getByPlaceholderText('Enter your username or email');
    const passwordInput = getByPlaceholderText('Enter your password');
    const submitButton = getByRole('button', { name: /sign in/i });

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('testuser', 'password123');
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('displays error message on login failure', async () => {
    const errorMessage = 'Invalid credentials';
    const mockLogin = jest.fn().mockRejectedValue(new Error(errorMessage));
    
    vi.mocked(require('../../contexts/AuthContext').useAuth).mockReturnValue({
      ...mockUseAuth(),
      login: mockLogin,
    });

    const { getByPlaceholderText, getByRole, findByText } = render(
      <TestWrapper>
        <Login />
      </TestWrapper>
    );

    const usernameInput = getByPlaceholderText('Enter your username or email');
    const passwordInput = getByPlaceholderText('Enter your password');
    const submitButton = getByRole('button', { name: /sign in/i });

    fireEvent.change(usernameInput, { target: { value: 'wronguser' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpass' } });
    fireEvent.click(submitButton);

    // Check if error message is displayed
    const errorElement = await findByText(errorMessage);
    expect(errorElement).toBeInTheDocument();
  });

  it('navigates to register page when clicking sign up link', () => {
    const { getByText } = render(
      <TestWrapper>
        <Login />
      </TestWrapper>
    );

    const signUpLink = getByText('Sign up');
    fireEvent.click(signUpLink);

    expect(window.location.pathname).toBe('/register');
  });
});
