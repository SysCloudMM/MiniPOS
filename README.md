# MiniPOS System

A comprehensive Point of Sale (POS) system built with Node.js, Express, and SQLite. This system provides all the essential features needed for retail operations.

## Features

- **User Management**: Authentication and authorization with role-based access control
- **Product Management**: Full CRUD operations for products with inventory tracking
- **Customer Management**: Customer database with purchase history
- **Sales Processing**: Complete sales transaction handling with real-time inventory updates
- **Reporting**: Comprehensive sales and inventory reports
- **Low Stock Alerts**: Automated alerts for products running low on stock

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product (Admin/Manager only)
- `PUT /api/products/:id` - Update product (Admin/Manager only)
- `DELETE /api/products/:id` - Delete product (Admin/Manager only)
- `GET /api/products/alerts/low-stock` - Get low stock products

### Customers
- `GET /api/customers` - Get all customers
- `GET /api/customers/:id` - Get single customer
- `POST /api/customers` - Create customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

### Sales
- `GET /api/sales` - Get all sales
- `GET /api/sales/:id` - Get single sale with items
- `POST /api/sales` - Create new sale
- `PATCH /api/sales/:id/status` - Update sale status

### Reports
- `GET /api/reports/sales-summary` - Sales summary report
- `GET /api/reports/daily-sales` - Daily sales report
- `GET /api/reports/top-products` - Top selling products
- `GET /api/reports/inventory` - Inventory report (Admin/Manager only)
- `GET /api/reports/payment-methods` - Payment methods report

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the server:
   ```bash
   npm start
   ```

3. For development with auto-restart:
   ```bash
   npm run dev
   ```

## Default Credentials

- **Username**: admin
- **Password**: password
- **Role**: admin

## Database Schema

The system uses SQLite with the following main tables:
- `users` - User accounts and authentication
- `categories` - Product categories
- `products` - Product inventory
- `customers` - Customer information
- `sales` - Sales transactions
- `sale_items` - Individual items in each sale

## Environment Variables

Create a `.env` file with the following variables:
- `JWT_SECRET` - Secret key for JWT tokens (required)
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 3000)
- `DATABASE_PATH` - Custom database file path (production only)

## Database Configuration

### Development
The database file `minipos.db` is created in the project root directory.

### Production
For production deployment, you have several options:

1. **Default Production Path**: `/var/lib/minipos/minipos.db`
2. **Custom Path**: Set `DATABASE_PATH` environment variable
3. **Docker Volume**: Mount a persistent volume to `/var/lib/minipos`

### Production Setup Examples

#### Option 1: System Service
```bash
# Create database directory
sudo mkdir -p /var/lib/minipos
sudo chown $USER:$USER /var/lib/minipos

# Set environment variables
export NODE_ENV=production
export DATABASE_PATH=/var/lib/minipos/minipos.db
export JWT_SECRET=your-secure-random-key
export PORT=3000

# Start the application
npm start
```

#### Option 2: Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .

# Create database directory
RUN mkdir -p /var/lib/minipos

# Set production environment
ENV NODE_ENV=production
ENV DATABASE_PATH=/var/lib/minipos/minipos.db

VOLUME ["/var/lib/minipos"]
EXPOSE 3000

CMD ["npm", "start"]
```

#### Option 3: Custom Database Path
```bash
# Use custom path
export DATABASE_PATH=/home/user/data/minipos.db
export NODE_ENV=production
npm start
```

### Database Backup

Since SQLite is a file-based database, backup is simple:

```bash
# Backup database
cp /var/lib/minipos/minipos.db /backup/minipos-$(date +%Y%m%d).db

# Restore database
cp /backup/minipos-20240101.db /var/lib/minipos/minipos.db
```

### Migration to Other Databases

For high-traffic production environments, consider migrating to PostgreSQL or MySQL:

1. Export data from SQLite
2. Update database configuration
3. Install appropriate database driver
4. Modify SQL queries for database-specific syntax

## License

MIT License