-- Seed test users into findora_db
USE findora_db;

-- Insert test student user
INSERT INTO users (username, email, password, full_name, role, is_verified, is_approved, is_phone_verified) 
VALUES 
  ('isaiyalan', 'isaiyalan.24@cse.mrt.ac.lk', '$2a$10$KW/1AYWm4K0rJ3gkC3QNL.1MfDlKlZDGX2r7DEhNQGV3ioOoVm2X.', 'Isaiyalan', 'student', 1, 1, 1)
ON DUPLICATE KEY UPDATE 
  email = VALUES(email),
  password = VALUES(password),
  full_name = VALUES(full_name),
  is_verified = 1,
  is_approved = 1;

-- Insert test admin user
INSERT INTO users (username, email, password, full_name, role, is_verified, is_approved, is_phone_verified)
VALUES 
  ('admin', 'admin@findora.com', '$2a$10$rZ4JqL9WGxYnXH3kqVqVvOQNUZJxKD7GKqFNO3NfGOvHgZ8FfKFVW', 'Admin User', 'admin', 1, 1, 1)
ON DUPLICATE KEY UPDATE 
  email = VALUES(email),
  password = VALUES(password),
  full_name = VALUES(full_name),
  is_verified = 1,
  is_approved = 1;

SELECT 'Test users seeded successfully!' AS status;
SELECT username, email, role FROM users;
