const stringSimilarity = require('string-similarity');

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'to', 'of', 'in', 'on', 'at', 'for', 'with', 'is', 'are', 'was', 'were',
  'item', 'lost', 'found', 'near', 'from'
]);

const tokenizeKeywords = (text = '') => String(text)
  .toLowerCase()
  .replace(/[^a-z0-9\s]/g, ' ')
  .split(/\s+/)
  .filter((token) => token.length > 2 && !STOP_WORDS.has(token));

const keywordOverlapScore = (left = '', right = '') => {
  const leftSet = new Set(tokenizeKeywords(left));
  const rightSet = new Set(tokenizeKeywords(right));
  if (leftSet.size === 0 || rightSet.size === 0) return 0;

  let overlapCount = 0;
  for (const token of leftSet) {
    if (rightSet.has(token)) overlapCount += 1;
  }

  return overlapCount / Math.max(leftSet.size, rightSet.size);
};

/**
 * Find matches between a new item and existing items
 * @param {Object} newItem - The new item (lost or found)
 * @param {Array} existingItems - Array of existing items to match against
 * @returns {Array} Array of match objects
 */
exports.findMatches = async (newItem, existingItems) => {
  const matches = [];

  for (const existingItem of existingItems) {
    // Skip if same category doesn't match
    if (newItem.category !== existingItem.category) {
      continue;
    }

    let totalScore = 0;
    let factors = 0;

    // 1. Item name similarity (40% weight)
    const nameSimilarity = stringSimilarity.compareTwoStrings(
      newItem.item_name.toLowerCase(),
      existingItem.item_name.toLowerCase()
    );
    totalScore += nameSimilarity * 40;
    factors++;

    // 2. Description similarity (20% weight) - if both have descriptions
    if (newItem.description && existingItem.description) {
      const descSimilarity = stringSimilarity.compareTwoStrings(
        newItem.description.toLowerCase(),
        existingItem.description.toLowerCase()
      );
      totalScore += descSimilarity * 20;
      factors++;
    }

    // 3. Keyword overlap in descriptions/titles (10% weight)
    const keywordScore = keywordOverlapScore(
      `${newItem.item_name || ''} ${newItem.description || ''}`,
      `${existingItem.item_name || ''} ${existingItem.description || ''}`
    );
    totalScore += keywordScore * 10;
    factors++;

    // 4. Location similarity (20% weight)
    const locationSimilarity = stringSimilarity.compareTwoStrings(
      newItem.location.toLowerCase(),
      existingItem.location.toLowerCase()
    );
    totalScore += locationSimilarity * 20;
    factors++;

    // 5. Date proximity (10% weight)
    const newDate = new Date(newItem.date);
    const existingDate = new Date(existingItem.date);
    const daysDiff = Math.abs((newDate - existingDate) / (1000 * 60 * 60 * 24));
    
    let dateScore = 10;
    if (daysDiff > 7) {
      dateScore = 0;
    } else if (daysDiff > 3) {
      dateScore = 5;
    }
    totalScore += dateScore;
    factors++;

    // Calculate final score (normalize to 100)
    const matchScore = totalScore;

    // Only include matches above 60%
    if (matchScore >= 60) {
      const matchType = matchScore >= 80 ? 'Item Found' : 'Possible Match';

      matches.push({
        lost_item_id: newItem.type === 'lost' ? newItem.id : existingItem.id,
        found_item_id: newItem.type === 'found' ? newItem.id : existingItem.id,
        match_score: matchScore.toFixed(2),
        match_type: matchType
      });
    }
  }

  // Sort matches by score (highest first)
  matches.sort((a, b) => b.match_score - a.match_score);

  return matches;
};

/**
 * Calculate similarity between two strings
 * @param {string} str1 
 * @param {string} str2 
 * @returns {number} Similarity score (0-1)
 */
exports.calculateSimilarity = (str1, str2) => {
  return stringSimilarity.compareTwoStrings(str1.toLowerCase(), str2.toLowerCase());
};
