const bcrypt = require('bcryptjs');
const db = require('../config/database');

const TEST_ADMIN = {
  username: 'admin',
  email: 'admin@test.com',
  password: 'Admin@1234',
  full_name: 'Temporary Admin'
};

async function seedTestAdmin() {
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  try {
    const [existingTestAdmin] = await db.execute(
      'SELECT id FROM users WHERE email = ? OR username = ? LIMIT 1',
      [TEST_ADMIN.email, TEST_ADMIN.username]
    );

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(TEST_ADMIN.password, salt);

    if (existingTestAdmin.length > 0) {
      await db.execute(
        'UPDATE users SET username = ?, email = ?, password = ?, full_name = ?, role = ?, is_verified = ?, is_approved = ? WHERE id = ?',
        [
          TEST_ADMIN.username,
          TEST_ADMIN.email,
          hashedPassword,
          TEST_ADMIN.full_name,
          'admin',
          true,
          true,
          existingTestAdmin[0].id
        ]
      );

      console.log('Temporary test admin account refreshed: admin / admin@test.com');
      return;
    }

    const [anyAdmin] = await db.execute(
      "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
    );

    if (anyAdmin.length > 0) {
      return;
    }

    await db.execute(
      'INSERT INTO users (username, email, password, full_name, role, is_verified, is_approved) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        TEST_ADMIN.username,
        TEST_ADMIN.email,
        hashedPassword,
        TEST_ADMIN.full_name,
        'admin',
        true,
        true
      ]
    );

    console.log('Temporary test admin created: admin / admin@test.com');
  } catch (error) {
    console.error('Failed to seed temporary test admin:', error.message);
  }
}

module.exports = { seedTestAdmin };
