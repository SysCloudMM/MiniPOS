const express = require('express');
const { getDatabase } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all customers
router.get('/', authenticateToken, (req, res) => {
  const { search, limit = 50, offset = 0 } = req.query;
  const db = getDatabase();
  
  let query = 'SELECT * FROM customers';
  const params = [];
  
  if (search) {
    query += ' WHERE name LIKE ? OR email LIKE ? OR phone LIKE ?';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }
  
  query += ' ORDER BY name LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));
  
  db.all(query, params, (err, customers) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch customers' });
    }
    
    res.json({ customers });
  });
});

// Get single customer
router.get('/:id', authenticateToken, (req, res) => {
  const db = getDatabase();
  
  db.get(
    'SELECT * FROM customers WHERE id = ?',
    [req.params.id],
    (err, customer) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      
      // Get customer's purchase history
      db.all(
        `SELECT s.*, COUNT(si.id) as items_count 
         FROM sales s 
         LEFT JOIN sale_items si ON s.id = si.sale_id 
         WHERE s.customer_id = ? 
         GROUP BY s.id 
         ORDER BY s.created_at DESC 
         LIMIT 10`,
        [req.params.id],
        (err, purchases) => {
          if (err) {
            return res.status(500).json({ error: 'Failed to fetch purchase history' });
          }
          
          res.json({ 
            customer,
            recent_purchases: purchases
          });
        }
      );
    }
  );
});

// Create customer
router.post('/', authenticateToken, (req, res) => {
  const { name, email, phone, address } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Customer name is required' });
  }
  
  const db = getDatabase();
  
  db.run(
    'INSERT INTO customers (name, email, phone, address) VALUES (?, ?, ?, ?)',
    [name, email, phone, address],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create customer' });
      }
      
      res.status(201).json({
        message: 'Customer created successfully',
        customer: {
          id: this.lastID,
          name,
          email,
          phone,
          address,
          loyalty_points: 0
        }
      });
    }
  );
});

// Update customer
router.put('/:id', authenticateToken, (req, res) => {
  const { name, email, phone, address } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Customer name is required' });
  }
  
  const db = getDatabase();
  
  db.run(
    'UPDATE customers SET name = ?, email = ?, phone = ?, address = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [name, email, phone, address, req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update customer' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      
      res.json({ message: 'Customer updated successfully' });
    }
  );
});

// Delete customer
router.delete('/:id', authenticateToken, (req, res) => {
  const db = getDatabase();
  
  // Check if customer has any sales
  db.get(
    'SELECT COUNT(*) as count FROM sales WHERE customer_id = ?',
    [req.params.id],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (result.count > 0) {
        return res.status(400).json({ 
          error: 'Cannot delete customer with sales history. Consider archiving instead.' 
        });
      }
      
      db.run(
        'DELETE FROM customers WHERE id = ?',
        [req.params.id],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Failed to delete customer' });
          }
          
          if (this.changes === 0) {
            return res.status(404).json({ error: 'Customer not found' });
          }
          
          res.json({ message: 'Customer deleted successfully' });
        }
      );
    }
  );
});

// Update loyalty points
router.patch('/:id/loyalty', authenticateToken, (req, res) => {
  const { points, operation = 'set' } = req.body;
  
  if (points === undefined) {
    return res.status(400).json({ error: 'Points value is required' });
  }
  
  const db = getDatabase();
  
  let query;
  let params;
  
  if (operation === 'add') {
    query = 'UPDATE customers SET loyalty_points = loyalty_points + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    params = [points, req.params.id];
  } else if (operation === 'subtract') {
    query = 'UPDATE customers SET loyalty_points = MAX(0, loyalty_points - ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    params = [points, req.params.id];
  } else {
    query = 'UPDATE customers SET loyalty_points = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    params = [points, req.params.id];
  }
  
  db.run(query, params, function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to update loyalty points' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.json({ message: 'Loyalty points updated successfully' });
  });
});

module.exports = router;