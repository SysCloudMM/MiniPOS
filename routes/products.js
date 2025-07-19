const express = require('express');
const Joi = require('joi');
const database = require('../config/database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Validation schemas
const productSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().allow(''),
  barcode: Joi.string().allow(''),
  price: Joi.number().positive().required(),
  cost: Joi.number().min(0).default(0),
  stock_quantity: Joi.number().integer().min(0).default(0),
  min_stock: Joi.number().integer().min(0).default(0),
  category_id: Joi.number().integer().positive(),
  is_active: Joi.boolean().default(true)
});

// Get all products
router.get('/', async (req, res) => {
  try {
    const { category, search, active } = req.query;
    let sql = `
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (category) {
      sql += ' AND p.category_id = ?';
      params.push(category);
    }

    if (search) {
      sql += ' AND (p.name LIKE ? OR p.barcode LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (active !== undefined) {
      sql += ' AND p.is_active = ?';
      params.push(active === 'true' ? 1 : 0);
    }

    sql += ' ORDER BY p.name';

    const products = await database.getAllRows(sql, params);

    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: error.message
    });
  }
});

// Get low stock products (must be before /:id route)
router.get('/alerts/low-stock', async (req, res) => {
  try {
    const products = await database.getAllRows(
      'SELECT * FROM products WHERE stock_quantity <= min_stock AND is_active = 1'
    );

    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch low stock products',
      error: error.message
    });
  }
});

// Get single product
router.get('/:id', async (req, res) => {
  try {
    const product = await database.getRow(
      `SELECT p.*, c.name as category_name 
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id = ?`,
      [req.params.id]
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product',
      error: error.message
    });
  }
});

// Create product
router.post('/', authorizeRole(['admin', 'manager']), async (req, res) => {
  try {
    const { error } = productSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const {
      name,
      description,
      barcode,
      price,
      cost,
      stock_quantity,
      min_stock,
      category_id,
      is_active
    } = req.body;

    const result = await database.runQuery(
      `INSERT INTO products (name, description, barcode, price, cost, stock_quantity, min_stock, category_id, is_active) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, description, barcode, price, cost, stock_quantity, min_stock, category_id, is_active]
    );

    const product = await database.getRow(
      'SELECT * FROM products WHERE id = ?',
      [result.id]
    );

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create product',
      error: error.message
    });
  }
});

// Update product
router.put('/:id', authorizeRole(['admin', 'manager']), async (req, res) => {
  try {
    const { error } = productSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const {
      name,
      description,
      barcode,
      price,
      cost,
      stock_quantity,
      min_stock,
      category_id,
      is_active
    } = req.body;

    const result = await database.runQuery(
      `UPDATE products 
       SET name = ?, description = ?, barcode = ?, price = ?, cost = ?, 
           stock_quantity = ?, min_stock = ?, category_id = ?, is_active = ?, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [name, description, barcode, price, cost, stock_quantity, min_stock, category_id, is_active, req.params.id]
    );

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const product = await database.getRow(
      'SELECT * FROM products WHERE id = ?',
      [req.params.id]
    );

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update product',
      error: error.message
    });
  }
});

// Delete product
router.delete('/:id', authorizeRole(['admin', 'manager']), async (req, res) => {
  try {
    const result = await database.runQuery(
      'DELETE FROM products WHERE id = ?',
      [req.params.id]
    );

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete product',
      error: error.message
    });
  }
});

module.exports = router;