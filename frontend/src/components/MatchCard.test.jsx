import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MatchCard from './MatchCard';

describe('MatchCard', () => {
  it('opens the OTP flow and submits through the match claim callback', () => {
    const onClaimViaOtp = vi.fn();
    const onResendOtp = vi.fn();

    const Wrapper = () => {
      const [otp, setOtp] = useState('');

      return (
        <MatchCard
          match={{ matchId: 42, score: 94, threshold: 80, foundItem: { name: 'Wallet', category: 'Wallet', location: 'Library' } }}
          otpValue={otp}
          onOtpChange={(_matchId, value) => setOtp(value)}
          onClaimViaOtp={onClaimViaOtp}
          onResendOtp={onResendOtp}
        />
      );
    };

    render(<Wrapper />);

    fireEvent.click(screen.getByRole('button', { name: 'Claim via Match (enter OTP)' }));
    fireEvent.change(screen.getByPlaceholderText('Enter OTP'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit OTP' }));

    expect(onClaimViaOtp).toHaveBeenCalledWith(42, '123456');
  });
});