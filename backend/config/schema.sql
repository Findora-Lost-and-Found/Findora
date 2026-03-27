-- Findora Database Schema
-- Lost and Found Management System

CREATE DATABASE IF NOT EXISTS findora_db;
USE findora_db;

-- Users Table
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  role ENUM('student', 'staff', 'security', 'admin') NOT NULL,
  phone VARCHAR(20),
  pending_phone VARCHAR(20),
  is_verified BOOLEAN DEFAULT FALSE,
  is_phone_verified BOOLEAN DEFAULT TRUE,
  is_approved BOOLEAN DEFAULT TRUE,
  is_banned BOOLEAN DEFAULT FALSE,
  is_suspended BOOLEAN DEFAULT FALSE,
  verification_otp VARCHAR(6),
  reset_otp VARCHAR(6),
  phone_verification_otp VARCHAR(6),
  otp_expiry DATETIME,
  phone_otp_expiry DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_username (username),
  INDEX idx_role (role),
  UNIQUE INDEX uq_users_phone (phone),
  UNIQUE INDEX uq_users_pending_phone (pending_phone)
);

-- Items Table (Lost and Found)
CREATE TABLE items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  type ENUM('lost', 'found') NOT NULL,
  category ENUM('NIC', 'Student ID', 'Bank Card', 'Wallet', 'Other') NOT NULL,
  item_name VARCHAR(100) NOT NULL,
  description TEXT,
  location VARCHAR(200) NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  image_url VARCHAR(255),
  status ENUM('active', 'handover_requested', 'held_by_security', 'handed_to_security', 'claimed', 'closed') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_type (type),
  INDEX idx_category (category),
  INDEX idx_status (status),
  INDEX idx_date (date),
  INDEX idx_user_id (user_id)
);

-- Matches Table
CREATE TABLE matches (
  id INT PRIMARY KEY AUTO_INCREMENT,
  lost_item_id INT NOT NULL,
  found_item_id INT NOT NULL,
  match_score DECIMAL(5,2) NOT NULL,
  match_type ENUM('Item Found', 'Possible Match') NOT NULL,
  is_notified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lost_item_id) REFERENCES items(id) ON DELETE CASCADE,
  FOREIGN KEY (found_item_id) REFERENCES items(id) ON DELETE CASCADE,
  INDEX idx_lost_item (lost_item_id),
  INDEX idx_found_item (found_item_id),
  INDEX idx_match_score (match_score)
);

-- Claims Table
CREATE TABLE claims (
  id INT PRIMARY KEY AUTO_INCREMENT,
  item_id INT NOT NULL,
  claimer_id INT NOT NULL,
  otp VARCHAR(6) NOT NULL,
  otp_expiry DATETIME NOT NULL,
  status ENUM('pending', 'approved', 'rejected', 'collected') DEFAULT 'pending',
  security_officer_id INT,
  notes TEXT,
  claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  collected_at DATETIME,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
  FOREIGN KEY (claimer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (security_officer_id) REFERENCES users(id),
  INDEX idx_item_id (item_id),
  INDEX idx_claimer_id (claimer_id),
  INDEX idx_status (status)
);

-- Security Transactions Table
CREATE TABLE security_transactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  security_officer_id INT NOT NULL,
  item_id INT NOT NULL,
  claim_id INT,
  transaction_type ENUM('receive', 'release') NOT NULL,
  status ENUM('requested', 'received') NOT NULL,
  received_from VARCHAR(100),
  released_to VARCHAR(100),
  notes TEXT,
  transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (security_officer_id) REFERENCES users(id),
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
  FOREIGN KEY (claim_id) REFERENCES claims(id),
  INDEX idx_officer (security_officer_id),
  INDEX idx_type (transaction_type),
  INDEX idx_date (transaction_date)
);

-- Notifications Table
CREATE TABLE notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  type ENUM('match', 'otp', 'approval', 'report', 'claim', 'system') NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  related_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_is_read (is_read),
  INDEX idx_type (type)
);

-- Reports Table (for reporting posts)
CREATE TABLE post_reports (
  id INT PRIMARY KEY AUTO_INCREMENT,
  reporter_id INT NOT NULL,
  item_id INT NOT NULL,
  reason TEXT NOT NULL,
  status ENUM('pending', 'reviewed', 'resolved') DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME,
  FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
  INDEX idx_status (status),
  INDEX idx_reporter (reporter_id)
);

-- Temporary test admin is seeded by backend/utils/seedTestAdmin.js in non-production environments.
