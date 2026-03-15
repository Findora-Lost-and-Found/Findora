# Email Configuration Guide for Findora

## Important: OTP is sent to EMAIL, not Phone!

The phone number field during signup is **optional** and only used for contact information. All OTP codes are sent via **email**.

## Setup Gmail for OTP Emails

### Step 1: Enable 2-Factor Authentication

1. Go to your Google Account: https://myaccount.google.com/
2. Click on **Security** in the left sidebar
3. Under "How you sign in to Google", click **2-Step Verification**
4. Follow the prompts to enable 2FA

### Step 2: Generate App Password

1. After enabling 2FA, go back to **Security** settings
2. Under "How you sign in to Google", click **App passwords**
3. Select app: Choose **Mail**
4. Select device: Choose **Other (Custom name)**
5. Enter name: Type "Findora"
6. Click **Generate**
7. **Copy the 16-character password** (format: xxxx xxxx xxxx xxxx)

### Step 3: Update Spring Boot Mail Properties

Open `backend/src/main/resources/application.properties` and update:

```properties
spring.mail.host=smtp.gmail.com
spring.mail.port=587
spring.mail.username=your_actual_gmail@gmail.com
spring.mail.password=xxxx xxxx xxxx xxxx
spring.mail.properties.mail.smtp.auth=true
spring.mail.properties.mail.smtp.starttls.enable=true
spring.mail.properties.mail.smtp.starttls.required=true
```

**Replace:**
- `your_actual_gmail@gmail.com` with your Gmail address
- `xxxx xxxx xxxx xxxx` with the app password from Step 2

### Step 4: Restart Backend Server

After updating `application.properties`, restart the backend:

```bash
cd backend
mvn spring-boot:run
```

## Testing Email OTP

1. **Sign up** with a valid email address
2. Check your email inbox (and spam folder!)
3. You'll receive an email with a 6-digit OTP
4. Enter the OTP on the verify-email page
5. Your account will be activated

## Common Issues

### "Error sending email"
- Check if `spring.mail.username` and `spring.mail.password` are correct
- Make sure you used an App Password, not your regular password
- Verify 2FA is enabled on your Google account

### "Email not received"
- Check spam/junk folder
- Wait a few minutes (sometimes delayed)
- Click "Resend OTP" button
- Verify the email address is correct

### "Invalid OTP"
- OTP expires after 10 minutes
- Make sure you're entering the most recent OTP
- Try requesting a new OTP

## Alternative: Use a Test Email Service

For development/testing, you can use services like:
- **Mailtrap.io** (free testing inbox)
- **MailHog** (local email testing)

### Using Mailtrap:

1. Sign up at https://mailtrap.io
2. Get SMTP credentials from your inbox
3. Update `backend/src/main/resources/application.properties`:

```properties
spring.mail.host=smtp.mailtrap.io
spring.mail.port=2525
spring.mail.username=your_mailtrap_username
spring.mail.password=your_mailtrap_password
```

## Security Notes

- Do not commit real mail credentials or secrets to version control
- App passwords are safer than regular passwords
- Change app passwords regularly
- Revoke unused app passwords

## Need Help?

If you continue to have issues:
1. Check backend terminal for error messages
2. Verify database connection is working
3. Test with a different email address
4. Check firewall/antivirus isn't blocking SMTP
