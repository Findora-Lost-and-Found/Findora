ALTER TABLE users
  MODIFY COLUMN role ENUM('student', 'staff', 'security', 'admin', 'super_admin') NOT NULL;
