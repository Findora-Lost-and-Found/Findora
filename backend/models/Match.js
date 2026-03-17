const db = require('../config/database');

class Match {
  static async create(matchData) {
    const { lost_item_id, found_item_id, match_score, match_type } = matchData;
    
    // Check if match already exists
    const [existing] = await db.execute(
      'SELECT id FROM matches WHERE lost_item_id = ? AND found_item_id = ?',
      [lost_item_id, found_item_id]
    );

    if (existing.length > 0) {
      return existing[0].id;
    }

    const [result] = await db.execute(
      'INSERT INTO matches (lost_item_id, found_item_id, match_score, match_type) VALUES (?, ?, ?, ?)',
      [lost_item_id, found_item_id, match_score, match_type]
    );
    return result.insertId;
  }

  static async findByItemId(itemId) {
    const [rows] = await db.execute(
      `SELECT m.*, 
              li.item_name as lost_item_name, li.category as lost_category, li.location as lost_location, li.date as lost_date,
              fi.item_name as found_item_name, fi.category as found_category, fi.location as found_location, fi.date as found_date,
              fi.user_id as found_user_id, li.user_id as lost_user_id
       FROM matches m
       LEFT JOIN items li ON m.lost_item_id = li.id
       LEFT JOIN items fi ON m.found_item_id = fi.id
       WHERE m.lost_item_id = ? OR m.found_item_id = ?
       ORDER BY m.match_score DESC`,
      [itemId, itemId]
    );
    return rows;
  }

  static async markNotified(matchId) {
    await db.execute('UPDATE matches SET is_notified = TRUE WHERE id = ?', [matchId]);
  }

  static async getUnnotifiedMatches() {
    const [rows] = await db.execute(
      `SELECT m.*, 
              li.item_name as lost_item_name, li.user_id as lost_user_id,
              fi.item_name as found_item_name, fi.user_id as found_user_id
       FROM matches m
       LEFT JOIN items li ON m.lost_item_id = li.id
       LEFT JOIN items fi ON m.found_item_id = fi.id
       WHERE m.is_notified = FALSE`
    );
    return rows;
  }
}

module.exports = Match;
