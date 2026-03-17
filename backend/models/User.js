const db = require('../config/database');

class User {
  static async create(userData) {
    const { username, email, password, full_name, role, phone, is_verified = false } = userData;
    const [result] = await db.execute(
      'INSERT INTO users (username, email, password, full_name, role, phone, is_approved, is_verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [username, email, password, full_name, role, phone, role === 'student' || role === 'staff' ? true : false, is_verified]
    );
    return result.insertId;
  }

  static async findByEmail(email) {
    const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0];
  }

  static async findByUsername(username) {
    const [rows] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);
    return rows[0];
  }

  static async findById(id) {
    const [rows] = await db.execute('SELECT * FROM users WHERE id = ?', [id]);
    return rows[0];
  }

  static async findByEmailOrUsername(identifier) {
    const [rows] = await db.execute(
      'SELECT * FROM users WHERE email = ? OR username = ?',
      [identifier, identifier]
    );
    return rows[0];
  }

  static async updateVerificationOTP(userId, otp, expiry) {
    await db.execute(
      'UPDATE users SET verification_otp = ?, otp_expiry = ?, updated_at = NOW() WHERE id = ?',
      [otp, expiry, userId]
    );
  }

  static async updateResetOTP(userId, otp, expiry) {
    await db.execute(
      'UPDATE users SET reset_otp = ?, otp_expiry = ?, updated_at = NOW() WHERE id = ?',
      [otp, expiry, userId]
    );
  }

  static async verifyUser(userId) {
    await db.execute(
      'UPDATE users SET is_verified = TRUE, verification_otp = NULL, otp_expiry = NULL WHERE id = ?',
      [userId]
    );
  }

  static async updatePassword(userId, newPassword) {
    await db.execute(
      'UPDATE users SET password = ?, reset_otp = NULL, otp_expiry = NULL WHERE id = ?',
      [newPassword, userId]
    );
  }

  static async approveUser(userId) {
    await db.execute('UPDATE users SET is_approved = TRUE WHERE id = ?', [userId]);
  }

  static async banUser(userId, banned) {
    await db.execute('UPDATE users SET is_banned = ? WHERE id = ?', [banned, userId]);
  }

  static async suspendUser(userId, suspended) {
    await db.execute('UPDATE users SET is_suspended = ? WHERE id = ?', [suspended, userId]);
  }

  static async getPendingApprovals(role) {
    const [rows] = await db.execute(
      'SELECT id, username, email, full_name, role, phone, created_at FROM users WHERE role = ? AND is_approved = FALSE',
      [role]
    );
    return rows;
  }

  static async getAllUsers(filters = {}) {
    let query = 'SELECT id, username, email, full_name, role, phone, is_verified, is_approved, is_banned, is_suspended, created_at FROM users WHERE 1=1';
    const params = [];

    if (filters.role) {
      query += ' AND role = ?';
      params.push(filters.role);
    }

    if (filters.is_banned !== undefined) {
      query += ' AND is_banned = ?';
      params.push(filters.is_banned);
    }

    query += ' ORDER BY created_at DESC';

    const [rows] = await db.execute(query, params);
    return rows;
  }
}

module.exports = User;
