import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Register } from '../Register';
import { TestWrapper, mockUseAuth, mockNavigate } from '../../test-utils';

// Mock the useAuth hook
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('Register', () => {
  const fillForm = (getByPlaceholderText: any, formData: any) => {
    fireEvent.change(getByPlaceholderText('Choose a username'), { 
      target: { value: formData.username } 
    });
    fireEvent.change(getByPlaceholderText('your.email@example.com'), { 
      target: { value: formData.email } 
    });
    fireEvent.change(getByPlaceholderText('Your full name'), { 
      target: { value: formData.fullName || '' } 
    });
    fireEvent.change(getByPlaceholderText('At least 6 characters'), { 
      target: { value: formData.password } 
    });
    fireEvent.change(getByPlaceholderText('Confirm your password'), { 
      target: { value: formData.confirmPassword } 
    });
  };

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  it('renders the registration form', () => {
    render(
      <TestWrapper>
        <Register />
      </TestWrapper>
    );

    expect(screen.getByText('Create Account')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Choose a username')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('your.email@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Your full name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('At least 6 characters')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Confirm your password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    expect(screen.getByText('Already have an account?')).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const { getByRole, getByPlaceholderText } = render(
      <TestWrapper>
        <Register />
      </TestWrapper>
    );

    const submitButton = getByRole('button', { name: /create account/i });
    fireEvent.click(submitButton);

    // Check for validation messages
    await waitFor(() => {
      const usernameInput = getByPlaceholderText('Choose a username');
      const emailInput = getByPlaceholderText('your.email@example.com');
      const passwordInput = getByPlaceholderText('At least 6 characters');
      const confirmPasswordInput = getByPlaceholderText('Confirm your password');
      
      expect(usernameInput).toBeInvalid();
      expect(emailInput).toBeInvalid();
      expect(passwordInput).toBeInvalid();
      expect(confirmPasswordInput).toBeInvalid();
    });
  });

  it('validates password length', async () => {
    const { getByRole, getByPlaceholderText, findByText } = render(
      <TestWrapper>
        <Register />
      </TestWrapper>
    );

    fillForm(getByPlaceholderText, {
      username: 'testuser',
      email: 'test@example.com',
      password: '12345',
      confirmPassword: '12345'
    });

    const submitButton = getByRole('button', { name: /create account/i });
    fireEvent.click(submitButton);

    const errorMessage = await findByText('Password must be at least 6 characters');
    expect(errorMessage).toBeInTheDocument();
  });

  it('validates password match', async () => {
    const { getByRole, getByPlaceholderText, findByText } = render(
      <TestWrapper>
        <Register />
      </TestWrapper>
    );

    fillForm(getByPlaceholderText, {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'differentpass'
    });

    const submitButton = getByRole('button', { name: /create account/i });
    fireEvent.click(submitButton);

    const errorMessage = await findByText('Passwords do not match');
    expect(errorMessage).toBeInTheDocument();
  });

  it('handles registration success', async () => {
    const mockRegister = vi.fn().mockResolvedValue({});
    vi.mocked(require('../../contexts/AuthContext').useAuth).mockReturnValue({
      ...mockUseAuth(),
      register: mockRegister,
    });

    const { getByPlaceholderText, getByRole } = render(
      <TestWrapper>
        <Register />
      </TestWrapper>
    );

    fillForm(getByPlaceholderText, {
      username: 'testuser',
      email: 'test@example.com',
      fullName: 'Test User',
      password: 'password123',
      confirmPassword: 'password123'
    });

    const submitButton = getByRole('button', { name: /create account/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith(
        'testuser',
        'test@example.com',
        'password123',
        'Test User'
      );
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('displays error message on registration failure', async () => {
    const errorMessage = 'Registration failed';
    const mockRegister = vi.fn().mockRejectedValue(new Error(errorMessage));
    
    vi.mocked(require('../../contexts/AuthContext').useAuth).mockReturnValue({
      ...mockUseAuth(),
      register: mockRegister,
    });

    const { getByPlaceholderText, getByRole, findByText } = render(
      <TestWrapper>
        <Register />
      </TestWrapper>
    );

    fillForm(getByPlaceholderText, {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123'
    });

    const submitButton = getByRole('button', { name: /create account/i });
    fireEvent.click(submitButton);

    // Check if error message is displayed
    const errorElement = await findByText(errorMessage);
    expect(errorElement).toBeInTheDocument();
  });

  it('navigates to login page when clicking sign in link', () => {
    const { getByText } = render(
      <TestWrapper>
        <Register />
      </TestWrapper>
    );

    const signInLink = getByText('Sign in');
    fireEvent.click(signInLink);

    expect(window.location.pathname).toBe('/login');
  });
});
