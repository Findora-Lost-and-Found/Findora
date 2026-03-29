/**
 * Initialize Findora database schema and create test users
 * Run this script in MySQL with: mysql -u root -p < init_database.sql
 */

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS findora_db;
USE findora_db;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  role ENUM('student', 'staff', 'security', 'admin', 'super_admin') NOT NULL,
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
  INDEX idx_username (username)
);

-- Insert test users if they don't exist
INSERT IGNORE INTO users (username, email, password, full_name, role, is_verified, is_approved) 
VALUES 
  ('isaiyalan', 'isaiyalan.24@cse.mrt.ac.lk', '$2a$10$KW/1AYWm4K0rJ3gkC3QNL.1MfDlKlZDGX2r7DEhNQGV3ioOoVm2X.', 'Isaiyalan', 'student', 1, 1),
  ('admin', 'admin@findora.com', '$2a$10$rZ4JqL9WGxYnXH3kqVqVvOQNUZJxKD7GKqFNO3NfGOvHgZ8FfKFVW', 'Admin User', 'admin', 1, 1),
  ('superadmin', 'superadmin@findora.com', '$2a$10$eQ8b86bEXs8DEXX1s/o0f.Tb2c9S0BiY7P6Y4lP6fC8cO5E5ebXQW', 'Super Admin', 'super_admin', 1, 1);

SELECT 'Database initialized successfully!' AS message;
SELECT COUNT(*) as total_users FROM users;
