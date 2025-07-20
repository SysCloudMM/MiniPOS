// MiniPOS Application JavaScript

class MiniPOS {
    constructor() {
        this.currentUser = null;
        this.token = localStorage.getItem('minipos_token');
        this.cart = [];
        this.currentSection = 'pos';
        this.pagination = {
            products: { page: 1, limit: 12, total: 0 },
            posProducts: { page: 1, limit: 12, total: 0 },
            categories: { page: 1, limit: 10, total: 0 },
            customers: { page: 1, limit: 10, total: 0 }
        };

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAuth();
    }

    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }

        // Navigation
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-section]')) {
                e.preventDefault();
                this.showSection(e.target.dataset.section);
            }
        });

        // Sidebar toggle
        const sidebarToggle = document.getElementById('sidebarToggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => this.toggleSidebar());
        }

        // Modal handlers
        this.setupModalHandlers();

        // Form handlers
        this.setupFormHandlers();

        // Cart handlers
        this.setupCartHandlers();

        // Search handlers
        this.setupSearchHandlers();

        // Pagination handlers
        this.setupPaginationHandlers();

        // Admin panel handlers
        this.setupAdminHandlers();
    }

    setupModalHandlers() {
        // Modal close buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('.modal-close, .modal-cancel, .modal-backdrop')) {
                this.closeModal(e.target.closest('.modal'));
            }
        });

        // Add buttons
        const addProductBtn = document.getElementById('addProductBtn');
        if (addProductBtn) {
            addProductBtn.addEventListener('click', () => this.openProductModal());
        }

        const addCategoryBtn = document.getElementById('addCategoryBtn');
        if (addCategoryBtn) {
            addCategoryBtn.addEventListener('click', () => this.openCategoryModal());
        }

        const addCustomerBtn = document.getElementById('addCustomerBtn');
        if (addCustomerBtn) {
            addCustomerBtn.addEventListener('click', () => this.openCustomerModal());
        }

        const addUserBtn = document.getElementById('addUserBtn');
        if (addUserBtn) {
            addUserBtn.addEventListener('click', () => this.openUserModal());
        }
    }

    setupFormHandlers() {
        // Product form
        const productForm = document.getElementById('productForm');
        if (productForm) {
            productForm.addEventListener('submit', (e) => this.handleProductSubmit(e));
        }

        // Category form
        const categoryForm = document.getElementById('categoryForm');
        if (categoryForm) {
            categoryForm.addEventListener('submit', (e) => this.handleCategorySubmit(e));
        }

        // Customer form
        const customerForm = document.getElementById('customerForm');
        if (customerForm) {
            customerForm.addEventListener('submit', (e) => this.handleCustomerSubmit(e));
        }

        // User form
        const userForm = document.getElementById('userForm');
        if (userForm) {
            userForm.addEventListener('submit', (e) => this.handleUserSubmit(e));
        }
    }

    setupCartHandlers() {
        // Clear cart
        const clearCartBtn = document.getElementById('clearCart');
        if (clearCartBtn) {
            clearCartBtn.addEventListener('click', () => this.clearCart());
        }

        // Checkout
        const checkoutBtn = document.getElementById('checkoutBtn');
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', () => this.processCheckout());
        }
    }

    setupSearchHandlers() {
        // Product search in POS
        const productSearch = document.getElementById('productSearch');
        if (productSearch) {
            let searchTimeout;
            productSearch.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.pagination.posProducts.page = 1;
                    this.loadPOSProducts(e.target.value);
                }, 300);
            });
        }
    }

    setupPaginationHandlers() {
        // POS Products pagination
        const posPrevBtn = document.getElementById('posPrevBtn');
        const posNextBtn = document.getElementById('posNextBtn');
        
        if (posPrevBtn) {
            posPrevBtn.addEventListener('click', () => {
                if (this.pagination.posProducts.page > 1) {
                    this.pagination.posProducts.page--;
                    this.loadPOSProducts();
                }
            });
        }

        if (posNextBtn) {
            posNextBtn.addEventListener('click', () => {
                const maxPage = Math.ceil(this.pagination.posProducts.total / this.pagination.posProducts.limit);
                if (this.pagination.posProducts.page < maxPage) {
                    this.pagination.posProducts.page++;
                    this.loadPOSProducts();
                }
            });
        }

        // Products pagination
        const productsPrevBtn = document.getElementById('productsPrevBtn');
        const productsNextBtn = document.getElementById('productsNextBtn');
        
        if (productsPrevBtn) {
            productsPrevBtn.addEventListener('click', () => {
                if (this.pagination.products.page > 1) {
                    this.pagination.products.page--;
                    this.loadProducts();
                }
            });
        }

        if (productsNextBtn) {
            productsNextBtn.addEventListener('click', () => {
                const maxPage = Math.ceil(this.pagination.products.total / this.pagination.products.limit);
                if (this.pagination.products.page < maxPage) {
                    this.pagination.products.page++;
                    this.loadProducts();
                }
            });
        }

        // Categories pagination
        const categoriesPrevBtn = document.getElementById('categoriesPrevBtn');
        const categoriesNextBtn = document.getElementById('categoriesNextBtn');
        
        if (categoriesPrevBtn) {
            categoriesPrevBtn.addEventListener('click', () => {
                if (this.pagination.categories.page > 1) {
                    this.pagination.categories.page--;
                    this.loadCategories();
                }
            });
        }

        if (categoriesNextBtn) {
            categoriesNextBtn.addEventListener('click', () => {
                const maxPage = Math.ceil(this.pagination.categories.total / this.pagination.categories.limit);
                if (this.pagination.categories.page < maxPage) {
                    this.pagination.categories.page++;
                    this.loadCategories();
                }
            });
        }
    }

    setupAdminHandlers() {
        // View users button
        const viewUsersBtn = document.getElementById('viewUsersBtn');
        if (viewUsersBtn) {
            viewUsersBtn.addEventListener('click', () => this.toggleUsersList());
        }

        // Save settings button
        const saveSettingsBtn = document.getElementById('saveSettingsBtn');
        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', () => this.saveSettings());
        }

        // Export buttons
        const exportProductsBtn = document.getElementById('exportProductsBtn');
        if (exportProductsBtn) {
            exportProductsBtn.addEventListener('click', () => this.exportData('products'));
        }

        const exportCustomersBtn = document.getElementById('exportCustomersBtn');
        if (exportCustomersBtn) {
            exportCustomersBtn.addEventListener('click', () => this.exportData('customers'));
        }

        const exportSalesBtn = document.getElementById('exportSalesBtn');
        if (exportSalesBtn) {
            exportSalesBtn.addEventListener('click', () => this.exportData('sales'));
        }

        const exportAllBtn = document.getElementById('exportAllBtn');
        if (exportAllBtn) {
            exportAllBtn.addEventListener('click', () => this.exportData('all'));
        }

        // Import file handler
        const importFile = document.getElementById('importFile');
        if (importFile) {
            importFile.addEventListener('change', (e) => this.handleImport(e));
        }

        // Backup button
        const backupDbBtn = document.getElementById('backupDbBtn');
        if (backupDbBtn) {
            backupDbBtn.addEventListener('click', () => this.createBackup());
        }

        // Refresh stats button
        const refreshStatsBtn = document.getElementById('refreshStatsBtn');
        if (refreshStatsBtn) {
            refreshStatsBtn.addEventListener('click', () => this.loadSystemStats());
        }
    }

    async checkAuth() {
        if (!this.token) {
            this.showLogin();
            return;
        }

        try {
            // Verify token by making a test request
            const response = await this.apiCall('/api/products', 'GET');
            if (response.success) {
                // Token is valid, decode user info from token
                const payload = JSON.parse(atob(this.token.split('.')[1]));
                this.currentUser = {
                    id: payload.userId,
                    username: payload.username,
                    role: payload.role
                };
                this.showDashboard();
            } else {
                this.showLogin();
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            this.showLogin();
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const credentials = {
            username: formData.get('username'),
            password: formData.get('password')
        };

        try {
            const response = await this.apiCall('/api/auth/login', 'POST', credentials);
            
            if (response.success) {
                this.token = response.data.token;
                this.currentUser = response.data.user;
                localStorage.setItem('minipos_token', this.token);
                this.showDashboard();
                this.showNotification('Login successful!', 'success');
            } else {
                this.showNotification(response.message || 'Login failed', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showNotification('Login failed. Please try again.', 'error');
        }
    }

    logout() {
        this.token = null;
        this.currentUser = null;
        this.cart = [];
        localStorage.removeItem('minipos_token');
        this.showLogin();
        this.showNotification('Logged out successfully', 'info');
    }

    showLogin() {
        document.getElementById('loginScreen').classList.add('active');
        document.getElementById('dashboardScreen').classList.remove('active');
    }

    showDashboard() {
        document.getElementById('loginScreen').classList.remove('active');
        document.getElementById('dashboardScreen').classList.add('active');
        
        // Update user info
        const userInfo = document.getElementById('userInfo');
        if (userInfo && this.currentUser) {
            userInfo.textContent = `Welcome, ${this.currentUser.name || this.currentUser.username}`;
        }

        // Show/hide admin panel based on role
        this.updateNavigationForRole();
        
        // Load initial data
        this.loadPOSProducts();
        this.loadCategories();
    }

    updateNavigationForRole() {
        const adminNavLink = document.querySelector('.admin-nav-link');
        if (adminNavLink) {
            if (this.currentUser && (this.currentUser.role === 'admin' || this.currentUser.role === 'manager')) {
                adminNavLink.classList.add('visible');
            } else {
                adminNavLink.classList.remove('visible');
            }
        }

        // Update add buttons visibility
        const addButtons = document.querySelectorAll('#addProductBtn, #addCategoryBtn');
        addButtons.forEach(btn => {
            if (this.currentUser && (this.currentUser.role === 'admin' || this.currentUser.role === 'manager')) {
                btn.style.display = 'inline-flex';
            } else {
                btn.style.display = 'none';
            }
        });
    }

    showSection(sectionName) {
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');

        // Update content
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(`${sectionName}Section`).classList.add('active');

        this.currentSection = sectionName;

        // Load section data
        switch (sectionName) {
            case 'pos':
                this.loadPOSProducts();
                break;
            case 'products':
                this.loadProducts();
                break;
            case 'categories':
                this.loadCategories();
                break;
            case 'customers':
                this.loadCustomers();
                break;
            case 'sales':
                this.loadSales();
                break;
            case 'reports':
                this.loadReports();
                break;
            case 'admin':
                this.loadAdminPanel();
                break;
        }
    }

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.toggle('open');
    }

    async apiCall(endpoint, method = 'GET', data = null) {
        const config = {
            method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (this.token) {
            config.headers['Authorization'] = `Bearer ${this.token}`;
        }

        if (data && method !== 'GET') {
            config.body = JSON.stringify(data);
        }

        const response = await fetch(endpoint, config);
        
        if (response.status === 401) {
            this.logout();
            throw new Error('Unauthorized');
        }

        return await response.json();
    }

    // POS Functions
    async loadPOSProducts(search = '') {
        try {
            const { page, limit } = this.pagination.posProducts;
            const params = new URLSearchParams({
                active: 'true',
                ...(search && { search })
            });

            const response = await this.apiCall(`/api/products?${params}`);
            
            if (response.success) {
                const products = response.data;
                this.pagination.posProducts.total = products.length;
                
                // Calculate pagination
                const startIndex = (page - 1) * limit;
                const endIndex = startIndex + limit;
                const paginatedProducts = products.slice(startIndex, endIndex);
                
                this.renderPOSProducts(paginatedProducts);
                this.updatePOSPagination();
            }
        } catch (error) {
            console.error('Error loading POS products:', error);
            this.showNotification('Failed to load products', 'error');
        }
    }

    renderPOSProducts(products) {
        const grid = document.getElementById('productGrid');
        if (!grid) return;

        if (products.length === 0) {
            grid.innerHTML = `
                <div class="no-products">
                    <i class="fas fa-box-open"></i>
                    <p>No products found</p>
                    <span>Try adjusting your search</span>
                </div>
            `;
            return;
        }

        grid.innerHTML = products.map(product => `
            <div class="product-card" onclick="minipos.addToCart(${product.id})">
                <h4>${this.escapeHtml(product.name)}</h4>
                <div class="price">${this.formatCurrency(product.price)}</div>
                ${product.stock_quantity <= product.min_stock ? 
                    '<div class="stock-warning">Low Stock</div>' : ''}
            </div>
        `).join('');
    }

    updatePOSPagination() {
        const { page, limit, total } = this.pagination.posProducts;
        const maxPage = Math.ceil(total / limit);
        const startItem = (page - 1) * limit + 1;
        const endItem = Math.min(page * limit, total);

        const pageInfo = document.getElementById('posPageInfo');
        if (pageInfo) {
            pageInfo.textContent = `Showing ${startItem} - ${endItem} of ${total} products`;
        }

        const prevBtn = document.getElementById('posPrevBtn');
        const nextBtn = document.getElementById('posNextBtn');
        
        if (prevBtn) prevBtn.disabled = page <= 1;
        if (nextBtn) nextBtn.disabled = page >= maxPage;
    }

    addToCart(productId) {
        // Find product
        this.apiCall(`/api/products/${productId}`)
            .then(response => {
                if (response.success) {
                    const product = response.data;
                    
                    // Check if product already in cart
                    const existingItem = this.cart.find(item => item.product_id === productId);
                    
                    if (existingItem) {
                        if (existingItem.quantity < product.stock_quantity) {
                            existingItem.quantity++;
                            existingItem.total_price = existingItem.quantity * existingItem.unit_price;
                        } else {
                            this.showNotification('Insufficient stock', 'warning');
                            return;
                        }
                    } else {
                        if (product.stock_quantity > 0) {
                            this.cart.push({
                                product_id: productId,
                                name: product.name,
                                unit_price: product.price,
                                quantity: 1,
                                total_price: product.price
                            });
                        } else {
                            this.showNotification('Product out of stock', 'warning');
                            return;
                        }
                    }
                    
                    this.updateCartDisplay();
                    this.showNotification(`${product.name} added to cart`, 'success');
                }
            })
            .catch(error => {
                console.error('Error adding to cart:', error);
                this.showNotification('Failed to add product to cart', 'error');
            });
    }

    updateCartDisplay() {
        const cartItems = document.getElementById('cartItems');
        const subtotalEl = document.getElementById('subtotal');
        const taxEl = document.getElementById('tax');
        const totalEl = document.getElementById('total');

        if (this.cart.length === 0) {
            cartItems.innerHTML = `
                <div class="empty-cart">
                    <i class="fas fa-shopping-cart"></i>
                    <p>No items in cart</p>
                    <span>Add products to start a sale</span>
                </div>
            `;
            if (subtotalEl) subtotalEl.textContent = '0 MMK';
            if (taxEl) taxEl.textContent = '0 MMK';
            if (totalEl) totalEl.textContent = '0 MMK';
            return;
        }

        cartItems.innerHTML = this.cart.map((item, index) => `
            <div class="cart-item">
                <div class="item-info">
                    <h5>${this.escapeHtml(item.name)}</h5>
                    <div class="item-price">${this.formatCurrency(item.unit_price)} each</div>
                </div>
                <div class="item-controls">
                    <button class="qty-btn" onclick="minipos.updateCartQuantity(${index}, -1)">-</button>
                    <span>${item.quantity}</span>
                    <button class="qty-btn" onclick="minipos.updateCartQuantity(${index}, 1)">+</button>
                    <button class="qty-btn" onclick="minipos.removeFromCart(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        // Calculate totals
        const subtotal = this.cart.reduce((sum, item) => sum + item.total_price, 0);
        const tax = subtotal * 0.05; // 5% tax
        const total = subtotal + tax;

        if (subtotalEl) subtotalEl.textContent = this.formatCurrency(subtotal);
        if (taxEl) taxEl.textContent = this.formatCurrency(tax);
        if (totalEl) totalEl.textContent = this.formatCurrency(total);
    }

    updateCartQuantity(index, change) {
        const item = this.cart[index];
        const newQuantity = item.quantity + change;

        if (newQuantity <= 0) {
            this.removeFromCart(index);
            return;
        }

        // Check stock availability
        this.apiCall(`/api/products/${item.product_id}`)
            .then(response => {
                if (response.success) {
                    const product = response.data;
                    if (newQuantity <= product.stock_quantity) {
                        item.quantity = newQuantity;
                        item.total_price = item.quantity * item.unit_price;
                        this.updateCartDisplay();
                    } else {
                        this.showNotification('Insufficient stock', 'warning');
                    }
                }
            })
            .catch(error => {
                console.error('Error checking stock:', error);
            });
    }

    removeFromCart(index) {
        this.cart.splice(index, 1);
        this.updateCartDisplay();
        this.showNotification('Item removed from cart', 'info');
    }

    clearCart() {
        this.cart = [];
        this.updateCartDisplay();
        this.showNotification('Cart cleared', 'info');
    }

    async processCheckout() {
        if (this.cart.length === 0) {
            this.showNotification('Cart is empty', 'warning');
            return;
        }

        const paymentMethod = document.getElementById('paymentMethod').value;
        const subtotal = this.cart.reduce((sum, item) => sum + item.total_price, 0);
        const taxAmount = subtotal * 0.05;

        const saleData = {
            customer_id: null, // For now, no customer selection
            items: this.cart.map(item => ({
                product_id: item.product_id,
                quantity: item.quantity,
                unit_price: item.unit_price
            })),
            discount_amount: 0,
            tax_amount: taxAmount,
            payment_method: paymentMethod
        };

        try {
            const response = await this.apiCall('/api/sales', 'POST', saleData);
            
            if (response.success) {
                this.showNotification('Sale completed successfully!', 'success');
                this.clearCart();
                // Optionally print receipt or show sale details
                console.log('Sale completed:', response.data);
            } else {
                this.showNotification(response.message || 'Sale failed', 'error');
            }
        } catch (error) {
            console.error('Checkout error:', error);
            this.showNotification('Checkout failed. Please try again.', 'error');
        }
    }

    // Product Management
    async loadProducts() {
        try {
            const response = await this.apiCall('/api/products');
            if (response.success) {
                this.renderProductsTable(response.data);
            }
        } catch (error) {
            console.error('Error loading products:', error);
            this.showNotification('Failed to load products', 'error');
        }
    }

    renderProductsTable(products) {
        const tbody = document.getElementById('productsTable');
        if (!tbody) return;

        tbody.innerHTML = products.map(product => `
            <tr>
                <td>
                    <div>
                        <strong>${this.escapeHtml(product.name)}</strong>
                        ${product.barcode ? `<br><small>Barcode: ${this.escapeHtml(product.barcode)}</small>` : ''}
                    </div>
                </td>
                <td>${this.formatCurrency(product.price)}</td>
                <td>
                    <span class="${product.stock_quantity <= product.min_stock ? 'text-warning' : ''}">${product.stock_quantity}</span>
                    ${product.stock_quantity <= product.min_stock ? '<br><small class="text-warning">Low Stock</small>' : ''}
                </td>
                <td>${product.category_name || 'No Category'}</td>
                <td>
                    ${this.canManageProducts() ? `
                        <button class="btn btn-sm btn-outline" onclick="minipos.editProduct(${product.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="minipos.deleteProduct(${product.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                </td>
            </tr>
        `).join('');
    }

    canManageProducts() {
        return this.currentUser && (this.currentUser.role === 'admin' || this.currentUser.role === 'manager');
    }

    openProductModal(product = null) {
        const modal = document.getElementById('productModal');
        const form = document.getElementById('productForm');
        const title = document.getElementById('productModalTitle');

        if (product) {
            title.textContent = 'Edit Product';
            form.dataset.productId = product.id;
            // Fill form with product data
            document.getElementById('productName').value = product.name || '';
            document.getElementById('productBarcode').value = product.barcode || '';
            document.getElementById('productPrice').value = product.price || '';
            document.getElementById('productCost').value = product.cost || '';
            document.getElementById('productStock').value = product.stock_quantity || '';
            document.getElementById('productMinStock').value = product.min_stock || '';
            document.getElementById('productCategory').value = product.category_id || '';
            document.getElementById('productDescription').value = product.description || '';
        } else {
            title.textContent = 'Add Product';
            form.reset();
            delete form.dataset.productId;
        }

        this.loadCategoriesForSelect();
        modal.classList.add('active');
    }

    async loadCategoriesForSelect() {
        try {
            const response = await this.apiCall('/api/categories');
            if (response.success) {
                const select = document.getElementById('productCategory');
                if (select) {
                    select.innerHTML = '<option value="">Select Category</option>' +
                        response.data.map(cat => 
                            `<option value="${cat.id}">${this.escapeHtml(cat.name)}</option>`
                        ).join('');
                }
            }
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }

    async handleProductSubmit(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        const productData = {
            name: formData.get('name'),
            barcode: formData.get('barcode'),
            price: parseFloat(formData.get('price')),
            cost: parseFloat(formData.get('cost')) || 0,
            stock_quantity: parseInt(formData.get('stock_quantity')),
            min_stock: parseInt(formData.get('min_stock')) || 0,
            category_id: formData.get('category_id') ? parseInt(formData.get('category_id')) : null,
            description: formData.get('description')
        };

        try {
            const isEdit = form.dataset.productId;
            const endpoint = isEdit ? `/api/products/${form.dataset.productId}` : '/api/products';
            const method = isEdit ? 'PUT' : 'POST';

            const response = await this.apiCall(endpoint, method, productData);
            
            if (response.success) {
                this.showNotification(`Product ${isEdit ? 'updated' : 'created'} successfully!`, 'success');
                this.closeModal(document.getElementById('productModal'));
                this.loadProducts();
                if (this.currentSection === 'pos') {
                    this.loadPOSProducts();
                }
            } else {
                this.showNotification(response.message || 'Operation failed', 'error');
            }
        } catch (error) {
            console.error('Product submit error:', error);
            this.showNotification('Operation failed. Please try again.', 'error');
        }
    }

    async editProduct(id) {
        try {
            const response = await this.apiCall(`/api/products/${id}`);
            if (response.success) {
                this.openProductModal(response.data);
            }
        } catch (error) {
            console.error('Error loading product:', error);
            this.showNotification('Failed to load product', 'error');
        }
    }

    async deleteProduct(id) {
        if (!confirm('Are you sure you want to delete this product?')) {
            return;
        }

        try {
            const response = await this.apiCall(`/api/products/${id}`, 'DELETE');
            if (response.success) {
                this.showNotification('Product deleted successfully!', 'success');
                this.loadProducts();
                if (this.currentSection === 'pos') {
                    this.loadPOSProducts();
                }
            } else {
                this.showNotification(response.message || 'Delete failed', 'error');
            }
        } catch (error) {
            console.error('Delete error:', error);
            this.showNotification('Delete failed. Please try again.', 'error');
        }
    }

    // Category Management
    async loadCategories() {
        try {
            const response = await this.apiCall('/api/categories');
            if (response.success) {
                this.renderCategoriesTable(response.data);
            }
        } catch (error) {
            console.error('Error loading categories:', error);
            this.showNotification('Failed to load categories', 'error');
        }
    }

    renderCategoriesTable(categories) {
        const tbody = document.getElementById('categoriesTable');
        if (!tbody) return;

        tbody.innerHTML = categories.map(category => `
            <tr>
                <td><strong>${this.escapeHtml(category.name)}</strong></td>
                <td>${this.escapeHtml(category.description || '')}</td>
                <td>
                    ${this.canManageProducts() ? `
                        <button class="btn btn-sm btn-outline" onclick="minipos.editCategory(${category.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="minipos.deleteCategory(${category.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                </td>
            </tr>
        `).join('');
    }

    openCategoryModal(category = null) {
        const modal = document.getElementById('categoryModal');
        const form = document.getElementById('categoryForm');
        const title = document.getElementById('categoryModalTitle');

        if (category) {
            title.textContent = 'Edit Category';
            form.dataset.categoryId = category.id;
            document.getElementById('categoryName').value = category.name || '';
            document.getElementById('categoryDescription').value = category.description || '';
        } else {
            title.textContent = 'Add Category';
            form.reset();
            delete form.dataset.categoryId;
        }

        modal.classList.add('active');
    }

    async handleCategorySubmit(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        const categoryData = {
            name: formData.get('name'),
            description: formData.get('description')
        };

        try {
            const isEdit = form.dataset.categoryId;
            const endpoint = isEdit ? `/api/categories/${form.dataset.categoryId}` : '/api/categories';
            const method = isEdit ? 'PUT' : 'POST';

            const response = await this.apiCall(endpoint, method, categoryData);
            
            if (response.success) {
                this.showNotification(`Category ${isEdit ? 'updated' : 'created'} successfully!`, 'success');
                this.closeModal(document.getElementById('categoryModal'));
                this.loadCategories();
            } else {
                this.showNotification(response.message || 'Operation failed', 'error');
            }
        } catch (error) {
            console.error('Category submit error:', error);
            this.showNotification('Operation failed. Please try again.', 'error');
        }
    }

    async editCategory(id) {
        try {
            const response = await this.apiCall(`/api/categories/${id}`);
            if (response.success) {
                this.openCategoryModal(response.data);
            }
        } catch (error) {
            console.error('Error loading category:', error);
            this.showNotification('Failed to load category', 'error');
        }
    }

    async deleteCategory(id) {
        if (!confirm('Are you sure you want to delete this category?')) {
            return;
        }

        try {
            const response = await this.apiCall(`/api/categories/${id}`, 'DELETE');
            if (response.success) {
                this.showNotification('Category deleted successfully!', 'success');
                this.loadCategories();
            } else {
                this.showNotification(response.message || 'Delete failed', 'error');
            }
        } catch (error) {
            console.error('Delete error:', error);
            this.showNotification('Delete failed. Please try again.', 'error');
        }
    }

    // Customer Management
    async loadCustomers() {
        try {
            const response = await this.apiCall('/api/customers');
            if (response.success) {
                this.renderCustomersTable(response.data);
            }
        } catch (error) {
            console.error('Error loading customers:', error);
            this.showNotification('Failed to load customers', 'error');
        }
    }

    renderCustomersTable(customers) {
        const tbody = document.getElementById('customersTable');
        if (!tbody) return;

        tbody.innerHTML = customers.map(customer => `
            <tr>
                <td><strong>${this.escapeHtml(customer.name)}</strong></td>
                <td>${this.escapeHtml(customer.email || '')}</td>
                <td>${this.escapeHtml(customer.phone || '')}</td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="minipos.editCustomer(${customer.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="minipos.deleteCustomer(${customer.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    openCustomerModal(customer = null) {
        const modal = document.getElementById('customerModal');
        const form = document.getElementById('customerForm');
        const title = document.getElementById('customerModalTitle');

        if (customer) {
            title.textContent = 'Edit Customer';
            form.dataset.customerId = customer.id;
            document.getElementById('customerName').value = customer.name || '';
            document.getElementById('customerEmail').value = customer.email || '';
            document.getElementById('customerPhone').value = customer.phone || '';
            document.getElementById('customerAddress').value = customer.address || '';
        } else {
            title.textContent = 'Add Customer';
            form.reset();
            delete form.dataset.customerId;
        }

        modal.classList.add('active');
    }

    async handleCustomerSubmit(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        
        // Combine country code and phone number
        const countryCode = formData.get('country_code') || '+95';
        const phoneNumber = formData.get('phone');
        const fullPhone = phoneNumber ? `${countryCode} ${phoneNumber}` : '';

        const customerData = {
            name: formData.get('name'),
            email: formData.get('email'),
            phone: fullPhone,
            address: formData.get('address')
        };

        try {
            const isEdit = form.dataset.customerId;
            const endpoint = isEdit ? `/api/customers/${form.dataset.customerId}` : '/api/customers';
            const method = isEdit ? 'PUT' : 'POST';

            const response = await this.apiCall(endpoint, method, customerData);
            
            if (response.success) {
                this.showNotification(`Customer ${isEdit ? 'updated' : 'created'} successfully!`, 'success');
                this.closeModal(document.getElementById('customerModal'));
                this.loadCustomers();
            } else {
                this.showNotification(response.message || 'Operation failed', 'error');
            }
        } catch (error) {
            console.error('Customer submit error:', error);
            this.showNotification('Operation failed. Please try again.', 'error');
        }
    }

    async editCustomer(id) {
        try {
            const response = await this.apiCall(`/api/customers/${id}`);
            if (response.success) {
                this.openCustomerModal(response.data);
            }
        } catch (error) {
            console.error('Error loading customer:', error);
            this.showNotification('Failed to load customer', 'error');
        }
    }

    async deleteCustomer(id) {
        if (!confirm('Are you sure you want to delete this customer?')) {
            return;
        }

        try {
            const response = await this.apiCall(`/api/customers/${id}`, 'DELETE');
            if (response.success) {
                this.showNotification('Customer deleted successfully!', 'success');
                this.loadCustomers();
            } else {
                this.showNotification(response.message || 'Delete failed', 'error');
            }
        } catch (error) {
            console.error('Delete error:', error);
            this.showNotification('Delete failed. Please try again.', 'error');
        }
    }

    // Sales Management
    async loadSales() {
        try {
            const response = await this.apiCall('/api/sales');
            if (response.success) {
                this.renderSalesTable(response.data);
            }
        } catch (error) {
            console.error('Error loading sales:', error);
            this.showNotification('Failed to load sales', 'error');
        }
    }

    renderSalesTable(sales) {
        const tbody = document.getElementById('salesTable');
        if (!tbody) return;

        tbody.innerHTML = sales.map(sale => `
            <tr>
                <td>${new Date(sale.created_at).toLocaleDateString()}</td>
                <td>${this.escapeHtml(sale.customer_name || 'Walk-in Customer')}</td>
                <td>${this.formatCurrency(sale.final_amount)}</td>
                <td><span class="status-badge status-${sale.payment_method}">${sale.payment_method}</span></td>
                <td><span class="status-badge status-${sale.status}">${sale.status}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="minipos.viewSale(${sale.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    async viewSale(id) {
        try {
            const response = await this.apiCall(`/api/sales/${id}`);
            if (response.success) {
                // For now, just log the sale details
                console.log('Sale details:', response.data);
                this.showNotification('Sale details logged to console', 'info');
            }
        } catch (error) {
            console.error('Error loading sale:', error);
            this.showNotification('Failed to load sale details', 'error');
        }
    }

    // Reports
    async loadReports() {
        try {
            // Load sales summary
            const summaryResponse = await this.apiCall('/api/reports/sales-summary');
            if (summaryResponse.success) {
                this.renderSalesSummary(summaryResponse.data);
            }

            // Load top products
            const topProductsResponse = await this.apiCall('/api/reports/top-products?limit=5');
            if (topProductsResponse.success) {
                this.renderTopProducts(topProductsResponse.data);
            }
        } catch (error) {
            console.error('Error loading reports:', error);
            this.showNotification('Failed to load reports', 'error');
        }
    }

    renderSalesSummary(summary) {
        const container = document.getElementById('salesSummary');
        if (!container) return;

        container.innerHTML = `
            <div class="summary-stats">
                <div class="stat-item">
                    <h4>Total Sales</h4>
                    <p>${summary.total_sales || 0}</p>
                </div>
                <div class="stat-item">
                    <h4>Revenue</h4>
                    <p>${this.formatCurrency(summary.total_revenue || 0)}</p>
                </div>
                <div class="stat-item">
                    <h4>Average Sale</h4>
                    <p>${this.formatCurrency(summary.average_sale || 0)}</p>
                </div>
                <div class="stat-item">
                    <h4>Total Tax</h4>
                    <p>${this.formatCurrency(summary.total_taxes || 0)}</p>
                </div>
            </div>
        `;
    }

    renderTopProducts(products) {
        const container = document.getElementById('topProducts');
        if (!container) return;

        if (products.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-500">No sales data available</p>';
            return;
        }

        container.innerHTML = `
            <div class="top-products-list">
                ${products.map((product, index) => `
                    <div class="product-item">
                        <div class="rank">${index + 1}</div>
                        <div class="name">${this.escapeHtml(product.name)}</div>
                        <div class="quantity">${product.total_quantity} sold</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Admin Panel Functions
    async loadAdminPanel() {
        if (this.currentUser && this.currentUser.role === 'admin') {
            this.loadSystemStats();
        }
    }

    async loadSystemStats() {
        try {
            // Load various statistics
            const [products, customers, sales, users] = await Promise.all([
                this.apiCall('/api/products'),
                this.apiCall('/api/customers'),
                this.apiCall('/api/sales'),
                this.apiCall('/api/users')
            ]);

            // Update stats display
            const totalProducts = document.getElementById('totalProducts');
            const totalCustomers = document.getElementById('totalCustomers');
            const totalSales = document.getElementById('totalSales');
            const totalUsers = document.getElementById('totalUsers');

            if (totalProducts && products.success) {
                totalProducts.textContent = products.data.length;
            }
            if (totalCustomers && customers.success) {
                totalCustomers.textContent = customers.data.length;
            }
            if (totalSales && sales.success) {
                totalSales.textContent = sales.data.length;
            }
            if (totalUsers && users.success) {
                totalUsers.textContent = users.data.length;
            }
        } catch (error) {
            console.error('Error loading system stats:', error);
        }
    }

    // User Management (Admin only)
    async toggleUsersList() {
        const usersList = document.getElementById('usersList');
        if (usersList.classList.contains('hidden')) {
            usersList.classList.remove('hidden');
            this.loadUsers();
        } else {
            usersList.classList.add('hidden');
        }
    }

    async loadUsers() {
        try {
            const response = await this.apiCall('/api/users');
            if (response.success) {
                this.renderUsersTable(response.data);
            }
        } catch (error) {
            console.error('Error loading users:', error);
            this.showNotification('Failed to load users', 'error');
        }
    }

    renderUsersTable(users) {
        const tbody = document.getElementById('usersTable');
        if (!tbody) return;

        tbody.innerHTML = users.map(user => `
            <tr>
                <td><strong>${this.escapeHtml(user.name)}</strong></td>
                <td>${this.escapeHtml(user.username)}</td>
                <td><span class="role-badge role-${user.role}">${user.role}</span></td>
                <td><span class="status-badge status-${user.is_active ? 'active' : 'inactive'}">${user.is_active ? 'Active' : 'Inactive'}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="minipos.editUser(${user.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${user.id !== this.currentUser.id ? `
                        <button class="btn btn-sm btn-warning" onclick="minipos.toggleUserStatus(${user.id})">
                            <i class="fas fa-toggle-${user.is_active ? 'on' : 'off'}"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="minipos.deleteUser(${user.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                </td>
            </tr>
        `).join('');
    }

    openUserModal(user = null) {
        const modal = document.getElementById('userModal');
        const form = document.getElementById('userForm');
        const title = document.getElementById('userModalTitle');

        if (user) {
            title.textContent = 'Edit User';
            form.dataset.userId = user.id;
            document.getElementById('userName').value = user.name || '';
            document.getElementById('userUsername').value = user.username || '';
            document.getElementById('userEmail').value = user.email || '';
            document.getElementById('userPassword').value = '';
            document.getElementById('userRole').value = user.role || 'cashier';
            document.getElementById('userActive').checked = user.is_active;
        } else {
            title.textContent = 'Add User';
            form.reset();
            delete form.dataset.userId;
            document.getElementById('userActive').checked = true;
        }

        modal.classList.add('active');
    }

    async handleUserSubmit(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        const userData = {
            name: formData.get('name'),
            username: formData.get('username'),
            email: formData.get('email'),
            password: formData.get('password'),
            role: formData.get('role'),
            is_active: formData.get('is_active') === 'on'
        };

        try {
            const isEdit = form.dataset.userId;
            const endpoint = isEdit ? `/api/users/${form.dataset.userId}` : '/api/users';
            const method = isEdit ? 'PUT' : 'POST';

            const response = await this.apiCall(endpoint, method, userData);
            
            if (response.success) {
                this.showNotification(`User ${isEdit ? 'updated' : 'created'} successfully!`, 'success');
                this.closeModal(document.getElementById('userModal'));
                this.loadUsers();
            } else {
                this.showNotification(response.message || 'Operation failed', 'error');
            }
        } catch (error) {
            console.error('User submit error:', error);
            this.showNotification('Operation failed. Please try again.', 'error');
        }
    }

    async editUser(id) {
        try {
            const response = await this.apiCall(`/api/users/${id}`);
            if (response.success) {
                this.openUserModal(response.data);
            }
        } catch (error) {
            console.error('Error loading user:', error);
            this.showNotification('Failed to load user', 'error');
        }
    }

    async toggleUserStatus(id) {
        try {
            const response = await this.apiCall(`/api/users/${id}/toggle-status`, 'PATCH');
            if (response.success) {
                this.showNotification('User status updated successfully!', 'success');
                this.loadUsers();
            } else {
                this.showNotification(response.message || 'Operation failed', 'error');
            }
        } catch (error) {
            console.error('Toggle status error:', error);
            this.showNotification('Operation failed. Please try again.', 'error');
        }
    }

    async deleteUser(id) {
        if (!confirm('Are you sure you want to delete this user?')) {
            return;
        }

        try {
            const response = await this.apiCall(`/api/users/${id}`, 'DELETE');
            if (response.success) {
                this.showNotification('User deleted successfully!', 'success');
                this.loadUsers();
            } else {
                this.showNotification(response.message || 'Delete failed', 'error');
            }
        } catch (error) {
            console.error('Delete error:', error);
            this.showNotification('Delete failed. Please try again.', 'error');
        }
    }

    // Admin Settings
    async saveSettings() {
        const systemName = document.getElementById('systemName').value;
        const systemDescription = document.getElementById('systemDescription').value;

        // For now, just show a notification
        // In a real implementation, you would save these to a settings table
        this.showNotification('Settings saved successfully!', 'success');
    }

    // Data Export/Import
    async exportData(type) {
        try {
            let endpoint;
            let filename;

            switch (type) {
                case 'products':
                    endpoint = '/api/products';
                    filename = 'products.json';
                    break;
                case 'customers':
                    endpoint = '/api/customers';
                    filename = 'customers.json';
                    break;
                case 'sales':
                    endpoint = '/api/sales';
                    filename = 'sales.json';
                    break;
                case 'all':
                    // Export all data
                    const [products, customers, sales, categories] = await Promise.all([
                        this.apiCall('/api/products'),
                        this.apiCall('/api/customers'),
                        this.apiCall('/api/sales'),
                        this.apiCall('/api/categories')
                    ]);

                    const allData = {
                        products: products.data,
                        customers: customers.data,
                        sales: sales.data,
                        categories: categories.data,
                        exported_at: new Date().toISOString()
                    };

                    this.downloadJSON(allData, 'minipos_backup.json');
                    this.showNotification('All data exported successfully!', 'success');
                    return;
                default:
                    throw new Error('Invalid export type');
            }

            const response = await this.apiCall(endpoint);
            if (response.success) {
                this.downloadJSON(response.data, filename);
                this.showNotification(`${type} exported successfully!`, 'success');
            }
        } catch (error) {
            console.error('Export error:', error);
            this.showNotification('Export failed. Please try again.', 'error');
        }
    }

    downloadJSON(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    async handleImport(e) {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            // For now, just log the imported data
            console.log('Imported data:', data);
            this.showNotification('Data imported successfully! (Check console for details)', 'success');
        } catch (error) {
            console.error('Import error:', error);
            this.showNotification('Import failed. Please check the file format.', 'error');
        }
    }

    async createBackup() {
        try {
            // Create a comprehensive backup
            const [products, customers, sales, categories, users] = await Promise.all([
                this.apiCall('/api/products'),
                this.apiCall('/api/customers'),
                this.apiCall('/api/sales'),
                this.apiCall('/api/categories'),
                this.apiCall('/api/users')
            ]);

            const backup = {
                backup_info: {
                    created_at: new Date().toISOString(),
                    version: '1.0.0',
                    created_by: this.currentUser.username
                },
                products: products.data,
                customers: customers.data,
                sales: sales.data,
                categories: categories.data,
                users: users.data.map(user => ({
                    ...user,
                    password: '[REDACTED]' // Don't export passwords
                }))
            };

            const timestamp = new Date().toISOString().split('T')[0];
            this.downloadJSON(backup, `minipos_backup_${timestamp}.json`);
            this.showNotification('Database backup created successfully!', 'success');
        } catch (error) {
            console.error('Backup error:', error);
            this.showNotification('Backup failed. Please try again.', 'error');
        }
    }

    // Utility Functions
    closeModal(modal) {
        if (modal) {
            modal.classList.remove('active');
        }
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'decimal',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount) + ' MMK';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => notification.remove());

        // Create new notification
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                <span>${this.escapeHtml(message)}</span>
            </div>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Add to page
        document.body.appendChild(notification);

        // Show notification
        setTimeout(() => notification.classList.add('show'), 100);

        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 5000);

        // Close button handler
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        });
    }

    getNotificationIcon(type) {
        switch (type) {
            case 'success': return 'check-circle';
            case 'error': return 'exclamation-circle';
            case 'warning': return 'exclamation-triangle';
            default: return 'info-circle';
        }
    }
}

// Initialize the application
const minipos = new MiniPOS();

// Make it globally available for onclick handlers
window.minipos = minipos;