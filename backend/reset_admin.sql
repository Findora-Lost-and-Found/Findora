UPDATE users
SET
  username = 'admin',
  email = 'admin@findora.com',
  password = '$2a$10$rZ4JqL9WGxYnXH3kqVqVvOQNUZJxKD7GKqFNO3NfGOvHgZ8FfKFVW',
  role = 'admin',
  is_verified = 1,
  is_approved = 1,
  is_banned = 0,
  is_suspended = 0
WHERE username = 'admin' OR email = 'admin@findora.com';

SELECT id, username, email, role, is_verified, is_approved, is_banned, is_suspended
FROM users
WHERE username = 'admin' OR email = 'admin@findora.com';
