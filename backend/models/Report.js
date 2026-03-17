const db = require('../config/database');

class Report {
  static async create(reportData) {
    const { reporter_id, item_id, reason } = reportData;
    const [result] = await db.execute(
      'INSERT INTO post_reports (reporter_id, item_id, reason) VALUES (?, ?, ?)',
      [reporter_id, item_id, reason]
    );
    return result.insertId;
  }

  static async findAll(status = null) {
    let query = `SELECT pr.*, 
                        i.item_name, i.type as item_type, i.category,
                        u1.username as reporter_username, u1.full_name as reporter_name,
                        u2.username as item_owner_username, u2.full_name as item_owner_name
                 FROM post_reports pr
                 LEFT JOIN items i ON pr.item_id = i.id
                 LEFT JOIN users u1 ON pr.reporter_id = u1.id
                 LEFT JOIN users u2 ON i.user_id = u2.id
                 WHERE 1=1`;
    const params = [];

    if (status) {
      query += ' AND pr.status = ?';
      params.push(status);
    }

    query += ' ORDER BY pr.created_at DESC';

    const [rows] = await db.execute(query, params);
    return rows;
  }

  static async findById(id) {
    const [rows] = await db.execute(
      `SELECT pr.*, 
              i.item_name, i.description, i.type as item_type, i.category, i.image_url,
              u1.username as reporter_username, u1.full_name as reporter_name,
              u2.username as item_owner_username, u2.full_name as item_owner_name, u2.id as item_owner_id
       FROM post_reports pr
       LEFT JOIN items i ON pr.item_id = i.id
       LEFT JOIN users u1 ON pr.reporter_id = u1.id
       LEFT JOIN users u2 ON i.user_id = u2.id
       WHERE pr.id = ?`,
      [id]
    );
    return rows[0];
  }

  static async updateStatus(id, status, adminNotes = null) {
    if (adminNotes) {
      await db.execute(
        'UPDATE post_reports SET status = ?, admin_notes = ?, resolved_at = NOW() WHERE id = ?',
        [status, adminNotes, id]
      );
    } else {
      await db.execute('UPDATE post_reports SET status = ? WHERE id = ?', [status, id]);
    }
  }

  static async getPendingCount() {
    const [rows] = await db.execute(
      'SELECT COUNT(*) as count FROM post_reports WHERE status = "pending"'
    );
    return rows[0].count;
  }
}

module.exports = Report;
