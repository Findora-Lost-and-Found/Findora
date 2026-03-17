const db = require('../config/database');

class Notification {
  static async create(notificationData) {
    const { user_id, type, title, message, related_id } = notificationData;
    const [result] = await db.execute(
      'INSERT INTO notifications (user_id, type, title, message, related_id) VALUES (?, ?, ?, ?, ?)',
      [user_id, type, title, message, related_id || null]
    );
    return result.insertId;
  }

  static async findByUserId(userId) {
    const [rows] = await db.execute(
      `SELECT n.*, m.found_item_id
       FROM notifications n
       LEFT JOIN matches m ON n.type = 'match' AND n.related_id = m.id
       WHERE n.user_id = ?
       ORDER BY n.created_at DESC`,
      [userId]
    );
    return rows;
  }

  static async existsByUserTypeRelated(userId, type, relatedId) {
    const [rows] = await db.execute(
      'SELECT id FROM notifications WHERE user_id = ? AND type = ? AND related_id = ? LIMIT 1',
      [userId, type, relatedId]
    );
    return rows.length > 0;
  }

  static async markAsRead(notificationId) {
    await db.execute('UPDATE notifications SET is_read = TRUE WHERE id = ?', [notificationId]);
  }

  static async markAllAsRead(userId) {
    await db.execute('UPDATE notifications SET is_read = TRUE WHERE user_id = ?', [userId]);
  }

  static async getUnreadCount(userId) {
    const [rows] = await db.execute(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );
    return rows[0].count;
  }

  static async delete(notificationId) {
    await db.execute('DELETE FROM notifications WHERE id = ?', [notificationId]);
  }
}

module.exports = Notification;
