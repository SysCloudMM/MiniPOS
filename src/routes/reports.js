const express = require('express');
const { getDatabase } = require('../config/database');
const { authenticateToken, requireAdminOrManager } = require('../middleware/auth');

const router = express.Router();

// Sales summary report
router.get('/sales-summary', authenticateToken, (req, res) => {
  const { start_date, end_date, period = 'daily' } = req.query;
  const db = getDatabase();
  
  let dateFormat;
  switch (period) {
    case 'monthly':
      dateFormat = '%Y-%m';
      break;
    case 'yearly':
      dateFormat = '%Y';
      break;
    default:
      dateFormat = '%Y-%m-%d';
  }
  
  let query = `
    SELECT 
      strftime('${dateFormat}', created_at) as period,
      COUNT(*) as total_sales,
      SUM(total_amount) as total_revenue,
      AVG(total_amount) as average_sale,
      SUM(tax_amount) as total_tax,
      SUM(discount_amount) as total_discounts
    FROM sales 
    WHERE status = 'completed'
  `;
  
  const params = [];
  
  if (start_date) {
    query += ' AND DATE(created_at) >= ?';
    params.push(start_date);
  }
  
  if (end_date) {
    query += ' AND DATE(created_at) <= ?';
    params.push(end_date);
  }
  
  query += ' GROUP BY strftime(?, created_at) ORDER BY period DESC';
  params.push(dateFormat);
  
  db.all(query, params, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch sales summary' });
    }
    
    res.json({ report: results });
  });
});

// Daily sales report
router.get('/daily-sales', authenticateToken, (req, res) => {
  const { date = new Date().toISOString().split('T')[0] } = req.query;
  const db = getDatabase();
  
  // Get daily summary
  db.get(
    `SELECT 
       COUNT(*) as total_sales,
       SUM(total_amount) as total_revenue,
       AVG(total_amount) as average_sale,
       SUM(tax_amount) as total_tax,
       SUM(discount_amount) as total_discounts
     FROM sales 
     WHERE DATE(created_at) = ? AND status = 'completed'`,
    [date],
    (err, summary) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch daily summary' });
      }
      
      // Get hourly breakdown
      db.all(
        `SELECT 
           strftime('%H', created_at) as hour,
           COUNT(*) as sales_count,
           SUM(total_amount) as revenue
         FROM sales 
         WHERE DATE(created_at) = ? AND status = 'completed'
         GROUP BY strftime('%H', created_at)
         ORDER BY hour`,
        [date],
        (err, hourly) => {
          if (err) {
            return res.status(500).json({ error: 'Failed to fetch hourly breakdown' });
          }
          
          // Get payment method breakdown
          db.all(
            `SELECT 
               payment_method,
               COUNT(*) as count,
               SUM(total_amount) as total
             FROM sales 
             WHERE DATE(created_at) = ? AND status = 'completed'
             GROUP BY payment_method`,
            [date],
            (err, payment_methods) => {
              if (err) {
                return res.status(500).json({ error: 'Failed to fetch payment methods' });
              }
              
              res.json({
                date,
                summary,
                hourly_breakdown: hourly,
                payment_methods
              });
            }
          );
        }
      );
    }
  );
});

// Top selling products
router.get('/top-products', authenticateToken, (req, res) => {
  const { start_date, end_date, limit = 10 } = req.query;
  const db = getDatabase();
  
  let query = `
    SELECT 
      p.id,
      p.name,
      p.sku,
      c.name as category_name,
      SUM(si.quantity) as total_quantity_sold,
      SUM(si.total_price) as total_revenue,
      COUNT(DISTINCT si.sale_id) as times_sold,
      AVG(si.unit_price) as average_price
    FROM sale_items si
    JOIN products p ON si.product_id = p.id
    LEFT JOIN categories c ON p.category_id = c.id
    JOIN sales s ON si.sale_id = s.id
    WHERE s.status = 'completed'
  `;
  
  const params = [];
  
  if (start_date) {
    query += ' AND DATE(s.created_at) >= ?';
    params.push(start_date);
  }
  
  if (end_date) {
    query += ' AND DATE(s.created_at) <= ?';
    params.push(end_date);
  }
  
  query += `
    GROUP BY p.id, p.name, p.sku, c.name
    ORDER BY total_quantity_sold DESC
    LIMIT ?
  `;
  params.push(parseInt(limit));
  
  db.all(query, params, (err, products) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch top products' });
    }
    
    res.json({ products });
  });
});

// Inventory report (Admin/Manager only)
router.get('/inventory', authenticateToken, requireAdminOrManager, (req, res) => {
  const { category_id, low_stock_only = 'false' } = req.query;
  const db = getDatabase();
  
  let query = `
    SELECT 
      p.*,
      c.name as category_name,
      (p.stock_quantity * p.cost) as inventory_value,
      CASE 
        WHEN p.stock_quantity <= p.min_stock_level THEN 'Low Stock'
        WHEN p.stock_quantity = 0 THEN 'Out of Stock'
        ELSE 'In Stock'
      END as stock_status
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.is_active = 1
  `;
  
  const params = [];
  
  if (category_id) {
    query += ' AND p.category_id = ?';
    params.push(category_id);
  }
  
  if (low_stock_only === 'true') {
    query += ' AND p.stock_quantity <= p.min_stock_level';
  }
  
  query += ' ORDER BY p.name';
  
  db.all(query, params, (err, products) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch inventory report' });
    }
    
    // Calculate summary
    const summary = products.reduce((acc, product) => {
      acc.total_products++;
      acc.total_inventory_value += product.inventory_value || 0;
      
      if (product.stock_quantity <= product.min_stock_level) {
        acc.low_stock_products++;
      }
      
      if (product.stock_quantity === 0) {
        acc.out_of_stock_products++;
      }
      
      return acc;
    }, {
      total_products: 0,
      total_inventory_value: 0,
      low_stock_products: 0,
      out_of_stock_products: 0
    });
    
    res.json({
      summary,
      products
    });
  });
});

// Payment methods report
router.get('/payment-methods', authenticateToken, (req, res) => {
  const { start_date, end_date } = req.query;
  const db = getDatabase();
  
  let query = `
    SELECT 
      payment_method,
      COUNT(*) as transaction_count,
      SUM(total_amount) as total_amount,
      AVG(total_amount) as average_amount,
      (COUNT(*) * 100.0 / (SELECT COUNT(*) FROM sales WHERE status = 'completed'
  `;
  
  const params = [];
  
  if (start_date || end_date) {
    const conditions = [];
    if (start_date) {
      conditions.push('DATE(created_at) >= ?');
      params.push(start_date);
    }
    if (end_date) {
      conditions.push('DATE(created_at) <= ?');
      params.push(end_date);
    }
    query += ' AND ' + conditions.join(' AND ');
  }
  
  query += `)) as percentage
    FROM sales 
    WHERE status = 'completed'
  `;
  
  if (start_date) {
    query += ' AND DATE(created_at) >= ?';
    params.push(start_date);
  }
  
  if (end_date) {
    query += ' AND DATE(created_at) <= ?';
    params.push(end_date);
  }
  
  query += ' GROUP BY payment_method ORDER BY total_amount DESC';
  
  db.all(query, params, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch payment methods report' });
    }
    
    res.json({ report: results });
  });
});

// Customer analysis report
router.get('/customers', authenticateToken, (req, res) => {
  const { start_date, end_date, limit = 20 } = req.query;
  const db = getDatabase();
  
  let query = `
    SELECT 
      c.id,
      c.name,
      c.email,
      c.loyalty_points,
      COUNT(s.id) as total_purchases,
      SUM(s.total_amount) as total_spent,
      AVG(s.total_amount) as average_purchase,
      MAX(s.created_at) as last_purchase_date,
      MIN(s.created_at) as first_purchase_date
    FROM customers c
    LEFT JOIN sales s ON c.id = s.customer_id AND s.status = 'completed'
  `;
  
  const params = [];
  
  if (start_date || end_date) {
    const conditions = [];
    if (start_date) {
      conditions.push('DATE(s.created_at) >= ?');
      params.push(start_date);
    }
    if (end_date) {
      conditions.push('DATE(s.created_at) <= ?');
      params.push(end_date);
    }
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
  }
  
  query += `
    GROUP BY c.id, c.name, c.email, c.loyalty_points
    HAVING COUNT(s.id) > 0
    ORDER BY total_spent DESC
    LIMIT ?
  `;
  params.push(parseInt(limit));
  
  db.all(query, params, (err, customers) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch customer analysis' });
    }
    
    res.json({ customers });
  });
});

module.exports = router;