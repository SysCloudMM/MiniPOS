const express = require('express');
const database = require('../config/database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Sales summary report
router.get('/sales-summary', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    let sql = `
      SELECT 
        COUNT(*) as total_sales,
        SUM(final_amount) as total_revenue,
        AVG(final_amount) as average_sale,
        SUM(discount_amount) as total_discounts,
        SUM(tax_amount) as total_taxes
      FROM sales 
      WHERE status = 'completed'
    `;
    const params = [];

    if (start_date) {
      sql += ' AND DATE(created_at) >= ?';
      params.push(start_date);
    }

    if (end_date) {
      sql += ' AND DATE(created_at) <= ?';
      params.push(end_date);
    }

    const summary = await database.getRow(sql, params);

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate sales summary',
      error: error.message
    });
  }
});

// Daily sales report
router.get('/daily-sales', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    let sql = `
      SELECT 
        DATE(created_at) as sale_date,
        COUNT(*) as total_sales,
        SUM(final_amount) as total_revenue,
        AVG(final_amount) as average_sale
      FROM sales 
      WHERE status = 'completed'
    `;
    const params = [];

    if (start_date) {
      sql += ' AND DATE(created_at) >= ?';
      params.push(start_date);
    }

    if (end_date) {
      sql += ' AND DATE(created_at) <= ?';
      params.push(end_date);
    }

    sql += ' GROUP BY DATE(created_at) ORDER BY sale_date DESC';

    const dailySales = await database.getAllRows(sql, params);

    res.json({
      success: true,
      data: dailySales
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate daily sales report',
      error: error.message
    });
  }
});

// Top selling products
router.get('/top-products', async (req, res) => {
  try {
    const { limit = 10, start_date, end_date } = req.query;
    let sql = `
      SELECT 
        p.id,
        p.name,
        p.barcode,
        SUM(si.quantity) as total_quantity,
        SUM(si.total_price) as total_revenue,
        COUNT(DISTINCT si.sale_id) as times_sold
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      JOIN sales s ON si.sale_id = s.id
      WHERE s.status = 'completed'
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

    sql += ' GROUP BY p.id ORDER BY total_quantity DESC LIMIT ?';
    params.push(parseInt(limit));

    const topProducts = await database.getAllRows(sql, params);

    res.json({
      success: true,
      data: topProducts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate top products report',
      error: error.message
    });
  }
});

// Inventory report
router.get('/inventory', authorizeRole(['admin', 'manager']), async (req, res) => {
  try {
    const inventory = await database.getAllRows(`
      SELECT 
        p.*,
        c.name as category_name,
        (p.stock_quantity * p.cost) as stock_value,
        CASE 
          WHEN p.stock_quantity <= p.min_stock THEN 'Low Stock'
          WHEN p.stock_quantity = 0 THEN 'Out of Stock'
          ELSE 'In Stock'
        END as stock_status
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = 1
      ORDER BY p.name
    `);

    const summary = await database.getRow(`
      SELECT 
        COUNT(*) as total_products,
        SUM(stock_quantity * cost) as total_value,
        COUNT(CASE WHEN stock_quantity <= min_stock THEN 1 END) as low_stock_items,
        COUNT(CASE WHEN stock_quantity = 0 THEN 1 END) as out_of_stock_items
      FROM products 
      WHERE is_active = 1
    `);

    res.json({
      success: true,
      data: {
        inventory,
        summary
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate inventory report',
      error: error.message
    });
  }
});

// Payment methods report
router.get('/payment-methods', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    let sql = `
      SELECT 
        payment_method,
        COUNT(*) as transaction_count,
        SUM(final_amount) as total_amount,
        AVG(final_amount) as average_amount
      FROM sales 
      WHERE status = 'completed'
    `;
    const params = [];

    if (start_date) {
      sql += ' AND DATE(created_at) >= ?';
      params.push(start_date);
    }

    if (end_date) {
      sql += ' AND DATE(created_at) <= ?';
      params.push(end_date);
    }

    sql += ' GROUP BY payment_method ORDER BY total_amount DESC';

    const paymentMethods = await database.getAllRows(sql, params);

    res.json({
      success: true,
      data: paymentMethods
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate payment methods report',
      error: error.message
    });
  }
});

module.exports = router;