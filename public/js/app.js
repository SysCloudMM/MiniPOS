class MiniPOS {
    constructor() {
        this.token = localStorage.getItem('minipos_token');
        this.user = JSON.parse(localStorage.getItem('minipos_user') || '{}');
        this.currentSection = 'dashboard';
        this.init();
    }

    init() {
        this.setupEventListeners();
        if (this.token) {
            this.showMainApp();
            this.loadSection('dashboard');
        } else {
            this.showLogin();
        }
    }

    setupEventListeners() {
        // Login form
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });

        // Logout button
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.logout();
        });

        // Sidebar navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = e.currentTarget.dataset.section;
                this.loadSection(section);
            });
        });

        // Sidebar toggle
        document.getElementById('sidebarToggle').addEventListener('click', () => {
            this.toggleSidebar();
        });
    }

    async login() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            this.showLoading(true);
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.token = data.token;
                this.user = data.user;
                localStorage.setItem('minipos_token', this.token);
                localStorage.setItem('minipos_user', JSON.stringify(this.user));
                this.showMainApp();
                this.loadSection('dashboard');
            } else {
                this.showError(data.error || 'Login failed');
            }
        } catch (error) {
            this.showError('Network error. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    logout() {
        this.token = null;
        this.user = {};
        localStorage.removeItem('minipos_token');
        localStorage.removeItem('minipos_user');
        this.showLogin();
    }

    showLogin() {
        document.getElementById('loginModal').classList.remove('hidden');
        document.getElementById('mainApp').classList.add('hidden');
        document.getElementById('loginError').classList.add('hidden');
    }

    showMainApp() {
        document.getElementById('loginModal').classList.add('hidden');
        document.getElementById('mainApp').classList.remove('hidden');
        document.getElementById('userInfo').textContent = `Welcome, ${this.user.full_name || this.user.username} (${this.user.role})`;
    }

    showError(message) {
        const errorDiv = document.getElementById('loginError');
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
    }

    showLoading(show) {
        const spinner = document.getElementById('loadingSpinner');
        if (show) {
            spinner.classList.remove('hidden');
        } else {
            spinner.classList.add('hidden');
        }
    }

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.toggle('-translate-x-full');
    }

    async loadSection(section) {
        this.currentSection = section;
        
        // Update active nav item
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('bg-blue-50', 'text-blue-600');
            if (item.dataset.section === section) {
                item.classList.add('bg-blue-50', 'text-blue-600');
            }
        });

        const content = document.getElementById('content');
        
        try {
            this.showLoading(true);
            
            switch (section) {
                case 'dashboard':
                    content.innerHTML = await this.getDashboardHTML();
                    await this.loadDashboardData();
                    break;
                case 'pos':
                    content.innerHTML = await this.getPOSHTML();
                    await this.loadPOSData();
                    break;
                case 'products':
                    content.innerHTML = await this.getProductsHTML();
                    await this.loadProductsData();
                    break;
                case 'customers':
                    content.innerHTML = await this.getCustomersHTML();
                    await this.loadCustomersData();
                    break;
                case 'sales':
                    content.innerHTML = await this.getSalesHTML();
                    await this.loadSalesData();
                    break;
                case 'reports':
                    content.innerHTML = await this.getReportsHTML();
                    await this.loadReportsData();
                    break;
            }
        } catch (error) {
            content.innerHTML = `<div class="text-red-600">Error loading section: ${error.message}</div>`;
        } finally {
            this.showLoading(false);
        }
    }

    async apiCall(endpoint, options = {}) {
        const response = await fetch(endpoint, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`,
                ...options.headers
            }
        });

        if (response.status === 401) {
            this.logout();
            throw new Error('Session expired');
        }

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'API call failed');
        }

        return data;
    }

    // Dashboard Section
    async getDashboardHTML() {
        return `
            <div class="mb-6">
                <h2 class="text-3xl font-bold text-gray-800 mb-2">Dashboard</h2>
                <p class="text-gray-600">Overview of your store performance</p>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div class="bg-white rounded-lg shadow-md p-6 card-hover">
                    <div class="flex items-center">
                        <div class="p-3 rounded-full bg-blue-100 text-blue-600">
                            <i class="fas fa-dollar-sign text-xl"></i>
                        </div>
                        <div class="ml-4">
                            <p class="text-sm font-medium text-gray-600">Today's Sales</p>
                            <p id="todayRevenue" class="text-2xl font-bold text-gray-900">$0.00</p>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white rounded-lg shadow-md p-6 card-hover">
                    <div class="flex items-center">
                        <div class="p-3 rounded-full bg-green-100 text-green-600">
                            <i class="fas fa-shopping-cart text-xl"></i>
                        </div>
                        <div class="ml-4">
                            <p class="text-sm font-medium text-gray-600">Transactions</p>
                            <p id="todayTransactions" class="text-2xl font-bold text-gray-900">0</p>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white rounded-lg shadow-md p-6 card-hover">
                    <div class="flex items-center">
                        <div class="p-3 rounded-full bg-yellow-100 text-yellow-600">
                            <i class="fas fa-exclamation-triangle text-xl"></i>
                        </div>
                        <div class="ml-4">
                            <p class="text-sm font-medium text-gray-600">Low Stock Items</p>
                            <p id="lowStockCount" class="text-2xl font-bold text-gray-900">0</p>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white rounded-lg shadow-md p-6 card-hover">
                    <div class="flex items-center">
                        <div class="p-3 rounded-full bg-purple-100 text-purple-600">
                            <i class="fas fa-box text-xl"></i>
                        </div>
                        <div class="ml-4">
                            <p class="text-sm font-medium text-gray-600">Total Products</p>
                            <p id="totalProducts" class="text-2xl font-bold text-gray-900">0</p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div class="bg-white rounded-lg shadow-md p-6">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4">Recent Sales</h3>
                    <div id="recentSales" class="space-y-3">
                        <!-- Recent sales will be loaded here -->
                    </div>
                </div>
                
                <div class="bg-white rounded-lg shadow-md p-6">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4">Low Stock Alerts</h3>
                    <div id="lowStockAlerts" class="space-y-3">
                        <!-- Low stock alerts will be loaded here -->
                    </div>
                </div>
            </div>
        `;
    }

    async loadDashboardData() {
        try {
            // Load today's summary
            const summary = await this.apiCall('/api/sales/summary/today');
            document.getElementById('todayRevenue').textContent = `$${summary.summary.total_revenue.toFixed(2)}`;
            document.getElementById('todayTransactions').textContent = summary.summary.total_sales;

            // Load low stock products
            const lowStock = await this.apiCall('/api/products/alerts/low-stock');
            document.getElementById('lowStockCount').textContent = lowStock.products.length;

            // Load total products
            const products = await this.apiCall('/api/products');
            document.getElementById('totalProducts').textContent = products.products.length;

            // Load recent sales
            const sales = await this.apiCall('/api/sales?limit=5');
            const recentSalesHTML = sales.sales.map(sale => `
                <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                        <p class="font-medium">#${sale.id} - ${sale.customer_name || 'Walk-in'}</p>
                        <p class="text-sm text-gray-600">${new Date(sale.created_at).toLocaleString()}</p>
                    </div>
                    <span class="font-bold text-green-600">$${sale.total_amount.toFixed(2)}</span>
                </div>
            `).join('');
            document.getElementById('recentSales').innerHTML = recentSalesHTML || '<p class="text-gray-500">No recent sales</p>';

            // Load low stock alerts
            const lowStockHTML = lowStock.products.slice(0, 5).map(product => `
                <div class="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                    <div>
                        <p class="font-medium">${product.name}</p>
                        <p class="text-sm text-gray-600">SKU: ${product.sku || 'N/A'}</p>
                    </div>
                    <span class="font-bold text-red-600">${product.stock_quantity} left</span>
                </div>
            `).join('');
            document.getElementById('lowStockAlerts').innerHTML = lowStockHTML || '<p class="text-gray-500">No low stock alerts</p>';

        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }

    // POS Section
    async getPOSHTML() {
        return `
            <div class="mb-6">
                <h2 class="text-3xl font-bold text-gray-800 mb-2">Point of Sale</h2>
                <p class="text-gray-600">Process customer transactions</p>
            </div>
            
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Product Search & Selection -->
                <div class="lg:col-span-2">
                    <div class="bg-white rounded-lg shadow-md p-6 mb-6">
                        <div class="flex gap-4 mb-4">
                            <input type="text" id="productSearch" placeholder="Search products by name, SKU, or barcode..." 
                                   class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <button id="scanBarcode" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                                <i class="fas fa-barcode mr-2"></i>Scan
                            </button>
                        </div>
                        <div id="productGrid" class="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                            <!-- Products will be loaded here -->
                        </div>
                    </div>
                </div>
                
                <!-- Cart & Checkout -->
                <div class="bg-white rounded-lg shadow-md p-6">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4">Current Sale</h3>
                    
                    <!-- Customer Selection -->
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Customer</label>
                        <select id="customerSelect" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">Walk-in Customer</option>
                        </select>
                    </div>
                    
                    <!-- Cart Items -->
                    <div id="cartItems" class="mb-4 max-h-64 overflow-y-auto">
                        <p class="text-gray-500 text-center py-8">Cart is empty</p>
                    </div>
                    
                    <!-- Totals -->
                    <div class="border-t pt-4 mb-4">
                        <div class="flex justify-between mb-2">
                            <span>Subtotal:</span>
                            <span id="subtotal">$0.00</span>
                        </div>
                        <div class="flex justify-between mb-2">
                            <span>Tax:</span>
                            <span id="tax">$0.00</span>
                        </div>
                        <div class="flex justify-between font-bold text-lg">
                            <span>Total:</span>
                            <span id="total">$0.00</span>
                        </div>
                    </div>
                    
                    <!-- Payment Method -->
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                        <select id="paymentMethod" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="cash">Cash</option>
                            <option value="card">Card</option>
                            <option value="digital">Digital Payment</option>
                        </select>
                    </div>
                    
                    <!-- Action Buttons -->
                    <div class="space-y-2">
                        <button id="processPayment" class="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 font-semibold disabled:bg-gray-400" disabled>
                            <i class="fas fa-credit-card mr-2"></i>Process Payment
                        </button>
                        <button id="clearCart" class="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700">
                            <i class="fas fa-trash mr-2"></i>Clear Cart
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    async loadPOSData() {
        this.cart = [];
        this.taxRate = 0.08; // 8% tax rate
        
        // Load products
        await this.loadPOSProducts();
        
        // Load customers
        await this.loadPOSCustomers();
        
        // Setup event listeners
        this.setupPOSEventListeners();
    }

    async loadPOSProducts(search = '') {
        try {
            const products = await this.apiCall(`/api/products?search=${search}&active_only=true`);
            const productGrid = document.getElementById('productGrid');
            
            productGrid.innerHTML = products.products.map(product => `
                <div class="product-card border border-gray-200 rounded-lg p-4 hover:shadow-md cursor-pointer transition duration-200" 
                     data-product='${JSON.stringify(product)}'>
                    <h4 class="font-medium text-gray-800 mb-1">${product.name}</h4>
                    <p class="text-sm text-gray-600 mb-2">$${product.price.toFixed(2)}</p>
                    <p class="text-xs text-gray-500">Stock: ${product.stock_quantity}</p>
                </div>
            `).join('');
            
            // Add click listeners to product cards
            document.querySelectorAll('.product-card').forEach(card => {
                card.addEventListener('click', () => {
                    const product = JSON.parse(card.dataset.product);
                    this.addToCart(product);
                });
            });
            
        } catch (error) {
            console.error('Error loading products:', error);
        }
    }

    async loadPOSCustomers() {
        try {
            const customers = await this.apiCall('/api/customers');
            const customerSelect = document.getElementById('customerSelect');
            
            customerSelect.innerHTML = '<option value="">Walk-in Customer</option>' +
                customers.customers.map(customer => 
                    `<option value="${customer.id}">${customer.name}</option>`
                ).join('');
                
        } catch (error) {
            console.error('Error loading customers:', error);
        }
    }

    setupPOSEventListeners() {
        // Product search
        document.getElementById('productSearch').addEventListener('input', (e) => {
            this.loadPOSProducts(e.target.value);
        });
        
        // Process payment
        document.getElementById('processPayment').addEventListener('click', () => {
            this.processPayment();
        });
        
        // Clear cart
        document.getElementById('clearCart').addEventListener('click', () => {
            this.clearCart();
        });
    }

    addToCart(product) {
        if (product.stock_quantity <= 0) {
            alert('Product is out of stock');
            return;
        }
        
        const existingItem = this.cart.find(item => item.product_id === product.id);
        
        if (existingItem) {
            if (existingItem.quantity < product.stock_quantity) {
                existingItem.quantity++;
            } else {
                alert('Not enough stock available');
                return;
            }
        } else {
            this.cart.push({
                product_id: product.id,
                name: product.name,
                price: product.price,
                quantity: 1,
                stock_quantity: product.stock_quantity
            });
        }
        
        this.updateCartDisplay();
    }

    removeFromCart(productId) {
        this.cart = this.cart.filter(item => item.product_id !== productId);
        this.updateCartDisplay();
    }

    updateCartQuantity(productId, quantity) {
        const item = this.cart.find(item => item.product_id === productId);
        if (item) {
            if (quantity <= 0) {
                this.removeFromCart(productId);
            } else if (quantity <= item.stock_quantity) {
                item.quantity = quantity;
                this.updateCartDisplay();
            } else {
                alert('Not enough stock available');
            }
        }
    }

    updateCartDisplay() {
        const cartItems = document.getElementById('cartItems');
        
        if (this.cart.length === 0) {
            cartItems.innerHTML = '<p class="text-gray-500 text-center py-8">Cart is empty</p>';
            document.getElementById('processPayment').disabled = true;
        } else {
            cartItems.innerHTML = this.cart.map(item => `
                <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-2">
                    <div class="flex-1">
                        <p class="font-medium">${item.name}</p>
                        <p class="text-sm text-gray-600">$${item.price.toFixed(2)} each</p>
                    </div>
                    <div class="flex items-center space-x-2">
                        <button onclick="app.updateCartQuantity(${item.product_id}, ${item.quantity - 1})" 
                                class="w-6 h-6 bg-gray-200 rounded text-sm hover:bg-gray-300">-</button>
                        <span class="w-8 text-center">${item.quantity}</span>
                        <button onclick="app.updateCartQuantity(${item.product_id}, ${item.quantity + 1})" 
                                class="w-6 h-6 bg-gray-200 rounded text-sm hover:bg-gray-300">+</button>
                        <button onclick="app.removeFromCart(${item.product_id})" 
                                class="w-6 h-6 bg-red-200 text-red-600 rounded text-sm hover:bg-red-300">×</button>
                    </div>
                </div>
            `).join('');
            document.getElementById('processPayment').disabled = false;
        }
        
        // Update totals
        const subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const tax = subtotal * this.taxRate;
        const total = subtotal + tax;
        
        document.getElementById('subtotal').textContent = `$${subtotal.toFixed(2)}`;
        document.getElementById('tax').textContent = `$${tax.toFixed(2)}`;
        document.getElementById('total').textContent = `$${total.toFixed(2)}`;
    }

    async processPayment() {
        if (this.cart.length === 0) return;
        
        const customerId = document.getElementById('customerSelect').value || null;
        const paymentMethod = document.getElementById('paymentMethod').value;
        const subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const taxAmount = subtotal * this.taxRate;
        
        const saleData = {
            customer_id: customerId,
            items: this.cart.map(item => ({
                product_id: item.product_id,
                quantity: item.quantity,
                unit_price: item.price
            })),
            payment_method: paymentMethod,
            tax_amount: taxAmount,
            discount_amount: 0
        };
        
        try {
            this.showLoading(true);
            const result = await this.apiCall('/api/sales', {
                method: 'POST',
                body: JSON.stringify(saleData)
            });
            
            alert(`Sale completed successfully! Sale ID: ${result.sale.id}`);
            this.clearCart();
            
        } catch (error) {
            alert(`Error processing payment: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }

    clearCart() {
        this.cart = [];
        this.updateCartDisplay();
    }

    // Products Section
    async getProductsHTML() {
        return `
            <div class="mb-6">
                <div class="flex justify-between items-center">
                    <div>
                        <h2 class="text-3xl font-bold text-gray-800 mb-2">Products</h2>
                        <p class="text-gray-600">Manage your inventory</p>
                    </div>
                    ${this.user.role !== 'cashier' ? `
                        <button id="addProductBtn" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                            <i class="fas fa-plus mr-2"></i>Add Product
                        </button>
                    ` : ''}
                </div>
            </div>
            
            <div class="bg-white rounded-lg shadow-md p-6">
                <div class="flex gap-4 mb-6">
                    <input type="text" id="productSearchInput" placeholder="Search products..." 
                           class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <select id="categoryFilter" class="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">All Categories</option>
                    </select>
                </div>
                
                <div class="overflow-x-auto">
                    <table class="min-w-full table-auto">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                ${this.user.role !== 'cashier' ? '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>' : ''}
                            </tr>
                        </thead>
                        <tbody id="productsTableBody" class="bg-white divide-y divide-gray-200">
                            <!-- Products will be loaded here -->
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    async loadProductsData() {
        try {
            const products = await this.apiCall('/api/products');
            const tbody = document.getElementById('productsTableBody');
            
            tbody.innerHTML = products.products.map(product => `
                <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div>
                            <div class="text-sm font-medium text-gray-900">${product.name}</div>
                            <div class="text-sm text-gray-500">SKU: ${product.sku || 'N/A'}</div>
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${product.category_name || 'Uncategorized'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">$${product.price.toFixed(2)}</td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="text-sm ${product.stock_quantity <= product.min_stock_level ? 'text-red-600 font-semibold' : 'text-gray-900'}">
                            ${product.stock_quantity}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${product.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                            ${product.is_active ? 'Active' : 'Inactive'}
                        </span>
                    </td>
                    ${this.user.role !== 'cashier' ? `
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button onclick="app.editProduct(${product.id})" class="text-blue-600 hover:text-blue-900 mr-3">Edit</button>
                            <button onclick="app.deleteProduct(${product.id})" class="text-red-600 hover:text-red-900">Delete</button>
                        </td>
                    ` : ''}
                </tr>
            `).join('');
            
        } catch (error) {
            console.error('Error loading products:', error);
        }
    }

    // Customers Section
    async getCustomersHTML() {
        return `
            <div class="mb-6">
                <div class="flex justify-between items-center">
                    <div>
                        <h2 class="text-3xl font-bold text-gray-800 mb-2">Customers</h2>
                        <p class="text-gray-600">Manage customer information</p>
                    </div>
                    <button id="addCustomerBtn" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                        <i class="fas fa-plus mr-2"></i>Add Customer
                    </button>
                </div>
            </div>
            
            <div class="bg-white rounded-lg shadow-md p-6">
                <div class="mb-6">
                    <input type="text" id="customerSearchInput" placeholder="Search customers..." 
                           class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
                
                <div class="overflow-x-auto">
                    <table class="min-w-full table-auto">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loyalty Points</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="customersTableBody" class="bg-white divide-y divide-gray-200">
                            <!-- Customers will be loaded here -->
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    async loadCustomersData() {
        try {
            const customers = await this.apiCall('/api/customers');
            const tbody = document.getElementById('customersTableBody');
            
            tbody.innerHTML = customers.customers.map(customer => `
                <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm font-medium text-gray-900">${customer.name}</div>
                        <div class="text-sm text-gray-500">ID: ${customer.id}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-900">${customer.email || 'N/A'}</div>
                        <div class="text-sm text-gray-500">${customer.phone || 'N/A'}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${customer.loyalty_points}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button onclick="app.viewCustomer(${customer.id})" class="text-blue-600 hover:text-blue-900 mr-3">View</button>
                        <button onclick="app.editCustomer(${customer.id})" class="text-green-600 hover:text-green-900 mr-3">Edit</button>
                        <button onclick="app.deleteCustomer(${customer.id})" class="text-red-600 hover:text-red-900">Delete</button>
                    </td>
                </tr>
            `).join('');
            
        } catch (error) {
            console.error('Error loading customers:', error);
        }
    }

    // Sales Section
    async getSalesHTML() {
        return `
            <div class="mb-6">
                <h2 class="text-3xl font-bold text-gray-800 mb-2">Sales</h2>
                <p class="text-gray-600">View and manage sales transactions</p>
            </div>
            
            <div class="bg-white rounded-lg shadow-md p-6">
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <input type="date" id="startDate" class="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <input type="date" id="endDate" class="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <select id="statusFilter" class="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">All Status</option>
                        <option value="completed">Completed</option>
                        <option value="pending">Pending</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="refunded">Refunded</option>
                    </select>
                    <button id="filterSales" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Filter</button>
                </div>
                
                <div class="overflow-x-auto">
                    <table class="min-w-full table-auto">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sale ID</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="salesTableBody" class="bg-white divide-y divide-gray-200">
                            <!-- Sales will be loaded here -->
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    async loadSalesData() {
        try {
            const sales = await this.apiCall('/api/sales');
            const tbody = document.getElementById('salesTableBody');
            
            tbody.innerHTML = sales.sales.map(sale => `
                <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#${sale.id}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${sale.customer_name || 'Walk-in'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${new Date(sale.created_at).toLocaleDateString()}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${sale.items_count}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">$${sale.total_amount.toFixed(2)}</td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${this.getStatusColor(sale.status)}">
                            ${sale.status}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button onclick="app.viewSale(${sale.id})" class="text-blue-600 hover:text-blue-900">View</button>
                    </td>
                </tr>
            `).join('');
            
        } catch (error) {
            console.error('Error loading sales:', error);
        }
    }

    getStatusColor(status) {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-800';
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            case 'refunded': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    }

    // Reports Section
    async getReportsHTML() {
        return `
            <div class="mb-6">
                <h2 class="text-3xl font-bold text-gray-800 mb-2">Reports</h2>
                <p class="text-gray-600">Business analytics and insights</p>
            </div>
            
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div class="bg-white rounded-lg shadow-md p-6">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4">Sales Summary</h3>
                    <div class="space-y-4">
                        <div class="flex gap-4">
                            <input type="date" id="reportStartDate" class="flex-1 px-3 py-2 border border-gray-300 rounded-lg">
                            <input type="date" id="reportEndDate" class="flex-1 px-3 py-2 border border-gray-300 rounded-lg">
                        </div>
                        <button id="generateSalesReport" class="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700">
                            Generate Sales Report
                        </button>
                    </div>
                    <div id="salesReportData" class="mt-4">
                        <!-- Sales report data will be displayed here -->
                    </div>
                </div>
                
                <div class="bg-white rounded-lg shadow-md p-6">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4">Top Products</h3>
                    <button id="generateTopProducts" class="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 mb-4">
                        Load Top Products
                    </button>
                    <div id="topProductsData">
                        <!-- Top products data will be displayed here -->
                    </div>
                </div>
            </div>
            
            ${this.user.role !== 'cashier' ? `
                <div class="bg-white rounded-lg shadow-md p-6">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4">Inventory Report</h3>
                    <button id="generateInventoryReport" class="bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 mb-4">
                        Generate Inventory Report
                    </button>
                    <div id="inventoryReportData">
                        <!-- Inventory report data will be displayed here -->
                    </div>
                </div>
            ` : ''}
        `;
    }

    async loadReportsData() {
        // Set default dates
        const today = new Date();
        const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        document.getElementById('reportStartDate').value = lastWeek.toISOString().split('T')[0];
        document.getElementById('reportEndDate').value = today.toISOString().split('T')[0];
        
        // Setup event listeners
        document.getElementById('generateSalesReport').addEventListener('click', () => {
            this.generateSalesReport();
        });
        
        document.getElementById('generateTopProducts').addEventListener('click', () => {
            this.generateTopProductsReport();
        });
        
        if (this.user.role !== 'cashier') {
            document.getElementById('generateInventoryReport').addEventListener('click', () => {
                this.generateInventoryReport();
            });
        }
    }

    async generateSalesReport() {
        const startDate = document.getElementById('reportStartDate').value;
        const endDate = document.getElementById('reportEndDate').value;
        
        try {
            const report = await this.apiCall(`/api/reports/sales-summary?start_date=${startDate}&end_date=${endDate}`);
            const reportDiv = document.getElementById('salesReportData');
            
            if (report.report.length === 0) {
                reportDiv.innerHTML = '<p class="text-gray-500">No sales data for the selected period</p>';
                return;
            }
            
            const totalRevenue = report.report.reduce((sum, day) => sum + day.total_revenue, 0);
            const totalSales = report.report.reduce((sum, day) => sum + day.total_sales, 0);
            
            reportDiv.innerHTML = `
                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div class="text-center p-3 bg-blue-50 rounded-lg">
                        <p class="text-sm text-gray-600">Total Revenue</p>
                        <p class="text-xl font-bold text-blue-600">$${totalRevenue.toFixed(2)}</p>
                    </div>
                    <div class="text-center p-3 bg-green-50 rounded-lg">
                        <p class="text-sm text-gray-600">Total Sales</p>
                        <p class="text-xl font-bold text-green-600">${totalSales}</p>
                    </div>
                </div>
                <div class="max-h-64 overflow-y-auto">
                    ${report.report.map(day => `
                        <div class="flex justify-between items-center py-2 border-b border-gray-100">
                            <span class="text-sm">${day.period}</span>
                            <div class="text-right">
                                <div class="text-sm font-medium">$${day.total_revenue.toFixed(2)}</div>
                                <div class="text-xs text-gray-500">${day.total_sales} sales</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            
        } catch (error) {
            console.error('Error generating sales report:', error);
        }
    }

    async generateTopProductsReport() {
        try {
            const report = await this.apiCall('/api/reports/top-products?limit=10');
            const reportDiv = document.getElementById('topProductsData');
            
            if (report.products.length === 0) {
                reportDiv.innerHTML = '<p class="text-gray-500">No product sales data available</p>';
                return;
            }
            
            reportDiv.innerHTML = `
                <div class="max-h-64 overflow-y-auto">
                    ${report.products.map((product, index) => `
                        <div class="flex justify-between items-center py-2 border-b border-gray-100">
                            <div>
                                <span class="text-sm font-medium">${index + 1}. ${product.name}</span>
                                <div class="text-xs text-gray-500">${product.category_name || 'Uncategorized'}</div>
                            </div>
                            <div class="text-right">
                                <div class="text-sm font-medium">${product.total_quantity_sold} sold</div>
                                <div class="text-xs text-gray-500">$${product.total_revenue.toFixed(2)}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            
        } catch (error) {
            console.error('Error generating top products report:', error);
        }
    }

    async generateInventoryReport() {
        try {
            const report = await this.apiCall('/api/reports/inventory');
            const reportDiv = document.getElementById('inventoryReportData');
            
            reportDiv.innerHTML = `
                <div class="grid grid-cols-3 gap-4 mb-4">
                    <div class="text-center p-3 bg-blue-50 rounded-lg">
                        <p class="text-sm text-gray-600">Total Products</p>
                        <p class="text-xl font-bold text-blue-600">${report.summary.total_products}</p>
                    </div>
                    <div class="text-center p-3 bg-yellow-50 rounded-lg">
                        <p class="text-sm text-gray-600">Low Stock</p>
                        <p class="text-xl font-bold text-yellow-600">${report.summary.low_stock_products}</p>
                    </div>
                    <div class="text-center p-3 bg-red-50 rounded-lg">
                        <p class="text-sm text-gray-600">Out of Stock</p>
                        <p class="text-xl font-bold text-red-600">${report.summary.out_of_stock_products}</p>
                    </div>
                </div>
                <div class="text-center p-3 bg-green-50 rounded-lg mb-4">
                    <p class="text-sm text-gray-600">Total Inventory Value</p>
                    <p class="text-xl font-bold text-green-600">$${report.summary.total_inventory_value.toFixed(2)}</p>
                </div>
            `;
            
        } catch (error) {
            console.error('Error generating inventory report:', error);
        }
    }

    // Placeholder methods for future implementation
    editProduct(id) { alert(`Edit product ${id} - Feature coming soon!`); }
    deleteProduct(id) { alert(`Delete product ${id} - Feature coming soon!`); }
    viewCustomer(id) { alert(`View customer ${id} - Feature coming soon!`); }
    editCustomer(id) { alert(`Edit customer ${id} - Feature coming soon!`); }
    deleteCustomer(id) { alert(`Delete customer ${id} - Feature coming soon!`); }
    viewSale(id) { alert(`View sale ${id} - Feature coming soon!`); }
}

// Initialize the app
const app = new MiniPOS();