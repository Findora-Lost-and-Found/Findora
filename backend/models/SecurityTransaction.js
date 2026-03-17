const db = require('../config/database');

class SecurityTransaction {
  static async create(transactionData) {
    const { security_officer_id, item_id, claim_id, transaction_type, received_from, released_to, notes } = transactionData;
    const [result] = await db.execute(
      'INSERT INTO security_transactions (security_officer_id, item_id, claim_id, transaction_type, received_from, released_to, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [security_officer_id, item_id, claim_id || null, transaction_type, received_from || null, released_to || null, notes || null]
    );
    return result.insertId;
  }

  static async findAll(filters = {}) {
    let query = `SELECT st.*, 
                        i.item_name, i.category,
                        u.username as officer_name, u.full_name as officer_full_name
                 FROM security_transactions st
                 LEFT JOIN items i ON st.item_id = i.id
                 LEFT JOIN users u ON st.security_officer_id = u.id
                 WHERE 1=1`;
    const params = [];

    if (filters.officer_id) {
      query += ' AND st.security_officer_id = ?';
      params.push(filters.officer_id);
    }

    if (filters.transaction_type) {
      query += ' AND st.transaction_type = ?';
      params.push(filters.transaction_type);
    }

    if (filters.date) {
      query += ' AND DATE(st.transaction_date) = ?';
      params.push(filters.date);
    }

    query += ' ORDER BY st.transaction_date DESC';

    const [rows] = await db.execute(query, params);
    return rows;
  }

  static async getStats(officerId = null) {
    let query = 'SELECT transaction_type, COUNT(*) as count FROM security_transactions';
    const params = [];

    if (officerId) {
      query += ' WHERE security_officer_id = ?';
      params.push(officerId);
    }

    query += ' GROUP BY transaction_type';

    const [rows] = await db.execute(query, params);
    
    const stats = {
      received: 0,
      released: 0
    };

    rows.forEach(row => {
      stats[row.transaction_type] = row.count;
    });

    return stats;
  }
}

module.exports = SecurityTransaction;
