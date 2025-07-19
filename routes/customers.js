const express = require('express');
const Joi = require('joi');
const database = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Validation schema
const customerSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().allow(''),
  phone: Joi.string().pattern(/^(\+\d{1,4})\s*[\d\s\-\(\)]{7,15}$/).allow('').messages({
    'string.pattern.base': 'Phone number must include country code and be in valid format'
  }),
  address: Joi.string().allow('')
});

// Get all customers
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let sql = 'SELECT * FROM customers WHERE 1=1';
    const params = [];

    if (search) {
      sql += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY name';

    const customers = await database.getAllRows(sql, params);

    res.json({
      success: true,
      data: customers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customers',
      error: error.message
    });
  }
});

// Get single customer
router.get('/:id', async (req, res) => {
  try {
    const customer = await database.getRow(
      'SELECT * FROM customers WHERE id = ?',
      [req.params.id]
    );

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.json({
      success: true,
      data: customer
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer',
      error: error.message
    });
  }
});

// Create customer
router.post('/', async (req, res) => {
  try {
    const { error } = customerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { name, email, phone, address } = req.body;

    const result = await database.runQuery(
      'INSERT INTO customers (name, email, phone, address) VALUES (?, ?, ?, ?)',
      [name, email, phone, address]
    );

    const customer = await database.getRow(
      'SELECT * FROM customers WHERE id = ?',
      [result.id]
    );

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: customer
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create customer',
      error: error.message
    });
  }
});

// Update customer
router.put('/:id', async (req, res) => {
  try {
    const { error } = customerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { name, email, phone, address } = req.body;

    const result = await database.runQuery(
      'UPDATE customers SET name = ?, email = ?, phone = ?, address = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name, email, phone, address, req.params.id]
    );

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const customer = await database.getRow(
      'SELECT * FROM customers WHERE id = ?',
      [req.params.id]
    );

    res.json({
      success: true,
      message: 'Customer updated successfully',
      data: customer
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update customer',
      error: error.message
    });
  }
});

// Delete customer
router.delete('/:id', async (req, res) => {
  try {
    const result = await database.runQuery(
      'DELETE FROM customers WHERE id = ?',
      [req.params.id]
    );

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.json({
      success: true,
      message: 'Customer deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete customer',
      error: error.message
    });
  }
});

module.exports = router;