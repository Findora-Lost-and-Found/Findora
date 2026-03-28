package com.findora.dto;

/**
 * VerifyPhoneOtpRequestDTO - Request body for phone OTP verification.
 */
public class VerifyPhoneOtpRequestDTO {
    private String otp;

    public String getOtp() {
        return otp;
    }

    public void setOtp(String otp) {
        this.otp = otp;
    }
}
