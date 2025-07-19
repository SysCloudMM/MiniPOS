const express = require('express');
const bcrypt = require('bcryptjs');
const Joi = require('joi');
const database = require('../config/database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Only admin and manager can access user management
router.use(authorizeRole(['admin', 'manager']));

// Validation schemas
const userSchema = Joi.object({
  name: Joi.string().min(1).required(),
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).when('$isUpdate', {
    is: true,
    then: Joi.optional(),
    otherwise: Joi.required()
  }),
  role: Joi.string().valid('admin', 'manager', 'cashier').default('cashier'),
  is_active: Joi.boolean().default(true)
});

const updateUserSchema = Joi.object({
  name: Joi.string().min(1).required(),
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).allow(''),
  role: Joi.string().valid('admin', 'manager', 'cashier').required(),
  is_active: Joi.boolean().required()
});

// Get all users
router.get('/', async (req, res) => {
  try {
    const { search, role, active } = req.query;
    let sql = 'SELECT id, name, username, email, role, is_active, created_at, updated_at FROM users WHERE 1=1';
    const params = [];

    if (search) {
      sql += ' AND (name LIKE ? OR username LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (role) {
      sql += ' AND role = ?';
      params.push(role);
    }

    if (active !== undefined) {
      sql += ' AND is_active = ?';
      params.push(active === 'true' ? 1 : 0);
    }

    sql += ' ORDER BY name';

    const users = await database.getAllRows(sql, params);

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
});

// Get single user
router.get('/:id', async (req, res) => {
  try {
    const user = await database.getRow(
      'SELECT id, name, username, email, role, is_active, created_at, updated_at FROM users WHERE id = ?',
      [req.params.id]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
      error: error.message
    });
  }
});

// Create user
router.post('/', authorizeRole(['admin']), async (req, res) => {
  try {
    const { error } = userSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { name, username, email, password, role, is_active } = req.body;

    // Check if username or email already exists
    const existingUser = await database.getRow(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Username or email already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await database.runQuery(
      'INSERT INTO users (name, username, email, password, role, is_active) VALUES (?, ?, ?, ?, ?, ?)',
      [name, username, email, hashedPassword, role, is_active]
    );

    const user = await database.getRow(
      'SELECT id, name, username, email, role, is_active, created_at, updated_at FROM users WHERE id = ?',
      [result.id]
    );

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create user',
      error: error.message
    });
  }
});

// Update user
router.put('/:id', async (req, res) => {
  try {
    // Only admin can update users, or users can update themselves (limited fields)
    if (req.user.role !== 'admin' && req.user.id !== parseInt(req.params.id)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    const { error } = updateUserSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { name, username, email, password, role, is_active } = req.body;

    // Check if username or email already exists (excluding current user)
    const existingUser = await database.getRow(
      'SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ?',
      [username, email, req.params.id]
    );

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Username or email already exists'
      });
    }

    // Prevent users from changing their own role or status (only admin can do this)
    let updateSql = 'UPDATE users SET name = ?, username = ?, email = ?, updated_at = CURRENT_TIMESTAMP';
    let params = [name, username, email];

    if (req.user.role === 'admin') {
      // Prevent admin from disabling their own account
      if (req.user.id === parseInt(req.params.id) && !is_active) {
        return res.status(400).json({
          success: false,
          message: 'Cannot disable your own account'
        });
      }
      
      updateSql += ', role = ?, is_active = ?';
      params.push(role, is_active);
    }

    // Update password if provided
    if (password && password.trim() !== '') {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateSql += ', password = ?';
      params.push(hashedPassword);
    }

    updateSql += ' WHERE id = ?';
    params.push(req.params.id);

    const result = await database.runQuery(updateSql, params);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = await database.getRow(
      'SELECT id, name, username, email, role, is_active, created_at, updated_at FROM users WHERE id = ?',
      [req.params.id]
    );

    res.json({
      success: true,
      message: 'User updated successfully',
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error.message
    });
  }
});

// Delete user
router.delete('/:id', authorizeRole(['admin']), async (req, res) => {
  try {
    // Prevent deleting self
    if (req.user.id === parseInt(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    const result = await database.runQuery(
      'DELETE FROM users WHERE id = ?',
      [req.params.id]
    );

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message
    });
  }
});

// Toggle user status (enable/disable)
router.patch('/:id/toggle-status', authorizeRole(['admin']), async (req, res) => {
  try {
    // Prevent disabling self
    if (req.user.id === parseInt(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot disable your own account'
      });
    }

    const user = await database.getRow(
      'SELECT is_active FROM users WHERE id = ?',
      [req.params.id]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const newStatus = !user.is_active;

    await database.runQuery(
      'UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newStatus, req.params.id]
    );

    res.json({
      success: true,
      message: `User ${newStatus ? 'enabled' : 'disabled'} successfully`,
      data: { is_active: newStatus }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to toggle user status',
      error: error.message
    });
  }
});

module.exports = router;