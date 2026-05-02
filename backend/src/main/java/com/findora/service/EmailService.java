package com.findora.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

@Service
@SuppressWarnings("null")
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);
    private static final String BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

    @Value("${brevo.api.key:}")
    private String brevoApiKey;

    @Value("${brevo.from.email:findora36@gmail.com}")
    private String fromEmail;

    @Value("${brevo.from.name:Findora}")
    private String fromName;

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

    public void sendAccountDeletionOtp(String toEmail, String fullName, String otp) {
        sendOtp(toEmail, fullName, otp, "Account Deletion OTP", "confirm permanent account deletion");
    }

    private void sendOtp(String toEmail, String fullName, String otp, String subject, String actionText) {
        validateMailConfiguration();
        validateRequest(toEmail, otp);

        String recipientName = StringUtils.hasText(fullName) ? fullName : "User";
        String html = buildHtml(recipientName, actionText, otp);

        String jsonBody = String.format(
            "{\"sender\":{\"name\":\"%s\",\"email\":\"%s\"}," +
            "\"to\":[{\"email\":\"%s\",\"name\":\"%s\"}]," +
            "\"subject\":\"Findora - %s\"," +
            "\"htmlContent\":\"%s\"}",
            escapeJson(fromName),
            escapeJson(fromEmail),
            escapeJson(toEmail),
            escapeJson(recipientName),
            escapeJson(subject),
            html.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "")
        );

        try {
            HttpClient client = HttpClient.newHttpClient();
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(BREVO_API_URL))
                    .header("api-key", brevoApiKey)
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                log.info("OTP email sent to {} via Brevo", toEmail);
            } else {
                log.error("Brevo API error {}: {}", response.statusCode(), response.body());
                throw new RuntimeException("Failed to send OTP email. Brevo API returned: " + response.statusCode());
            }
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to send OTP email to {}", toEmail, e);
            throw new RuntimeException("Failed to send OTP email. Please check mail configuration.");
        }
    }

    private String buildHtml(String recipientName, String actionText, String otp) {
        return "<html><body style=\"font-family:Segoe UI,Arial,sans-serif;background:#f6f8fb;padding:24px;\">"
            + "<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"max-width:560px;margin:auto;background:#ffffff;border-radius:12px;border:1px solid #e6eaf0;\">"
            + "<tr><td style=\"padding:24px 24px 8px 24px;\"><h2 style=\"margin:0;color:#1f2937;\">Findora</h2></td></tr>"
            + "<tr><td style=\"padding:8px 24px;color:#374151;\">Hello " + escapeHtml(recipientName) + ",</td></tr>"
            + "<tr><td style=\"padding:8px 24px;color:#374151;\">Use this OTP to " + escapeHtml(actionText) + ":</td></tr>"
            + "<tr><td style=\"padding:8px 24px;\"><div style=\"display:inline-block;background:#111827;color:#ffffff;padding:10px 18px;border-radius:8px;font-size:24px;letter-spacing:4px;font-weight:700;\">"
            + escapeHtml(otp) + "</div></td></tr>"
            + "<tr><td style=\"padding:8px 24px;color:#6b7280;\">This OTP expires in 24 hours.</td></tr>"
            + "<tr><td style=\"padding:8px 24px 24px 24px;color:#6b7280;\">If you did not request this, please ignore this email.</td></tr>"
            + "</table></body></html>";
    }

    private void validateMailConfiguration() {
        if (!StringUtils.hasText(brevoApiKey) || brevoApiKey.isBlank()) {
            throw new RuntimeException("Email service is not configured. Set BREVO_API_KEY in Railway Variables.");
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
        if (value == null) return "";
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                    .replace("\"", "&quot;").replace("'", "&#39;");
    }

    private String escapeJson(String value) {
        if (value == null) return "";
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}