const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

let db;

function getDatabasePath() {
  if (process.env.NODE_ENV === 'production') {
    // Production: Use custom path or default production path
    const customPath = process.env.DATABASE_PATH;
    if (customPath) {
      // Ensure directory exists
      const dir = path.dirname(customPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      return customPath;
    }
    
    // Default production path
    const defaultPath = '/var/lib/minipos';
    if (!fs.existsSync(defaultPath)) {
      fs.mkdirSync(defaultPath, { recursive: true });
    }
    return path.join(defaultPath, 'minipos.db');
  }
  
  // Development: Use project root
  return path.join(__dirname, '../../minipos.db');
}

function getDatabase() {
  if (!db) {
    const dbPath = getDatabasePath();
    console.log(`Database path: ${dbPath}`);
    db = new sqlite3.Database(dbPath);
  }
  return db;
}

function initializeDatabase() {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    
    // Enable foreign keys
    database.run('PRAGMA foreign_keys = ON');
    
    // Create tables
    const createTables = `
      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'cashier',
        full_name TEXT,
        email TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Categories table
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Products table
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        category_id INTEGER,
        price DECIMAL(10,2) NOT NULL,
        cost DECIMAL(10,2),
        stock_quantity INTEGER DEFAULT 0,
        min_stock_level INTEGER DEFAULT 5,
        barcode TEXT UNIQUE,
        sku TEXT UNIQUE,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id)
      );

      -- Customers table
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        address TEXT,
        loyalty_points INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Sales table
      CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER,
        user_id INTEGER NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        tax_amount DECIMAL(10,2) DEFAULT 0,
        discount_amount DECIMAL(10,2) DEFAULT 0,
        payment_method TEXT NOT NULL DEFAULT 'cash',
        status TEXT DEFAULT 'completed',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      -- Sale items table
      CREATE TABLE IF NOT EXISTS sale_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id)
      );

      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
      CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
      CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
      CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
      CREATE INDEX IF NOT EXISTS idx_sales_user ON sales(user_id);
      CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(created_at);
      CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
      CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);
    `;

    database.exec(createTables, (err) => {
      if (err) {
        console.error('Error creating tables:', err);
        reject(err);
        return;
      }
      
      // Insert default data
      insertDefaultData(database)
        .then(() => {
          console.log('Database initialized successfully');
          resolve();
        })
        .catch(reject);
    });
  });
}

function insertDefaultData(database) {
  return new Promise((resolve, reject) => {
    const bcrypt = require('bcryptjs');
    
    // Check if admin user exists
    database.get('SELECT id FROM users WHERE username = ?', ['admin'], (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (!row) {
        // Create default admin user
        const hashedPassword = bcrypt.hashSync('password', 10);
        database.run(
          'INSERT INTO users (username, password, role, full_name, email) VALUES (?, ?, ?, ?, ?)',
          ['admin', hashedPassword, 'admin', 'System Administrator', 'admin@minipos.com'],
          (err) => {
            if (err) {
              reject(err);
              return;
            }
            console.log('Default admin user created (username: admin, password: password)');
            insertDefaultCategories(database, resolve, reject);
          }
        );
      } else {
        insertDefaultCategories(database, resolve, reject);
      }
    });
  });
}

function insertDefaultCategories(database, resolve, reject) {
  const categories = [
    ['Electronics', 'Electronic devices and accessories'],
    ['Clothing', 'Apparel and fashion items'],
    ['Food & Beverages', 'Food items and drinks'],
    ['Books', 'Books and publications'],
    ['Home & Garden', 'Home improvement and garden supplies']
  ];
  
  database.get('SELECT COUNT(*) as count FROM categories', (err, row) => {
    if (err) {
      reject(err);
      return;
    }
    
    if (row.count === 0) {
      const stmt = database.prepare('INSERT INTO categories (name, description) VALUES (?, ?)');
      categories.forEach(category => {
        stmt.run(category);
      });
      stmt.finalize((err) => {
        if (err) {
          reject(err);
          return;
        }
        console.log('Default categories created');
        insertSampleProducts(database, resolve, reject);
      });
    } else {
      insertSampleProducts(database, resolve, reject);
    }
  });
}

function insertSampleProducts(database, resolve, reject) {
  database.get('SELECT COUNT(*) as count FROM products', (err, row) => {
    if (err) {
      reject(err);
      return;
    }
    
    if (row.count === 0) {
      const sampleProducts = [
        ['Wireless Headphones', 'Bluetooth wireless headphones with noise cancellation', 1, 99.99, 45.00, 25, 5, '1234567890123', 'WH-001'],
        ['Cotton T-Shirt', 'Comfortable cotton t-shirt in various colors', 2, 19.99, 8.50, 50, 10, '1234567890124', 'TS-001'],
        ['Coffee Beans', 'Premium arabica coffee beans - 1kg bag', 3, 24.99, 12.00, 30, 5, '1234567890125', 'CB-001'],
        ['Programming Book', 'Learn JavaScript - Complete Guide', 4, 39.99, 20.00, 15, 3, '1234567890126', 'PB-001'],
        ['Garden Hose', '50ft expandable garden hose with spray nozzle', 5, 34.99, 18.00, 12, 2, '1234567890127', 'GH-001']
      ];
      
      const stmt = database.prepare(`
        INSERT INTO products (name, description, category_id, price, cost, stock_quantity, min_stock_level, barcode, sku) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      sampleProducts.forEach(product => {
        stmt.run(product);
      });
      
      stmt.finalize((err) => {
        if (err) {
          reject(err);
          return;
        }
        console.log('Sample products created');
        resolve();
      });
    } else {
      resolve();
    }
  });
}

function closeDatabase() {
  if (db) {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err);
      } else {
        console.log('Database connection closed');
      }
    });
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  closeDatabase();
  process.exit(0);
});

module.exports = {
  getDatabase,
  initializeDatabase,
  closeDatabase
};