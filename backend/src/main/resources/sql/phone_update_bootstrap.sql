SET @db_name = DATABASE();

SET @pending_phone_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'pending_phone'
);
SET @pending_phone_sql = IF(
  @pending_phone_exists = 0,
  'ALTER TABLE users ADD COLUMN pending_phone VARCHAR(20) NULL AFTER phone',
  'SELECT 1'
);
PREPARE stmt FROM @pending_phone_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @phone_verification_otp_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'phone_verification_otp'
);
SET @phone_verification_otp_sql = IF(
  @phone_verification_otp_exists = 0,
  'ALTER TABLE users ADD COLUMN phone_verification_otp VARCHAR(6) NULL AFTER reset_otp',
  'SELECT 1'
);
PREPARE stmt FROM @phone_verification_otp_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @phone_otp_expiry_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'phone_otp_expiry'
);
SET @phone_otp_expiry_sql = IF(
  @phone_otp_expiry_exists = 0,
  'ALTER TABLE users ADD COLUMN phone_otp_expiry DATETIME NULL AFTER otp_expiry',
  'SELECT 1'
);
PREPARE stmt FROM @phone_otp_expiry_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @is_phone_verified_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'is_phone_verified'
);
SET @is_phone_verified_sql = IF(
  @is_phone_verified_exists = 0,
  'ALTER TABLE users ADD COLUMN is_phone_verified BOOLEAN NOT NULL DEFAULT TRUE AFTER is_verified',
  'SELECT 1'
);
PREPARE stmt FROM @is_phone_verified_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
