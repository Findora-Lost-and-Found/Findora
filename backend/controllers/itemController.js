const Item = require('../models/Item');
const Match = require('../models/Match');
const Notification = require('../models/Notification');
const { findMatches } = require('../utils/matcher');

// @desc    Create lost/found item
// @route   POST /api/items
// @access  Private
exports.createItem = async (req, res) => {
  try {
    const { type, category, item_name, description, location, date, time } = req.body;
    const user_id = req.user.id;

    let image_url = null;
    if (req.file) {
      image_url = `/uploads/${req.file.filename}`;
    }

    const itemId = await Item.create({
      user_id,
      type,
      category,
      item_name,
      description,
      location,
      date,
      time,
      image_url
    });

    // If creating a lost or found item, check for matches
    if (type === 'lost') {
      const foundItems = await Item.findByType('found', 'active');
      const matches = await findMatches({ id: itemId, type, category, item_name, description, location, date }, foundItems);
      
      for (const match of matches) {
        await Match.create(match);
      }
    } else if (type === 'found') {
      const lostItems = await Item.findByType('lost', 'active');
      const matches = await findMatches({ id: itemId, type, category, item_name, description, location, date }, lostItems);
      
      for (const match of matches) {
        await Match.create(match);
      }

      // Notify only owners of matched lost items; never notify the found-item poster.
      const relatedMatches = await Match.findByItemId(itemId);
      for (const match of relatedMatches) {
        if (match.found_item_id !== itemId) continue;
        if (!match.lost_user_id || match.lost_user_id === user_id) continue;

        const alreadyNotified = await Notification.existsByUserTypeRelated(match.lost_user_id, 'match', match.id);
        if (alreadyNotified) continue;

        await Notification.create({
          user_id: match.lost_user_id,
          type: 'match',
          title: 'Possible match found for your lost item',
          message: `A found item may match your lost item: ${match.lost_item_name}. Check the Found Items page.`,
          related_id: match.id
        });
      }
    }

    res.status(201).json({
      success: true,
      message: `${type === 'lost' ? 'Lost' : 'Found'} item posted successfully`,
      itemId
    });
  } catch (error) {
    console.error('Create item error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get all items with filters
// @route   GET /api/items
// @access  Private
exports.getAllItems = async (req, res) => {
  try {
    const filters = {
      type: req.query.type,
      category: req.query.category,
      status: req.query.status,
      search: req.query.search,
      date: req.query.date,
      limit: req.query.limit
    };

    const items = await Item.findAll(filters);

    res.json({
      success: true,
      count: items.length,
      items
    });
  } catch (error) {
    console.error('Get items error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get single item
// @route   GET /api/items/:id
// @access  Private
exports.getItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    // Get matches for this item
    const matches = await Match.findByItemId(item.id);

    res.json({
      success: true,
      item,
      matches
    });
  } catch (error) {
    console.error('Get item error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get user's items
// @route   GET /api/items/my/items
// @access  Private
exports.getMyItems = async (req, res) => {
  try {
    const items = await Item.findAll({
      user_id: req.user.id,
      type: req.query.type,
      category: req.query.category,
      status: req.query.status,
      search: req.query.search,
      date: req.query.date,
      limit: req.query.limit
    });

    res.json({
      success: true,
      count: items.length,
      items
    });
  } catch (error) {
    console.error('Get my items error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update item status
// @route   PUT /api/items/:id/status
// @access  Private
exports.updateItemStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const itemId = req.params.id;

    const item = await Item.findById(itemId);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    // Check if user owns the item or is admin
    if (item.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this item'
      });
    }

    await Item.updateStatus(itemId, status);

    res.json({
      success: true,
      message: 'Item status updated'
    });
  } catch (error) {
    console.error('Update item status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Delete item
// @route   DELETE /api/items/:id
// @access  Private
exports.deleteItem = async (req, res) => {
  try {
    const itemId = req.params.id;
    const item = await Item.findById(itemId);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    // Check if user owns the item or is admin
    if (item.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this item'
      });
    }

    await Item.delete(itemId);

    res.json({
      success: true,
      message: 'Item deleted successfully'
    });
  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get item statistics
// @route   GET /api/items/stats
// @access  Private (Admin)
exports.getItemStats = async (req, res) => {
  try {
    const stats = await Item.getStats();

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};
