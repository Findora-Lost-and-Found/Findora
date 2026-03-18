-- 20260316_add_matches_and_otp.sql
-- Safe migration for automated match engine fields.
-- Notes:
-- 1) Script is idempotent where MySQL supports IF NOT EXISTS.
-- 2) If the `matches` table does not exist, it is created with the new schema.
-- 3) Rollback notes are listed at the end and should be run manually if required.

CREATE TABLE IF NOT EXISTS matches (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    lost_item_id BIGINT NOT NULL,
    found_item_id BIGINT NOT NULL,
    score DOUBLE NOT NULL DEFAULT 0,
    threshold INT NOT NULL DEFAULT 80,
    otp VARCHAR(128) NULL,
    otp_expiry TIMESTAMP NULL,
    otp_attempts INT NOT NULL DEFAULT 0,
    notified_at TIMESTAMP NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_matches_lost_item FOREIGN KEY (lost_item_id) REFERENCES items(id) ON DELETE CASCADE,
    CONSTRAINT fk_matches_found_item FOREIGN KEY (found_item_id) REFERENCES items(id) ON DELETE CASCADE,
    CONSTRAINT uk_matches_lost_found UNIQUE (lost_item_id, found_item_id)
);

ALTER TABLE matches ADD COLUMN IF NOT EXISTS score DOUBLE NOT NULL DEFAULT 0;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS threshold INT NOT NULL DEFAULT 80;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS otp VARCHAR(128) NULL;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS otp_expiry TIMESTAMP NULL;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS otp_attempts INT NOT NULL DEFAULT 0;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS notified_at TIMESTAMP NULL;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'PENDING';
ALTER TABLE matches ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Existing rows are backfilled with defaults when columns are added.

CREATE INDEX IF NOT EXISTS idx_matches_lost_item ON matches (lost_item_id);
CREATE INDEX IF NOT EXISTS idx_matches_found_item ON matches (found_item_id);
CREATE INDEX IF NOT EXISTS idx_matches_score ON matches (score);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches (status);
CREATE INDEX IF NOT EXISTS idx_matches_notified_at ON matches (notified_at);

-- Rollback notes (manual, not auto-run):
-- ALTER TABLE matches DROP COLUMN score, DROP COLUMN threshold, DROP COLUMN otp,
--     DROP COLUMN otp_expiry, DROP COLUMN otp_attempts, DROP COLUMN notified_at, DROP COLUMN status;
-- DROP INDEX idx_matches_status ON matches;
-- DROP INDEX idx_matches_notified_at ON matches;
-- DROP INDEX idx_matches_score ON matches;
