const express = require('express');
const Joi = require('joi');
const database = require('../config/database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Validation schema
const categorySchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().allow('')
});

// Get all categories
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let sql = 'SELECT * FROM categories WHERE 1=1';
    const params = [];

    if (search) {
      sql += ' AND (name LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY name';

    const categories = await database.getAllRows(sql, params);

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: error.message
    });
  }
});

// Get single category
router.get('/:id', async (req, res) => {
  try {
    const category = await database.getRow(
      'SELECT * FROM categories WHERE id = ?',
      [req.params.id]
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category',
      error: error.message
    });
  }
});

// Create category
router.post('/', authorizeRole(['admin', 'manager']), async (req, res) => {
  try {
    const { error } = categorySchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { name, description } = req.body;

    // Check if category name already exists
    const existingCategory = await database.getRow(
      'SELECT id FROM categories WHERE name = ?',
      [name]
    );

    if (existingCategory) {
      return res.status(409).json({
        success: false,
        message: 'Category name already exists'
      });
    }

    const result = await database.runQuery(
      'INSERT INTO categories (name, description) VALUES (?, ?)',
      [name, description]
    );

    const category = await database.getRow(
      'SELECT * FROM categories WHERE id = ?',
      [result.id]
    );

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create category',
      error: error.message
    });
  }
});

// Update category
router.put('/:id', authorizeRole(['admin', 'manager']), async (req, res) => {
  try {
    const { error } = categorySchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { name, description } = req.body;

    // Check if category name already exists (excluding current category)
    const existingCategory = await database.getRow(
      'SELECT id FROM categories WHERE name = ? AND id != ?',
      [name, req.params.id]
    );

    if (existingCategory) {
      return res.status(409).json({
        success: false,
        message: 'Category name already exists'
      });
    }

    const result = await database.runQuery(
      'UPDATE categories SET name = ?, description = ? WHERE id = ?',
      [name, description, req.params.id]
    );

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const category = await database.getRow(
      'SELECT * FROM categories WHERE id = ?',
      [req.params.id]
    );

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update category',
      error: error.message
    });
  }
});

// Delete category
router.delete('/:id', authorizeRole(['admin', 'manager']), async (req, res) => {
  try {
    // Check if category is being used by any products
    const productsUsingCategory = await database.getRow(
      'SELECT COUNT(*) as count FROM products WHERE category_id = ?',
      [req.params.id]
    );

    if (productsUsingCategory.count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category that is being used by products'
      });
    }

    const result = await database.runQuery(
      'DELETE FROM categories WHERE id = ?',
      [req.params.id]
    );

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete category',
      error: error.message
    });
  }
});

module.exports = router;