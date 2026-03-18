import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';
import { authAPI } from '../services/api';

vi.mock('../services/api', () => ({
  authAPI: {
    getMe: vi.fn(),
    verifyEmail: vi.fn(),
    resendOTP: vi.fn(),
    register: vi.fn(),
    login: vi.fn()
  }
}));

vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn()
  }
}));

const Consumer = () => {
  const { loading, user, verifyEmail } = useAuth();
  const [result, setResult] = useState('idle');

  if (loading) {
    return <div>loading</div>;
  }

  return (
    <div>
      <div>{user?.username}</div>
      <button
        type="button"
        onClick={async () => {
          try {
            await verifyEmail('000000');
            setResult('resolved');
          } catch (error) {
            setResult(error.message);
          }
        }}
      >
        verify
      </button>
      <div>{result}</div>
    </div>
  );
};

describe('AuthContext.verifyEmail', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('token', 'fake-token');
    authAPI.getMe.mockResolvedValue({
      data: {
        user: {
          id: 1,
          username: 'tester',
          email: 'tester@example.com'
        }
      }
    });
  });

  it('rejects when the API returns a verification failure', async () => {
    authAPI.verifyEmail.mockRejectedValue({
      response: {
        data: {
          message: 'Invalid OTP'
        }
      }
    });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await screen.findByText('tester');
    fireEvent.click(screen.getByRole('button', { name: 'verify' }));

    await waitFor(() => {
      expect(screen.getByText('Invalid OTP')).toBeInTheDocument();
    });
  });
});