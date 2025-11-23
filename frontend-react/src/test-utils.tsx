import React, { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { vi } from 'vitest';
import type { Mock } from 'vitest';

type WrapperProps = {
  children: ReactNode;
  initialEntries?: string[];
};

export const TestWrapper = ({ 
  children, 
  initialEntries = ['/'] 
}: WrapperProps) => {
  return (
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </MemoryRouter>
  );
};

export const mockAuth = {
  user: null as { id: string; username: string; email: string; fullName?: string } | null,
  token: null as string | null,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  isAuthenticated: false,
  isLoading: false,
};

// Mock the useAuth hook
export const mockUseAuth = () => ({
  ...mockAuth,
  login: vi.fn().mockResolvedValue({}),
  register: vi.fn().mockResolvedValue({}),
});

// Mock the useNavigate hook
export const mockNavigate = vi.fn() as Mock;

// Mock the react-router-dom module
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual as object,
    useNavigate: () => mockNavigate,
    Link: ({ children, to }: { children: ReactNode; to: string }) => (
      <a href={to} data-testid="mock-link">{children}</a>
    ),
  };
});

// Mock the lucide-react icons
vi.mock('lucide-react', () => ({
  LogIn: () => <div data-testid="login-icon">LogInIcon</div>,
  Mail: () => <div data-testid="mail-icon">MailIcon</div>,
  Lock: () => <div data-testid="lock-icon">LockIcon</div>,
  User: () => <div data-testid="user-icon">UserIcon</div>,
  UserPlus: () => <div data-testid="user-plus-icon">UserPlusIcon</div>,
  AlertCircle: () => <div data-testid="alert-circle-icon">AlertCircleIcon</div>,
}));

// Mock the ThemeToggle component
vi.mock('../components/ui/ThemeToggle', () => ({
  ThemeToggle: () => <div data-testid="theme-toggle">ThemeToggle</div>,
}));
