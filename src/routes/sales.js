const express = require('express');
const { getDatabase } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all sales
router.get('/', authenticateToken, (req, res) => {
  const { 
    start_date, 
    end_date, 
    customer_id, 
    status, 
    payment_method,
    limit = 50, 
    offset = 0 
  } = req.query;
  
  const db = getDatabase();
  
  let query = `
    SELECT s.*, c.name as customer_name, u.username as cashier_name,
           COUNT(si.id) as items_count
    FROM sales s
    LEFT JOIN customers c ON s.customer_id = c.id
    LEFT JOIN users u ON s.user_id = u.id
    LEFT JOIN sale_items si ON s.id = si.sale_id
  `;
  
  const conditions = [];
  const params = [];
  
  if (start_date) {
    conditions.push('DATE(s.created_at) >= ?');
    params.push(start_date);
  }
  
  if (end_date) {
    conditions.push('DATE(s.created_at) <= ?');
    params.push(end_date);
  }
  
  if (customer_id) {
    conditions.push('s.customer_id = ?');
    params.push(customer_id);
  }
  
  if (status) {
    conditions.push('s.status = ?');
    params.push(status);
  }
  
  if (payment_method) {
    conditions.push('s.payment_method = ?');
    params.push(payment_method);
  }
  
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  
  query += ' GROUP BY s.id ORDER BY s.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));
  
  db.all(query, params, (err, sales) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch sales' });
    }
    
    res.json({ sales });
  });
});

// Get single sale with items
router.get('/:id', authenticateToken, (req, res) => {
  const db = getDatabase();
  
  db.get(
    `SELECT s.*, c.name as customer_name, u.username as cashier_name
     FROM sales s
     LEFT JOIN customers c ON s.customer_id = c.id
     LEFT JOIN users u ON s.user_id = u.id
     WHERE s.id = ?`,
    [req.params.id],
    (err, sale) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!sale) {
        return res.status(404).json({ error: 'Sale not found' });
      }
      
      // Get sale items
      db.all(
        `SELECT si.*, p.name as product_name, p.sku
         FROM sale_items si
         JOIN products p ON si.product_id = p.id
         WHERE si.sale_id = ?`,
        [req.params.id],
        (err, items) => {
          if (err) {
            return res.status(500).json({ error: 'Failed to fetch sale items' });
          }
          
          res.json({ 
            sale: {
              ...sale,
              items
            }
          });
        }
      );
    }
  );
});

// Create new sale
router.post('/', authenticateToken, (req, res) => {
  const {
    customer_id,
    items,
    payment_method = 'cash',
    tax_amount = 0,
    discount_amount = 0,
    notes
  } = req.body;
  
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Sale items are required' });
  }
  
  const db = getDatabase();
  
  // Start transaction
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // Calculate total amount
    let total_amount = 0;
    const itemsWithPrices = [];
    let itemsProcessed = 0;
    let hasError = false;
    
    // Validate items and get current prices
    items.forEach((item, index) => {
      if (hasError) return;
      
      db.get(
        'SELECT id, name, price, stock_quantity FROM products WHERE id = ? AND is_active = 1',
        [item.product_id],
        (err, product) => {
          if (hasError) return;
          
          if (err) {
            hasError = true;
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Database error' });
          }
          
          if (!product) {
            hasError = true;
            db.run('ROLLBACK');
            return res.status(400).json({ error: `Product ${item.product_id} not found or inactive` });
          }
          
          if (product.stock_quantity < item.quantity) {
            hasError = true;
            db.run('ROLLBACK');
            return res.status(400).json({ 
              error: `Insufficient stock for ${product.name}. Available: ${product.stock_quantity}, Requested: ${item.quantity}` 
            });
          }
          
          const unit_price = item.unit_price || product.price;
          const total_price = unit_price * item.quantity;
          
          itemsWithPrices[index] = {
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price,
            total_price
          };
          
          total_amount += total_price;
          itemsProcessed++;
          
          // When all items are processed, create the sale
          if (itemsProcessed === items.length && !hasError) {
            createSale();
          }
        }
      );
    });
    
    function createSale() {
      const final_total = total_amount + tax_amount - discount_amount;
      
      db.run(
        `INSERT INTO sales (customer_id, user_id, total_amount, tax_amount, discount_amount, payment_method, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [customer_id, req.user.id, final_total, tax_amount, discount_amount, payment_method, notes],
        function(err) {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Failed to create sale' });
          }
          
          const sale_id = this.lastID;
          let itemsInserted = 0;
          
          // Insert sale items and update stock
          itemsWithPrices.forEach(item => {
            // Insert sale item
            db.run(
              'INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)',
              [sale_id, item.product_id, item.quantity, item.unit_price, item.total_price],
              (err) => {
                if (err) {
                  db.run('ROLLBACK');
                  return res.status(500).json({ error: 'Failed to create sale items' });
                }
                
                // Update product stock
                db.run(
                  'UPDATE products SET stock_quantity = stock_quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                  [item.quantity, item.product_id],
                  (err) => {
                    if (err) {
                      db.run('ROLLBACK');
                      return res.status(500).json({ error: 'Failed to update stock' });
                    }
                    
                    itemsInserted++;
                    
                    // If all items are inserted, commit transaction
                    if (itemsInserted === itemsWithPrices.length) {
                      // Update customer loyalty points (1 point per dollar spent)
                      if (customer_id) {
                        const loyaltyPoints = Math.floor(final_total);
                        db.run(
                          'UPDATE customers SET loyalty_points = loyalty_points + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                          [loyaltyPoints, customer_id],
                          (err) => {
                            // Don't fail the sale if loyalty update fails
                            if (err) {
                              console.error('Failed to update loyalty points:', err);
                            }
                            
                            db.run('COMMIT');
                            res.status(201).json({
                              message: 'Sale created successfully',
                              sale: {
                                id: sale_id,
                                total_amount: final_total,
                                items_count: itemsWithPrices.length
                              }
                            });
                          }
                        );
                      } else {
                        db.run('COMMIT');
                        res.status(201).json({
                          message: 'Sale created successfully',
                          sale: {
                            id: sale_id,
                            total_amount: final_total,
                            items_count: itemsWithPrices.length
                          }
                        });
                      }
                    }
                  }
                );
              }
            );
          });
        }
      );
    }
  });
});

// Update sale status
router.patch('/:id/status', authenticateToken, (req, res) => {
  const { status } = req.body;
  
  const validStatuses = ['pending', 'completed', 'cancelled', 'refunded'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  
  const db = getDatabase();
  
  db.run(
    'UPDATE sales SET status = ? WHERE id = ?',
    [status, req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update sale status' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Sale not found' });
      }
      
      res.json({ message: 'Sale status updated successfully' });
    }
  );
});

// Get sales summary
router.get('/summary/today', authenticateToken, (req, res) => {
  const db = getDatabase();
  
  db.get(
    `SELECT 
       COUNT(*) as total_sales,
       COALESCE(SUM(total_amount), 0) as total_revenue,
       COALESCE(AVG(total_amount), 0) as average_sale
     FROM sales 
     WHERE DATE(created_at) = DATE('now') AND status = 'completed'`,
    (err, summary) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch sales summary' });
      }
      
      res.json({ summary });
    }
  );
});

module.exports = router;