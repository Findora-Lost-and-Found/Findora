const db = require('../config/database');

class Claim {
  static async create(claimData) {
    const { item_id, claimer_id, otp, otp_expiry } = claimData;
    const [result] = await db.execute(
      'INSERT INTO claims (item_id, claimer_id, otp, otp_expiry) VALUES (?, ?, ?, ?)',
      [item_id, claimer_id, otp, otp_expiry]
    );
    return result.insertId;
  }

  static async findById(id) {
    const [rows] = await db.execute(
      `SELECT c.*, 
              i.item_name, i.category, i.location, i.image_url,
              u.username as claimer_username, u.full_name as claimer_name, u.email as claimer_email, u.phone as claimer_phone
       FROM claims c
       LEFT JOIN items i ON c.item_id = i.id
       LEFT JOIN users u ON c.claimer_id = u.id
       WHERE c.id = ?`,
      [id]
    );
    return rows[0];
  }

  static async findByItemId(itemId) {
    const [rows] = await db.execute(
      `SELECT c.*, u.username, u.full_name, u.email, u.phone
       FROM claims c
       LEFT JOIN users u ON c.claimer_id = u.id
       WHERE c.item_id = ?
       ORDER BY c.claimed_at DESC`,
      [itemId]
    );
    return rows;
  }

  static async findByClaimerId(claimerId) {
    const [rows] = await db.execute(
      `SELECT c.*, i.item_name, i.category, i.type, i.image_url
       FROM claims c
       LEFT JOIN items i ON c.item_id = i.id
       WHERE c.claimer_id = ?
       ORDER BY c.claimed_at DESC`,
      [claimerId]
    );
    return rows;
  }

  static async updateStatus(id, status, securityOfficerId = null) {
    if (securityOfficerId) {
      await db.execute(
        'UPDATE claims SET status = ?, security_officer_id = ? WHERE id = ?',
        [status, securityOfficerId, id]
      );
    } else {
      await db.execute('UPDATE claims SET status = ? WHERE id = ?', [status, id]);
    }
  }

  static async markCollected(id, securityOfficerId) {
    await db.execute(
      'UPDATE claims SET status = "collected", security_officer_id = ?, collected_at = NOW() WHERE id = ?',
      [securityOfficerId, id]
    );
  }

  static async addNotes(id, notes) {
    await db.execute('UPDATE claims SET notes = ? WHERE id = ?', [notes, id]);
  }

  static async getPendingClaims() {
    const [rows] = await db.execute(
      `SELECT c.*, 
              i.item_name, i.category, i.location,
              u.username, u.full_name, u.phone
       FROM claims c
       LEFT JOIN items i ON c.item_id = i.id
       LEFT JOIN users u ON c.claimer_id = u.id
       WHERE c.status = "pending"
       ORDER BY c.claimed_at DESC`
    );
    return rows;
  }
}

module.exports = Claim;
