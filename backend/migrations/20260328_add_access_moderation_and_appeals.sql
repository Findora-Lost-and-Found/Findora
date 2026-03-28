ALTER TABLE users
  ADD COLUMN bad_post_attempts INT NOT NULL DEFAULT 0 AFTER is_suspended,
  ADD COLUMN suspension_until DATETIME NULL AFTER bad_post_attempts;

CREATE TABLE IF NOT EXISTS user_access_appeals (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  action_type ENUM('suspension', 'ban') NOT NULL,
  status ENUM('pending', 'approved', 'declined') NOT NULL DEFAULT 'pending',
  appeal_text TEXT NOT NULL,
  admin_notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at DATETIME NULL,
  CONSTRAINT fk_access_appeals_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_access_appeals_user_id ON user_access_appeals (user_id);
CREATE INDEX idx_access_appeals_status ON user_access_appeals (status);
CREATE INDEX idx_access_appeals_created_at ON user_access_appeals (created_at);
