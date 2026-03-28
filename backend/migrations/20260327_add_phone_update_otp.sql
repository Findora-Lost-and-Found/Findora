ALTER TABLE users
  ADD COLUMN pending_phone VARCHAR(20) NULL AFTER phone,
  ADD COLUMN phone_verification_otp VARCHAR(6) NULL AFTER reset_otp,
  ADD COLUMN phone_otp_expiry DATETIME NULL AFTER otp_expiry,
  ADD COLUMN is_phone_verified BOOLEAN NOT NULL DEFAULT TRUE AFTER is_verified;

CREATE UNIQUE INDEX uq_users_phone ON users(phone);
CREATE UNIQUE INDEX uq_users_pending_phone ON users(pending_phone);

UPDATE users
SET is_phone_verified = TRUE
WHERE is_phone_verified IS NULL;
