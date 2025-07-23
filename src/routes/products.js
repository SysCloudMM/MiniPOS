const express = require('express');
const { getDatabase } = require('../config/database');
const { authenticateToken, requireAdminOrManager } = require('../middleware/auth');

const router = express.Router();

// Get all products
router.get('/', authenticateToken, (req, res) => {
  const { category_id, search, active_only = 'true' } = req.query;
  const db = getDatabase();
  
  let query = `
    SELECT p.*, c.name as category_name 
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id
  `;
  
  const conditions = [];
  const params = [];
  
  if (active_only === 'true') {
    conditions.push('p.is_active = 1');
  }
  
  if (category_id) {
    conditions.push('p.category_id = ?');
    params.push(category_id);
  }
  
  if (search) {
    conditions.push('(p.name LIKE ? OR p.description LIKE ? OR p.barcode LIKE ? OR p.sku LIKE ?)');
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }
  
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  
  query += ' ORDER BY p.name';
  
  db.all(query, params, (err, products) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch products' });
    }
    
    res.json({ products });
  });
});

// Get single product
router.get('/:id', authenticateToken, (req, res) => {
  const db = getDatabase();
  
  db.get(
    `SELECT p.*, c.name as category_name 
     FROM products p 
     LEFT JOIN categories c ON p.category_id = c.id 
     WHERE p.id = ?`,
    [req.params.id],
    (err, product) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      
      res.json({ product });
    }
  );
});

// Create product (Admin/Manager only)
router.post('/', authenticateToken, requireAdminOrManager, (req, res) => {
  const {
    name,
    description,
    category_id,
    price,
    cost,
    stock_quantity = 0,
    min_stock_level = 5,
    barcode,
    sku
  } = req.body;
  
  if (!name || !price) {
    return res.status(400).json({ error: 'Name and price are required' });
  }
  
  const db = getDatabase();
  
  db.run(
    `INSERT INTO products 
     (name, description, category_id, price, cost, stock_quantity, min_stock_level, barcode, sku) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, description, category_id, price, cost, stock_quantity, min_stock_level, barcode, sku],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Barcode or SKU already exists' });
        }
        return res.status(500).json({ error: 'Failed to create product' });
      }
      
      res.status(201).json({
        message: 'Product created successfully',
        product: {
          id: this.lastID,
          name,
          description,
          category_id,
          price,
          cost,
          stock_quantity,
          min_stock_level,
          barcode,
          sku
        }
      });
    }
  );
});

// Update product (Admin/Manager only)
router.put('/:id', authenticateToken, requireAdminOrManager, (req, res) => {
  const {
    name,
    description,
    category_id,
    price,
    cost,
    stock_quantity,
    min_stock_level,
    barcode,
    sku,
    is_active
  } = req.body;
  
  const db = getDatabase();
  
  db.run(
    `UPDATE products SET 
     name = ?, description = ?, category_id = ?, price = ?, cost = ?, 
     stock_quantity = ?, min_stock_level = ?, barcode = ?, sku = ?, 
     is_active = ?, updated_at = CURRENT_TIMESTAMP 
     WHERE id = ?`,
    [name, description, category_id, price, cost, stock_quantity, min_stock_level, barcode, sku, is_active, req.params.id],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Barcode or SKU already exists' });
        }
        return res.status(500).json({ error: 'Failed to update product' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }
      
      res.json({ message: 'Product updated successfully' });
    }
  );
});

// Delete product (Admin/Manager only)
router.delete('/:id', authenticateToken, requireAdminOrManager, (req, res) => {
  const db = getDatabase();
  
  // Check if product is used in any sales
  db.get(
    'SELECT COUNT(*) as count FROM sale_items WHERE product_id = ?',
    [req.params.id],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (result.count > 0) {
        // Don't delete, just deactivate
        db.run(
          'UPDATE products SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [req.params.id],
          function(err) {
            if (err) {
              return res.status(500).json({ error: 'Failed to deactivate product' });
            }
            
            if (this.changes === 0) {
              return res.status(404).json({ error: 'Product not found' });
            }
            
            res.json({ message: 'Product deactivated (has sales history)' });
          }
        );
      } else {
        // Safe to delete
        db.run(
          'DELETE FROM products WHERE id = ?',
          [req.params.id],
          function(err) {
            if (err) {
              return res.status(500).json({ error: 'Failed to delete product' });
            }
            
            if (this.changes === 0) {
              return res.status(404).json({ error: 'Product not found' });
            }
            
            res.json({ message: 'Product deleted successfully' });
          }
        );
      }
    }
  );
});

// Get low stock products
router.get('/alerts/low-stock', authenticateToken, (req, res) => {
  const db = getDatabase();
  
  db.all(
    `SELECT p.*, c.name as category_name 
     FROM products p 
     LEFT JOIN categories c ON p.category_id = c.id 
     WHERE p.stock_quantity <= p.min_stock_level AND p.is_active = 1 
     ORDER BY p.stock_quantity ASC`,
    (err, products) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch low stock products' });
      }
      
      res.json({ products });
    }
  );
});

// Update stock quantity
router.patch('/:id/stock', authenticateToken, requireAdminOrManager, (req, res) => {
  const { quantity, operation = 'set' } = req.body;
  
  if (quantity === undefined) {
    return res.status(400).json({ error: 'Quantity is required' });
  }
  
  const db = getDatabase();
  
  let query;
  let params;
  
  if (operation === 'add') {
    query = 'UPDATE products SET stock_quantity = stock_quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    params = [quantity, req.params.id];
  } else if (operation === 'subtract') {
    query = 'UPDATE products SET stock_quantity = MAX(0, stock_quantity - ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    params = [quantity, req.params.id];
  } else {
    query = 'UPDATE products SET stock_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    params = [quantity, req.params.id];
  }
  
  db.run(query, params, function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to update stock' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json({ message: 'Stock updated successfully' });
  });
});

module.exports = router;