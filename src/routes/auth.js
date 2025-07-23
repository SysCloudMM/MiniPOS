const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDatabase } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// User registration
router.post('/register', authenticateToken, (req, res) => {
  const { username, password, role = 'cashier', full_name, email } = req.body;
  
  // Only admin can create new users
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only administrators can create new users' });
  }

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const db = getDatabase();
  const hashedPassword = bcrypt.hashSync(password, 10);

  db.run(
    'INSERT INTO users (username, password, role, full_name, email) VALUES (?, ?, ?, ?, ?)',
    [username, hashedPassword, role, full_name, email],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Username already exists' });
        }
        return res.status(500).json({ error: 'Failed to create user' });
      }

      res.status(201).json({
        message: 'User created successfully',
        user: {
          id: this.lastID,
          username,
          role,
          full_name,
          email
        }
      });
    }
  );
});

// User login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const db = getDatabase();
  
  db.get(
    'SELECT * FROM users WHERE username = ?',
    [username],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { 
          id: user.id, 
          username: user.username, 
          role: user.role 
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          full_name: user.full_name,
          email: user.email
        }
      });
    }
  );
});

// Get current user profile
router.get('/profile', authenticateToken, (req, res) => {
  const db = getDatabase();
  
  db.get(
    'SELECT id, username, role, full_name, email, created_at FROM users WHERE id = ?',
    [req.user.id],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ user });
    }
  );
});

// Update user profile
router.put('/profile', authenticateToken, (req, res) => {
  const { full_name, email } = req.body;
  const db = getDatabase();

  db.run(
    'UPDATE users SET full_name = ?, email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [full_name, email, req.user.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update profile' });
      }

      res.json({ message: 'Profile updated successfully' });
    }
  );
});

// Change password
router.put('/change-password', authenticateToken, (req, res) => {
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }

  const db = getDatabase();
  
  db.get(
    'SELECT password FROM users WHERE id = ?',
    [req.user.id],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!user || !bcrypt.compareSync(current_password, user.password)) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      const hashedNewPassword = bcrypt.hashSync(new_password, 10);
      
      db.run(
        'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [hashedNewPassword, req.user.id],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Failed to change password' });
          }

          res.json({ message: 'Password changed successfully' });
        }
      );
    }
  );
});

module.exports = router;