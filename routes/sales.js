const express = require('express');
const Joi = require('joi');
const database = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Validation schemas
const saleItemSchema = Joi.object({
  product_id: Joi.number().integer().positive().required(),
  quantity: Joi.number().integer().positive().required(),
  unit_price: Joi.number().positive().required()
});

const saleSchema = Joi.object({
  customer_id: Joi.number().integer().positive().allow(null),
  items: Joi.array().items(saleItemSchema).min(1).required(),
  discount_amount: Joi.number().min(0).default(0),
  tax_amount: Joi.number().min(0).default(0),
  payment_method: Joi.string().valid('cash', 'card', 'digital').default('cash')
});

// Get all sales
router.get('/', async (req, res) => {
  try {
    const { start_date, end_date, customer_id, user_id } = req.query;
    let sql = `
      SELECT s.*, c.name as customer_name, u.username as cashier_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN users u ON s.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (start_date) {
      sql += ' AND DATE(s.created_at) >= ?';
      params.push(start_date);
    }

    if (end_date) {
      sql += ' AND DATE(s.created_at) <= ?';
      params.push(end_date);
    }

    if (customer_id) {
      sql += ' AND s.customer_id = ?';
      params.push(customer_id);
    }

    if (user_id) {
      sql += ' AND s.user_id = ?';
      params.push(user_id);
    }

    sql += ' ORDER BY s.created_at DESC';

    const sales = await database.getAllRows(sql, params);

    res.json({
      success: true,
      data: sales
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sales',
      error: error.message
    });
  }
});

// Get single sale with items
router.get('/:id', async (req, res) => {
  try {
    const sale = await database.getRow(
      `SELECT s.*, c.name as customer_name, u.username as cashier_name
       FROM sales s
       LEFT JOIN customers c ON s.customer_id = c.id
       LEFT JOIN users u ON s.user_id = u.id
       WHERE s.id = ?`,
      [req.params.id]
    );

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    const items = await database.getAllRows(
      `SELECT si.*, p.name as product_name, p.barcode
       FROM sale_items si
       LEFT JOIN products p ON si.product_id = p.id
       WHERE si.sale_id = ?`,
      [req.params.id]
    );

    sale.items = items;

    res.json({
      success: true,
      data: sale
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sale',
      error: error.message
    });
  }
});

// Create sale
router.post('/', async (req, res) => {
  try {
    const { error } = saleSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const {
      customer_id,
      items,
      discount_amount,
      tax_amount,
      payment_method
    } = req.body;

    // Calculate total amount
    let total_amount = 0;
    for (const item of items) {
      total_amount += item.quantity * item.unit_price;
    }

    const final_amount = total_amount - discount_amount + tax_amount;

    // Start transaction
    await database.runQuery('BEGIN TRANSACTION');

    try {
      // Create sale record
      const saleResult = await database.runQuery(
        `INSERT INTO sales (customer_id, user_id, total_amount, discount_amount, tax_amount, final_amount, payment_method)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [customer_id, req.user.id, total_amount, discount_amount, tax_amount, final_amount, payment_method]
      );

      const saleId = saleResult.id;

      // Create sale items and update stock
      for (const item of items) {
        // Check stock availability
        const product = await database.getRow(
          'SELECT stock_quantity FROM products WHERE id = ?',
          [item.product_id]
        );

        if (!product || product.stock_quantity < item.quantity) {
          throw new Error(`Insufficient stock for product ID ${item.product_id}`);
        }

        // Create sale item
        await database.runQuery(
          'INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)',
          [saleId, item.product_id, item.quantity, item.unit_price, item.quantity * item.unit_price]
        );

        // Update product stock
        await database.runQuery(
          'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?',
          [item.quantity, item.product_id]
        );
      }

      // Commit transaction
      await database.runQuery('COMMIT');

      // Get complete sale data
      const sale = await database.getRow(
        `SELECT s.*, c.name as customer_name, u.username as cashier_name
         FROM sales s
         LEFT JOIN customers c ON s.customer_id = c.id
         LEFT JOIN users u ON s.user_id = u.id
         WHERE s.id = ?`,
        [saleId]
      );

      const saleItems = await database.getAllRows(
        `SELECT si.*, p.name as product_name, p.barcode
         FROM sale_items si
         LEFT JOIN products p ON si.product_id = p.id
         WHERE si.sale_id = ?`,
        [saleId]
      );

      sale.items = saleItems;

      res.status(201).json({
        success: true,
        message: 'Sale created successfully',
        data: sale
      });
    } catch (error) {
      // Rollback transaction on error
      await database.runQuery('ROLLBACK');
      throw error;
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create sale',
      error: error.message
    });
  }
});

// Update sale status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['pending', 'completed', 'cancelled', 'refunded'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const result = await database.runQuery(
      'UPDATE sales SET status = ? WHERE id = ?',
      [status, req.params.id]
    );

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    res.json({
      success: true,
      message: 'Sale status updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update sale status',
      error: error.message
    });
  }
});

// Delete sale
router.delete('/:id', async (req, res) => {
  try {
    // Check if sale exists
    const sale = await database.getRow(
      'SELECT id FROM sales WHERE id = ?',
      [req.params.id]
    );

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    // Start transaction
    await database.runQuery('BEGIN TRANSACTION');

    try {
      // Delete sale items first (due to foreign key constraint)
      await database.runQuery(
        'DELETE FROM sale_items WHERE sale_id = ?',
        [req.params.id]
      );

      // Delete the sale
      await database.runQuery(
        'DELETE FROM sales WHERE id = ?',
        [req.params.id]
      );

      // Commit transaction
      await database.runQuery('COMMIT');

      res.json({
        success: true,
        message: 'Sale deleted successfully'
      });
    } catch (error) {
      // Rollback transaction on error
      await database.runQuery('ROLLBACK');
      throw error;
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete sale',
      error: error.message
    });
  }
});

module.exports = router;