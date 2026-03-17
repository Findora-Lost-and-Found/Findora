const db = require('../config/database');

class Item {
  static async create(itemData) {
    const { user_id, type, category, item_name, description, location, date, time, image_url } = itemData;
    const [result] = await db.execute(
      'INSERT INTO items (user_id, type, category, item_name, description, location, date, time, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [user_id, type, category, item_name, description, location, date, time, image_url]
    );
    return result.insertId;
  }

  static async findById(id) {
    const [rows] = await db.execute(
      `SELECT items.*, users.username, users.full_name, users.email, users.phone 
       FROM items 
       LEFT JOIN users ON items.user_id = users.id 
       WHERE items.id = ?`,
      [id]
    );
    return rows[0];
  }

  static async findAll(filters = {}) {
    let query = `SELECT items.*, users.username, users.full_name 
                 FROM items 
                 LEFT JOIN users ON items.user_id = users.id 
                 WHERE 1=1`;
    const params = [];

    if (filters.type) {
      query += ' AND items.type = ?';
      params.push(filters.type);
    }

    if (filters.category) {
      query += ' AND items.category = ?';
      params.push(filters.category);
    }

    if (filters.status) {
      query += ' AND items.status = ?';
      params.push(filters.status);
    }

    if (filters.user_id) {
      query += ' AND items.user_id = ?';
      params.push(filters.user_id);
    }

    if (filters.search) {
      query += ' AND (items.item_name LIKE ? OR items.description LIKE ? OR items.location LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (filters.date) {
      query += ' AND items.date = ?';
      params.push(filters.date);
    }

    query += ' ORDER BY items.created_at DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(parseInt(filters.limit));
    }

    const [rows] = await db.execute(query, params);
    return rows;
  }

  static async findByType(type, status = 'active') {
    const [rows] = await db.execute(
      `SELECT items.*, users.username, users.full_name 
       FROM items 
       LEFT JOIN users ON items.user_id = users.id 
       WHERE items.type = ? AND items.status = ? 
       ORDER BY items.created_at DESC`,
      [type, status]
    );
    return rows;
  }

  static async updateStatus(id, status) {
    await db.execute('UPDATE items SET status = ?, updated_at = NOW() WHERE id = ?', [status, id]);
  }

  static async delete(id) {
    await db.execute('DELETE FROM items WHERE id = ?', [id]);
  }

  static async getStats() {
    const [lostCount] = await db.execute('SELECT COUNT(*) as count FROM items WHERE type = "lost" AND status = "active"');
    const [foundCount] = await db.execute('SELECT COUNT(*) as count FROM items WHERE type = "found" AND status = "active"');
    const [claimedCount] = await db.execute('SELECT COUNT(*) as count FROM items WHERE status = "claimed"');

    return {
      lost: lostCount[0].count,
      found: foundCount[0].count,
      claimed: claimedCount[0].count
    };
  }
}

module.exports = Item;
