UPDATE users
SET
  username = 'superadmin',
  email = 'superadmin@findora.com',
  password = '$2a$10$eQ8b86bEXs8DEXX1s/o0f.Tb2c9S0BiY7P6Y4lP6fC8cO5E5ebXQW',
  full_name = 'Super Admin',
  role = 'super_admin',
  is_verified = 1,
  is_approved = 1,
  is_banned = 0,
  is_suspended = 0
WHERE username = 'superadmin' OR email = 'superadmin@findora.com';

INSERT INTO users (username, email, password, full_name, role, is_verified, is_approved, is_banned, is_suspended)
SELECT 'superadmin', 'superadmin@findora.com', '$2a$10$eQ8b86bEXs8DEXX1s/o0f.Tb2c9S0BiY7P6Y4lP6fC8cO5E5ebXQW', 'Super Admin', 'super_admin', 1, 1, 0, 0
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE username = 'superadmin' OR email = 'superadmin@findora.com'
);

SELECT id, username, email, role, is_verified, is_approved, is_banned, is_suspended
FROM users
WHERE username = 'superadmin' OR email = 'superadmin@findora.com';
