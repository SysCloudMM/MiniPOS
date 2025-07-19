const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database configuration based on environment
const getDbPath = () => {
  if (process.env.NODE_ENV === 'production') {
    // Production: Use absolute path or environment variable
    return process.env.DATABASE_PATH || '/var/lib/minipos/minipos.db';
  } else {
    // Development: Use relative path in project directory
    return path.join(__dirname, '..', 'minipos.db');
  }
};

const dbPath = getDbPath();
const db = new sqlite3.Database(dbPath);

// Ensure database directory exists in production
const fs = require('fs');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Database initialization
const initialize = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          role TEXT DEFAULT 'cashier' CHECK(role IN ('admin', 'manager', 'cashier')),
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Categories table
      db.run(`
        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Products table
      db.run(`
        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          barcode TEXT UNIQUE,
          price DECIMAL(10,2) NOT NULL,
          cost DECIMAL(10,2) DEFAULT 0,
          stock_quantity INTEGER DEFAULT 0,
          min_stock INTEGER DEFAULT 0,
          category_id INTEGER,
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (category_id) REFERENCES categories(id)
        )
      `);

      // Customers table
      db.run(`
        CREATE TABLE IF NOT EXISTS customers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT UNIQUE,
          phone TEXT,
          address TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Sales table
      db.run(`
        CREATE TABLE IF NOT EXISTS sales (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_id INTEGER,
          user_id INTEGER NOT NULL,
          total_amount DECIMAL(10,2) NOT NULL,
          discount_amount DECIMAL(10,2) DEFAULT 0,
          tax_amount DECIMAL(10,2) DEFAULT 0,
          final_amount DECIMAL(10,2) NOT NULL,
          payment_method TEXT DEFAULT 'cash' CHECK(payment_method IN ('cash', 'card', 'digital')),
          status TEXT DEFAULT 'completed' CHECK(status IN ('pending', 'completed', 'cancelled', 'refunded')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (customer_id) REFERENCES customers(id),
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      // Sale items table
      db.run(`
        CREATE TABLE IF NOT EXISTS sale_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sale_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL,
          quantity INTEGER NOT NULL,
          unit_price DECIMAL(10,2) NOT NULL,
          total_price DECIMAL(10,2) NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
          FOREIGN KEY (product_id) REFERENCES products(id)
        )
      `);

      // Insert default admin user
      db.run(`
        INSERT OR IGNORE INTO users (id, name, username, email, password, role, is_active) 
        VALUES 
          (1, 'Administrator', 'admin', 'admin@minipos.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 1),
          (2, 'Aung Thu Myint', 'aungthumyint', 'aungthumyint@minipos.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'cashier', 1)
      `);

      // Insert default categories
      db.run(`
        INSERT OR IGNORE INTO categories (name, description) 
        VALUES 
          ('General', 'General merchandise'),
          ('Electronics', 'Electronic items'),
          ('Clothing', 'Apparel and clothing'),
          ('Food & Beverages', 'Food and drink items'),
          ('Books & Stationery', 'Books, notebooks, and office supplies'),
          ('Health & Beauty', 'Health and beauty products'),
          ('Home & Garden', 'Home improvement and garden items'),
          ('Sports & Outdoors', 'Sports equipment and outdoor gear')
      `);

      // Insert sample products for testing
      db.run(`
        INSERT OR IGNORE INTO products (name, description, price, cost, stock_quantity, min_stock, category_id, is_active) 
        VALUES 
          ('Sample Product', 'This is a sample product for testing', 1000, 800, 50, 10, 1, 1),
          ('Coffee', 'Premium coffee beans', 2500, 2000, 100, 20, 4, 1),
          ('Notebook', 'A4 spiral notebook', 500, 400, 200, 50, 5, 1),
          ('Smartphone', 'Latest smartphone model', 150000, 120000, 25, 5, 2, 1),
          ('T-Shirt', 'Cotton t-shirt', 3000, 2500, 75, 15, 3, 1)
      `);

      console.log('Database initialized successfully');
      resolve();
    });
  });
};

// Helper function to run queries
const runQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
};

// Helper function to get single row
const getRow = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

// Helper function to get all rows
const getAllRows = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

module.exports = {
  db,
  initialize,
  runQuery,
  getRow,
  getAllRows
};