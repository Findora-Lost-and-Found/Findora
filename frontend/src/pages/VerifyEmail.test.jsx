import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import VerifyEmail from './VerifyEmail';

const mocked = vi.hoisted(() => ({
  navigate: vi.fn(),
  verifyEmail: vi.fn(),
  resendOtp: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn()
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    verifyEmail: mocked.verifyEmail,
    resendOTP: mocked.resendOtp,
    user: {
      email: 'student@example.com',
      role: 'student'
    }
  })
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mocked.navigate
  };
});

vi.mock('react-toastify', () => ({
  toast: {
    error: mocked.toastError,
    success: mocked.toastSuccess
  }
}));

describe('VerifyEmail', () => {
  beforeEach(() => {
    mocked.navigate.mockReset();
    mocked.verifyEmail.mockReset();
    mocked.resendOtp.mockReset();
    mocked.toastError.mockReset();
    mocked.toastSuccess.mockReset();
  });

  it('shows the failure toast when verifyEmail rejects', async () => {
    mocked.verifyEmail.mockRejectedValue(new Error('Invalid OTP'));

    render(
      <MemoryRouter>
        <VerifyEmail />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('000000'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify Email' }));

    await waitFor(() => {
      expect(mocked.toastError).toHaveBeenCalledWith('Invalid OTP');
    });
    expect(mocked.navigate).not.toHaveBeenCalled();
  });
});