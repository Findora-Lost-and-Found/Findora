package com.findora.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

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

    public void sendPhoneChangeOtp(String toEmail, String fullName, String otp, String pendingPhone) {
        String action = "verify your new phone number ending with "
            + (pendingPhone != null && pendingPhone.length() >= 4 ? pendingPhone.substring(pendingPhone.length() - 4) : "XXXX");
        sendOtp(toEmail, fullName, otp, "Phone Update Verification OTP", action);
    }

    private void sendOtp(String toEmail, String fullName, String otp, String subject, String actionText) {
        validateMailConfiguration();
                validateRequest(toEmail, otp);

        String recipientName = StringUtils.hasText(fullName) ? fullName : "User";
                String html = """
                        <html>
                            <body style="font-family:Segoe UI,Arial,sans-serif;background:#f6f8fb;padding:24px;">
                                <table width="100%%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:auto;background:#ffffff;border-radius:12px;border:1px solid #e6eaf0;">
                                    <tr>
                                        <td style="padding:24px 24px 8px 24px;">
                                            <h2 style="margin:0;color:#1f2937;">Findora</h2>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding:8px 24px;color:#374151;">Hello %s,</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:8px 24px;color:#374151;">Use this OTP to %s:</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:8px 24px;">
                                            <div style="display:inline-block;background:#111827;color:#ffffff;padding:10px 18px;border-radius:8px;font-size:24px;letter-spacing:4px;font-weight:700;">
                                                %s
                                            </div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding:8px 24px;color:#6b7280;">This OTP expires in 24 hours.</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:8px 24px 24px 24px;color:#6b7280;">If you did not request this, please ignore this email.</td>
                                    </tr>
                                </table>
                            </body>
                        </html>
                        """.formatted(escapeHtml(recipientName), escapeHtml(actionText), escapeHtml(otp));

        try {
                        MimeMessage mimeMessage = mailSender.createMimeMessage();
                        MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, "UTF-8");
                        helper.setFrom(fromAddress);
                        helper.setTo(toEmail);
                        helper.setSubject("Findora - " + subject);
                        helper.setText(html, true);

                        mailSender.send(mimeMessage);
            log.info("OTP email sent to {}", toEmail);
                } catch (MessagingException | MailException e) {
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

    private void validateRequest(String toEmail, String otp) {
        if (!StringUtils.hasText(toEmail)) {
            throw new RuntimeException("Recipient email is required");
        }
        if (!StringUtils.hasText(otp)) {
            throw new RuntimeException("OTP is required");
        }
    }

    private String escapeHtml(String value) {
        if (value == null) {
            return "";
        }
        return value
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;")
            .replace("'", "&#39;");
    }
}
