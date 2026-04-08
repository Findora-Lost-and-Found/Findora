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

SET @matches_score_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'matches'
    AND COLUMN_NAME = 'score'
);
SET @matches_score_sql = IF(
  @matches_score_exists = 0,
  'ALTER TABLE matches ADD COLUMN score DECIMAL(5,2) NULL AFTER found_item_id',
  'SELECT 1'
);
PREPARE stmt FROM @matches_score_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @matches_threshold_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'matches'
    AND COLUMN_NAME = 'threshold'
);
SET @matches_threshold_sql = IF(
  @matches_threshold_exists = 0,
  'ALTER TABLE matches ADD COLUMN threshold INT NOT NULL DEFAULT 60 AFTER score',
  'SELECT 1'
);
PREPARE stmt FROM @matches_threshold_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @matches_otp_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'matches'
    AND COLUMN_NAME = 'otp'
);
SET @matches_otp_sql = IF(
  @matches_otp_exists = 0,
  'ALTER TABLE matches ADD COLUMN otp VARCHAR(128) NULL AFTER threshold',
  'SELECT 1'
);
PREPARE stmt FROM @matches_otp_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @matches_otp_expiry_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'matches'
    AND COLUMN_NAME = 'otp_expiry'
);
SET @matches_otp_expiry_sql = IF(
  @matches_otp_expiry_exists = 0,
  'ALTER TABLE matches ADD COLUMN otp_expiry DATETIME NULL AFTER otp',
  'SELECT 1'
);
PREPARE stmt FROM @matches_otp_expiry_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @matches_otp_attempts_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'matches'
    AND COLUMN_NAME = 'otp_attempts'
);
SET @matches_otp_attempts_sql = IF(
  @matches_otp_attempts_exists = 0,
  'ALTER TABLE matches ADD COLUMN otp_attempts INT NOT NULL DEFAULT 0 AFTER otp_expiry',
  'SELECT 1'
);
PREPARE stmt FROM @matches_otp_attempts_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @matches_notified_at_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'matches'
    AND COLUMN_NAME = 'notified_at'
);
SET @matches_notified_at_sql = IF(
  @matches_notified_at_exists = 0,
  'ALTER TABLE matches ADD COLUMN notified_at DATETIME NULL AFTER otp_attempts',
  'SELECT 1'
);
PREPARE stmt FROM @matches_notified_at_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @matches_status_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'matches'
    AND COLUMN_NAME = 'status'
);
SET @matches_status_sql = IF(
  @matches_status_exists = 0,
  'ALTER TABLE matches ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT ''PENDING'' AFTER notified_at',
  'SELECT 1'
);
PREPARE stmt FROM @matches_status_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE matches
SET score = COALESCE(score, match_score)
WHERE score IS NULL;

UPDATE matches
SET status = CASE
  WHEN status IS NULL OR status = '' THEN CASE WHEN is_notified = 1 THEN 'NOTIFIED' ELSE 'PENDING' END
  ELSE status
END;

UPDATE matches
SET notified_at = COALESCE(notified_at, created_at)
WHERE is_notified = 1;

ALTER TABLE matches
MODIFY COLUMN match_type ENUM('Item Found','Possible Match') NOT NULL DEFAULT 'Possible Match';
