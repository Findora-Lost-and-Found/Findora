package com.findora.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String fromAddress;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendVerificationOtp(String toEmail, String fullName, String otp) {
        sendOtp(toEmail, fullName, otp, "Email Verification OTP", "verify your email");
    }

    public void sendPasswordResetOtp(String toEmail, String fullName, String otp) {
        sendOtp(toEmail, fullName, otp, "Password Reset OTP", "reset your password");
    }

    private void sendOtp(String toEmail, String fullName, String otp, String subject, String actionText) {
        validateMailConfiguration();

        String recipientName = StringUtils.hasText(fullName) ? fullName : "User";
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromAddress);
        message.setTo(toEmail);
        message.setSubject("Findora - " + subject);
        message.setText(
            "Hello " + recipientName + ",\n\n"
                + "Your OTP is: " + otp + "\n\n"
                + "Use this code to " + actionText + ".\n"
                + "This OTP expires in 24 hours.\n\n"
                + "If you did not request this, please ignore this email.\n\n"
                + "- Findora Team"
        );

        try {
            mailSender.send(message);
            log.info("OTP email sent to {}", toEmail);
        } catch (MailException e) {
            log.error("Failed to send OTP email to {}", toEmail, e);
            throw new RuntimeException("Failed to send OTP email. Please check mail configuration.");
        }
    }

    private void validateMailConfiguration() {
        if (!StringUtils.hasText(fromAddress)
                || fromAddress.contains("your-email@gmail.com")
                || fromAddress.equalsIgnoreCase("your-email@example.com")) {
            throw new RuntimeException("Email service is not configured. Set MAIL_USERNAME/MAIL_PASSWORD (or EMAIL_USER/EMAIL_PASSWORD in backend/.env).");
        }
    }
}
