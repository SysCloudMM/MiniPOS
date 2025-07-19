// MiniPOS Frontend Application
class MiniPOS {
    constructor() {
        this.token = localStorage.getItem('minipos_token');
        this.user = JSON.parse(localStorage.getItem('minipos_user') || 'null');
        this.cart = [];
        this.products = [];
        this.customers = [];
        this.users = [];
        this.sales = [];
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        
        console.log('Initializing with token:', this.token);
        console.log('Initializing with user:', this.user);
        
        if (this.token && this.user) {
            this.showDashboard();
            this.loadInitialData();
        } else {
            this.showLogin();
        }
    }

    setupEventListeners() {
        // Login form
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Logout button
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.handleLogout();
        });

        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = e.target.closest('.nav-link').dataset.section;
                this.showSection(section);
            });
        });

        // POS functionality
        document.getElementById('productSearch').addEventListener('input', (e) => {
            this.searchProducts(e.target.value);
        });

        document.getElementById('clearCart').addEventListener('click', () => {
            this.clearCart();
        });

        document.getElementById('checkoutBtn').addEventListener('click', () => {
            this.processCheckout();
        });

        // Modal controls
        this.setupModalControls();

        // Form submissions
        document.getElementById('productForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleProductSubmit();
        });

        document.getElementById('customerForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCustomerSubmit();
        });

        // Phone validation
        document.getElementById('customerPhone').addEventListener('input', (e) => {
            this.handlePhoneInput(e.target.value);
        });

        document.getElementById('customerCountryCode').addEventListener('change', () => {
            const phoneInput = document.getElementById('customerPhone');
            if (phoneInput.value) {
                this.validatePhoneNumber(phoneInput.value);
            }
        });

        // Country code search functionality
        document.getElementById('customerCountryCodeSearch').addEventListener('input', (e) => {
            this.filterCountryCodes(e.target.value);
        });

        document.getElementById('customerCountryCodeSearch').addEventListener('focus', () => {
            this.showCountryDropdown();
        });

        document.getElementById('customerCountryCodeSearch').addEventListener('blur', () => {
            setTimeout(() => this.hideCountryDropdown(), 150);
        });

        // Handle country selection from dropdown
        document.getElementById('customerCountryCode').addEventListener('change', (e) => {
            this.selectCountryCode(e.target.value);
        });

        // Click outside to close dropdown
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.country-code-wrapper')) {
                this.hideCountryDropdown();
            }
        });

        // Add buttons
        document.getElementById('addProductBtn').addEventListener('click', () => {
            this.showProductModal();
        });

        document.getElementById('addCustomerBtn').addEventListener('click', () => {
            this.showCustomerModal();
        });

        document.getElementById('addUserBtn').addEventListener('click', () => {
            this.showUserModal();
        });

        // User form submission
        document.getElementById('userForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleUserSubmit();
        });
    }

    setupModalControls() {
        // Close modal buttons
        document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeModals();
            });
        });

        // Close modal on backdrop click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModals();
                }
            });
        });
    }

    // Authentication
    async handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorContainer = document.getElementById('loginError');
        
        // Clear any existing error
        if (errorContainer) {
            errorContainer.style.display = 'none';
        }

        try {
            const response = await this.apiCall('/api/auth/login', 'POST', {
                username,
                password
            });

            console.log('Login response:', response);

            if (response.success) {
                this.token = response.data.token;
                this.user = response.data.user;
                
                console.log('Login successful - User data:', this.user);
                
                localStorage.setItem('minipos_token', this.token);
                localStorage.setItem('minipos_user', JSON.stringify(this.user));
                
                this.showDashboard();
                this.loadInitialData();
            } else {
                this.showLoginError('Username or Password is wrong');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showLoginError('Username or Password is wrong');
        }
    }
    
    showLoginError(message) {
        let errorContainer = document.getElementById('loginError');
        if (!errorContainer) {
            // Create error container if it doesn't exist
            errorContainer = document.createElement('div');
            errorContainer.id = 'loginError';
            errorContainer.className = 'login-error';
            
            const form = document.getElementById('loginForm');
            form.appendChild(errorContainer);
        }
        
        errorContainer.textContent = message;
        errorContainer.style.display = 'block';
    }

    handleLogout() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('minipos_token');
        localStorage.removeItem('minipos_user');
        this.showLogin();
    }

    // Screen Management
    showLogin() {
        document.getElementById('loginScreen').classList.add('active');
        document.getElementById('dashboardScreen').classList.remove('active');
    }

    showDashboard() {
        document.getElementById('loginScreen').classList.remove('active');
        document.getElementById('dashboardScreen').classList.add('active');
        document.getElementById('userInfo').textContent = `Welcome, ${this.user.name}`;
        
        // Hide user management link for cashiers
        const userManagementLink = document.getElementById('userManagementLink');
        if (this.user.role === 'cashier') {
            userManagementLink.style.display = 'none';
        } else {
            userManagementLink.style.display = 'block';
        }
    }

    showSection(sectionName) {
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');

        // Update content sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(`${sectionName}Section`).classList.add('active');

        // Check permissions for user management
        if (sectionName === 'users') {
            if (!this.user || !['admin', 'manager'].includes(this.user.role)) {
                this.showError('You do not have permission to access User Management');
                this.showSection('pos');
                return;
            }
        }

        // Load section-specific data
        switch(sectionName) {
            case 'pos':
                this.loadProducts();
                break;
            case 'products':
                this.loadProductsTable();
                break;
            case 'customers':
                this.loadCustomersTable();
                break;
            case 'users':
                this.loadUsersTable();
                break;
            case 'sales':
                this.loadSalesTable();
                break;
            case 'reports':
                this.loadReports();
                break;
        }
    }

    // API Helper
    async apiCall(endpoint, method = 'GET', data = null) {
        const config = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (this.token) {
            config.headers['Authorization'] = `Bearer ${this.token}`;
        }

        if (data) {
            config.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(endpoint, config);
            
            // Check if response is ok
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    // Token expired or invalid, logout user
                    this.handleLogout();
                    throw new Error('Session expired. Please login again.');
                }
            }
            
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('API call error:', error);
            throw error;
        }
    }

    // Data Loading
    async loadInitialData() {
        await Promise.all([
            this.loadProducts(),
            this.loadCustomers()
        ]);
        
        // Only load users if user has admin or manager role
        if (this.user && ['admin', 'manager'].includes(this.user.role)) {
            await this.loadUsers();
        }
    }

    async loadProducts() {
        try {
            const response = await this.apiCall('/api/products');
            if (response.success) {
                this.products = response.data;
                this.renderProductGrid();
            }
        } catch (error) {
            console.error('Failed to load products:', error);
        }
    }

    async loadCustomers() {
        try {
            const response = await this.apiCall('/api/customers');
            if (response.success) {
                this.customers = response.data;
            }
        } catch (error) {
            console.error('Failed to load customers:', error);
        }
    }

    async loadUsers() {
        try {
            const response = await this.apiCall('/api/users');
            if (response.success) {
                this.users = response.data;
            }
        } catch (error) {
            console.error('Failed to load users:', error);
        }
    }

    // POS Functionality
    renderProductGrid() {
        const grid = document.getElementById('productGrid');
        grid.innerHTML = '';

        this.products.forEach(product => {
            if (product.is_active && product.stock_quantity > 0) {
                const productCard = document.createElement('div');
                productCard.className = 'product-card';
                productCard.innerHTML = `
                    <h4>${product.name}</h4>
                    <div class="price">${parseFloat(product.price).toFixed(0)} MMK</div>
                    <div class="stock">Stock: ${product.stock_quantity}</div>
                `;
                productCard.addEventListener('click', () => {
                    this.addToCart(product);
                });
                grid.appendChild(productCard);
            }
        });
    }

    searchProducts(query) {
        const grid = document.getElementById('productGrid');
        grid.innerHTML = '';

        const filteredProducts = this.products.filter(product => 
            product.is_active && 
            product.stock_quantity > 0 &&
            (product.name.toLowerCase().includes(query.toLowerCase()) ||
             (product.barcode && product.barcode.includes(query)))
        );

        filteredProducts.forEach(product => {
            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            productCard.innerHTML = `
                <h4>${product.name}</h4>
                <div class="price">${parseFloat(product.price).toFixed(0)} MMK</div>
                <div class="stock">Stock: ${product.stock_quantity}</div>
            `;
            productCard.addEventListener('click', () => {
                this.addToCart(product);
            });
            grid.appendChild(productCard);
        });
    }

    addToCart(product) {
        const existingItem = this.cart.find(item => item.product_id === product.id);
        
        if (existingItem) {
            if (existingItem.quantity < product.stock_quantity) {
                existingItem.quantity++;
            } else {
                this.showError('Not enough stock available');
                return;
            }
        } else {
            this.cart.push({
                product_id: product.id,
                name: product.name,
                price: parseFloat(product.price),
                quantity: 1,
                stock_available: product.stock_quantity
            });
        }
        
        this.renderCart();
        this.updateCartSummary();
    }

    removeFromCart(productId) {
        this.cart = this.cart.filter(item => item.product_id !== productId);
        this.renderCart();
        this.updateCartSummary();
    }

    updateQuantity(productId, change) {
        const item = this.cart.find(item => item.product_id === productId);
        if (item) {
            const newQuantity = item.quantity + change;
            if (newQuantity <= 0) {
                this.removeFromCart(productId);
            } else if (newQuantity <= item.stock_available) {
                item.quantity = newQuantity;
                this.renderCart();
                this.updateCartSummary();
            } else {
                this.showError('Not enough stock available');
            }
        }
    }

    renderCart() {
        const cartItems = document.getElementById('cartItems');
        cartItems.innerHTML = '';

        this.cart.forEach(item => {
            const cartItem = document.createElement('div');
            cartItem.className = 'cart-item';
            cartItem.innerHTML = `
                <div class="item-info">
                    <h5>${item.name}</h5>
                    <div class="item-price">${item.price.toFixed(0)} MMK each</div>
                </div>
                <div class="item-controls">
                    <button class="qty-btn" onclick="app.updateQuantity(${item.product_id}, -1)">-</button>
                    <span>${item.quantity}</span>
                    <button class="qty-btn" onclick="app.updateQuantity(${item.product_id}, 1)">+</button>
                    <button class="btn btn-danger btn-small" onclick="app.removeFromCart(${item.product_id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            cartItems.appendChild(cartItem);
        });
    }

    updateCartSummary() {
        const subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const tax = subtotal * 0.1; // 10% tax
        const total = subtotal + tax;

        document.getElementById('subtotal').textContent = `${subtotal.toFixed(0)} MMK`;
        document.getElementById('tax').textContent = `${tax.toFixed(0)} MMK`;
        document.getElementById('total').textContent = `${total.toFixed(0)} MMK`;
    }

    clearCart() {
        this.cart = [];
        this.renderCart();
        this.updateCartSummary();
    }

    async processCheckout() {
        if (this.cart.length === 0) {
            this.showError('Cart is empty');
            return;
        }

        const paymentMethod = document.getElementById('paymentMethod').value;
        const subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const tax = subtotal * 0.1;

        const saleData = {
            items: this.cart.map(item => ({
                product_id: item.product_id,
                quantity: item.quantity,
                unit_price: item.price
            })),
            discount_amount: 0,
            tax_amount: tax,
            payment_method: paymentMethod
        };

        try {
            const response = await this.apiCall('/api/sales', 'POST', saleData);
            if (response.success) {
                this.showSuccess('Sale completed successfully!');
                this.clearCart();
                await this.loadProducts(); // Refresh product stock
            } else {
                this.showError('Checkout failed: ' + response.message);
            }
        } catch (error) {
            this.showError('Checkout failed: ' + error.message);
        }
    }

    // Product Management
    async loadProductsTable() {
        try {
            const response = await this.apiCall('/api/products');
            if (response.success) {
                this.renderProductsTable(response.data);
            }
        } catch (error) {
            console.error('Failed to load products table:', error);
        }
    }

    renderProductsTable(products) {
        const tbody = document.getElementById('productsTable');
        tbody.innerHTML = '';

        products.forEach(product => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${product.name}</td>
                <td>${parseFloat(product.price).toFixed(0)} MMK</td>
                <td>${product.stock_quantity}</td>
                <td>${product.category_name || 'N/A'}</td>
                <td>
                    <button class="btn btn-small btn-outline" onclick="app.editProduct(${product.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-small btn-danger" onclick="app.deleteProduct(${product.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    showProductModal(product = null) {
        const modal = document.getElementById('productModal');
        const form = document.getElementById('productForm');
        const title = document.getElementById('productModalTitle');

        if (product) {
            title.textContent = 'Edit Product';
            document.getElementById('productName').value = product.name;
            document.getElementById('productPrice').value = product.price;
            document.getElementById('productStock').value = product.stock_quantity;
            document.getElementById('productCategory').value = product.category_id;
            form.dataset.productId = product.id;
        } else {
            title.textContent = 'Add Product';
            form.reset();
            delete form.dataset.productId;
        }

        modal.classList.add('active');
    }

    async handleProductSubmit() {
        const form = document.getElementById('productForm');
        const formData = new FormData(form);
        const productData = Object.fromEntries(formData);
        
        // Convert numeric fields
        productData.price = parseFloat(productData.price);
        productData.stock_quantity = parseInt(productData.stock_quantity);
        productData.category_id = parseInt(productData.category_id);

        try {
            let response;
            if (form.dataset.productId) {
                // Update existing product
                response = await this.apiCall(`/api/products/${form.dataset.productId}`, 'PUT', productData);
            } else {
                // Create new product
                response = await this.apiCall('/api/products', 'POST', productData);
            }

            if (response.success) {
                this.showSuccess('Product saved successfully!');
                this.closeModals();
                this.loadProductsTable();
                this.loadProducts(); // Refresh POS products
            } else {
                this.showError('Failed to save product: ' + response.message);
            }
        } catch (error) {
            this.showError('Failed to save product: ' + error.message);
        }
    }

    async editProduct(id) {
        try {
            const response = await this.apiCall(`/api/products/${id}`);
            if (response.success) {
                this.showProductModal(response.data);
            }
        } catch (error) {
            this.showError('Failed to load product: ' + error.message);
        }
    }

    async deleteProduct(id) {
        if (confirm('Are you sure you want to delete this product?')) {
            try {
                const response = await this.apiCall(`/api/products/${id}`, 'DELETE');
                if (response.success) {
                    this.showSuccess('Product deleted successfully!');
                    this.loadProductsTable();
                    this.loadProducts();
                } else {
                    this.showError('Failed to delete product: ' + response.message);
                }
            } catch (error) {
                this.showError('Failed to delete product: ' + error.message);
            }
        }
    }

    // Phone input handling with auto country detection
    handlePhoneInput(phoneNumber) {
        // Check if user typed a country code at the beginning
        if (phoneNumber.startsWith('+')) {
            const possibleCode = this.detectCountryCode(phoneNumber);
            if (possibleCode) {
                document.getElementById('customerCountryCode').value = possibleCode;
                document.getElementById('customerCountryCodeSearch').value = this.getCountryName(possibleCode);
                
                // Remove the country code from the phone input
                const numberWithoutCode = phoneNumber.replace(possibleCode, '').trim();
                document.getElementById('customerPhone').value = numberWithoutCode;
                
                this.validatePhoneNumber(numberWithoutCode);
                return;
            }
        }
        
        this.validatePhoneNumber(phoneNumber);
    }

    // Detect country code from phone input
    detectCountryCode(phoneNumber) {
        const countryCodes = [
            '+1', '+44', '+33', '+49', '+39', '+34', '+31', '+32', '+41', '+43',
            '+45', '+46', '+47', '+358', '+351', '+30', '+48', '+420', '+36',
            '+385', '+386', '+421', '+372', '+371', '+370', '+7', '+380', '+375',
            '+373', '+374', '+995', '+994', '+998', '+996', '+992', '+993',
            '+86', '+81', '+82', '+91', '+92', '+880', '+94', '+977', '+975',
            '+960', '+66', '+84', '+855', '+856', '+95', '+65', '+60', '+62',
            '+63', '+673', '+61', '+64', '+679', '+685', '+676', '+678', '+687',
            '+689', '+20', '+27', '+234', '+233', '+254', '+255', '+256', '+250',
            '+251', '+252', '+253', '+291', '+249', '+211', '+235', '+236',
            '+237', '+240', '+241', '+242', '+243', '+244', '+245', '+238',
            '+239', '+220', '+221', '+222', '+223', '+224', '+225', '+226',
            '+227', '+228', '+229', '+230', '+231', '+232', '+212', '+213',
            '+216', '+218', '+52', '+54', '+55', '+56', '+57', '+58', '+51',
            '+593', '+591', '+595', '+598', '+597', '+594', '+592', '+590',
            '+596', '+508', '+502', '+503', '+504', '+505', '+506', '+507', '+501'
        ];
        
        // Sort by length (longest first) to match longer codes first
        countryCodes.sort((a, b) => b.length - a.length);
        
        for (const code of countryCodes) {
            if (phoneNumber.startsWith(code)) {
                return code;
            }
        }
        
        return null;
    }

    // Get country name from country code
    getCountryName(countryCode) {
        const countryNames = {
            '+1': 'United States +1',
            '+44': 'United Kingdom +44',
            '+33': 'France +33',
            '+49': 'Germany +49',
            '+39': 'Italy +39',
            '+34': 'Spain +34',
            '+31': 'Netherlands +31',
            '+32': 'Belgium +32',
            '+41': 'Switzerland +41',
            '+43': 'Austria +43',
            '+45': 'Denmark +45',
            '+46': 'Sweden +46',
            '+47': 'Norway +47',
            '+358': 'Finland +358',
            '+66': 'Thailand +66',
            '+95': 'Myanmar +95',
            '+91': 'India +91',
            '+86': 'China +86',
            '+81': 'Japan +81',
            '+82': 'South Korea +82',
            '+61': 'Australia +61',
            '+64': 'New Zealand +64',
        };
        
        return countryNames[countryCode] || countryCode;
    }

    // Filter country codes based on search
    filterCountryCodes(searchTerm) {
        const select = document.getElementById('customerCountryCode');
        const options = select.querySelectorAll('option');
        
        options.forEach(option => {
            const text = option.textContent.toLowerCase();
            const value = option.value.toLowerCase();
            const matches = text.includes(searchTerm.toLowerCase()) || 
                          value.includes(searchTerm.toLowerCase());
            
            option.style.display = matches ? 'block' : 'none';
        });
        
        this.showCountryDropdown();
    }

    // Show country dropdown
    showCountryDropdown() {
        const select = document.getElementById('customerCountryCode');
        const search = document.getElementById('customerCountryCodeSearch');
        
        select.classList.add('filtered');
        const visibleOptions = select.querySelectorAll('option[style*="block"], option:not([style*="none"])');
        select.size = Math.min(8, visibleOptions.length);
        select.style.display = 'block';
    }

    // Hide country dropdown
    hideCountryDropdown() {
        const select = document.getElementById('customerCountryCode');
        const search = document.getElementById('customerCountryCodeSearch');
        
        select.classList.remove('filtered');
        select.size = 1;
        select.style.display = 'none';
        
        // Reset search if no valid selection
        const selectedOption = select.options[select.selectedIndex];
        if (selectedOption) {
            search.value = selectedOption.textContent;
        }
    }

    // Select country code
    selectCountryCode(countryCode) {
        const search = document.getElementById('customerCountryCodeSearch');
        const select = document.getElementById('customerCountryCode');
        const selectedOption = select.options[select.selectedIndex];
        
        if (selectedOption) {
            search.value = selectedOption.textContent;
        }
        
        this.hideCountryDropdown();
        
        // Validate phone number with new country code
        const phoneInput = document.getElementById('customerPhone');
        if (phoneInput.value) {
            this.validatePhoneNumber(phoneInput.value);
        }
    }

    // Phone validation
    validatePhoneNumber(phoneNumber) {
        const countryCode = document.getElementById('customerCountryCode').value;
        const phoneError = document.getElementById('phoneError');
        const phoneGroup = document.getElementById('customerPhone').closest('.form-group');
        
        // Remove existing validation classes
        phoneGroup.classList.remove('error', 'success');
        phoneError.classList.remove('show');
        
        if (!phoneNumber.trim()) {
            return true; // Empty is valid (optional field)
        }
        
        // Remove all non-digit characters for validation
        const cleanNumber = phoneNumber.replace(/\D/g, '');
        
        // Basic validation rules by country code
        const validationRules = {
            '+1': { min: 10, max: 10, pattern: /^\d{10}$/ }, // US/Canada
            '+44': { min: 10, max: 11, pattern: /^\d{10,11}$/ }, // UK
            '+33': { min: 9, max: 10, pattern: /^\d{9,10}$/ }, // France
            '+49': { min: 10, max: 12, pattern: /^\d{10,12}$/ }, // Germany
            '+39': { min: 9, max: 11, pattern: /^\d{9,11}$/ }, // Italy
            '+34': { min: 9, max: 9, pattern: /^\d{9}$/ }, // Spain
            '+31': { min: 9, max: 9, pattern: /^\d{9}$/ }, // Netherlands
            '+32': { min: 8, max: 9, pattern: /^\d{8,9}$/ }, // Belgium
            '+41': { min: 9, max: 9, pattern: /^\d{9}$/ }, // Switzerland
            '+43': { min: 10, max: 13, pattern: /^\d{10,13}$/ }, // Austria
            '+45': { min: 8, max: 8, pattern: /^\d{8}$/ }, // Denmark
            '+46': { min: 9, max: 10, pattern: /^\d{9,10}$/ }, // Sweden
            '+47': { min: 8, max: 8, pattern: /^\d{8}$/ }, // Norway
            '+358': { min: 9, max: 10, pattern: /^\d{9,10}$/ }, // Finland
            '+91': { min: 10, max: 10, pattern: /^\d{10}$/ }, // India
            '+86': { min: 11, max: 11, pattern: /^\d{11}$/ }, // China
            '+81': { min: 10, max: 11, pattern: /^\d{10,11}$/ }, // Japan
            '+82': { min: 10, max: 11, pattern: /^\d{10,11}$/ }, // South Korea
            '+61': { min: 9, max: 9, pattern: /^\d{9}$/ }, // Australia
            '+64': { min: 8, max: 9, pattern: /^\d{8,9}$/ }, // New Zealand
        };
        
        const rule = validationRules[countryCode] || { min: 7, max: 15, pattern: /^\d{7,15}$/ };
        
        let isValid = true;
        let errorMessage = '';
        
        if (cleanNumber.length < rule.min) {
            isValid = false;
            errorMessage = `Phone number too short. Minimum ${rule.min} digits required.`;
        } else if (cleanNumber.length > rule.max) {
            isValid = false;
            errorMessage = `Phone number too long. Maximum ${rule.max} digits allowed.`;
        } else if (!rule.pattern.test(cleanNumber)) {
            isValid = false;
            errorMessage = 'Invalid phone number format.';
        }
        
        if (isValid) {
            phoneGroup.classList.add('success');
        } else {
            phoneGroup.classList.add('error');
            phoneError.textContent = errorMessage;
            phoneError.classList.add('show');
        }
        
        return isValid;
    }

    formatPhoneNumber(phoneNumber, countryCode) {
        const cleanNumber = phoneNumber.replace(/\D/g, '');
        
        // Format based on country code
        switch(countryCode) {
            case '+1': // US/Canada format: (123) 456-7890
                if (cleanNumber.length === 10) {
                    return `(${cleanNumber.slice(0,3)}) ${cleanNumber.slice(3,6)}-${cleanNumber.slice(6)}`;
                }
                break;
            case '+44': // UK format: 020 1234 5678
                if (cleanNumber.length === 10) {
                    return `${cleanNumber.slice(0,3)} ${cleanNumber.slice(3,7)} ${cleanNumber.slice(7)}`;
                } else if (cleanNumber.length === 11) {
                    return `${cleanNumber.slice(0,4)} ${cleanNumber.slice(4,7)} ${cleanNumber.slice(7)}`;
                }
                break;
            case '+33': // France format: 01 23 45 67 89
                if (cleanNumber.length === 9) {
                    return `${cleanNumber.slice(0,1)} ${cleanNumber.slice(1,3)} ${cleanNumber.slice(3,5)} ${cleanNumber.slice(5,7)} ${cleanNumber.slice(7)}`;
                } else if (cleanNumber.length === 10) {
                    return `${cleanNumber.slice(0,2)} ${cleanNumber.slice(2,4)} ${cleanNumber.slice(4,6)} ${cleanNumber.slice(6,8)} ${cleanNumber.slice(8)}`;
                }
                break;
            case '+49': // Germany format: 030 12345678
                if (cleanNumber.length >= 10) {
                    return `${cleanNumber.slice(0,3)} ${cleanNumber.slice(3)}`;
                }
                break;
            default:
                // Default formatting: add spaces every 3-4 digits
                if (cleanNumber.length > 6) {
                    return cleanNumber.replace(/(\d{3})(\d{3})(\d+)/, '$1 $2 $3');
                } else if (cleanNumber.length > 3) {
                    return cleanNumber.replace(/(\d{3})(\d+)/, '$1 $2');
                }
                return cleanNumber;
        }
        
        return phoneNumber;
    }

    // Customer Management
    async loadCustomersTable() {
        try {
            const response = await this.apiCall('/api/customers');
            if (response.success) {
                this.renderCustomersTable(response.data);
            }
        } catch (error) {
            console.error('Failed to load customers table:', error);
        }
    }

    renderCustomersTable(customers) {
        const tbody = document.getElementById('customersTable');
        tbody.innerHTML = '';

        customers.forEach(customer => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${customer.name}</td>
                <td>${customer.email || 'N/A'}</td>
                <td>${customer.phone || 'N/A'}</td>
                <td>
                    <button class="btn btn-small btn-outline" onclick="app.editCustomer(${customer.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-small btn-danger" onclick="app.deleteCustomer(${customer.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    showCustomerModal(customer = null) {
        const modal = document.getElementById('customerModal');
        const form = document.getElementById('customerForm');
        const title = document.getElementById('customerModalTitle');

        if (customer) {
            title.textContent = 'Edit Customer';
            document.getElementById('customerName').value = customer.name;
            document.getElementById('customerEmail').value = customer.email || '';
            
            // Parse phone number if it exists
            if (customer.phone) {
                const phoneMatch = customer.phone.match(/^(\+\d+)\s*(.+)$/);
                if (phoneMatch) {
                    document.getElementById('customerCountryCode').value = phoneMatch[1];
                    document.getElementById('customerCountryCodeSearch').value = this.getCountryName(phoneMatch[1]);
                    document.getElementById('customerPhone').value = phoneMatch[2].replace(/\D/g, '');
                } else {
                    document.getElementById('customerCountryCode').value = '+95';
                    document.getElementById('customerCountryCodeSearch').value = 'Myanmar +95';
                    document.getElementById('customerPhone').value = customer.phone.replace(/\D/g, '');
                }
            } else {
                document.getElementById('customerCountryCode').value = '+95';
                document.getElementById('customerCountryCodeSearch').value = 'Myanmar +95';
                document.getElementById('customerPhone').value = '';
            }
            
            document.getElementById('customerAddress').value = customer.address || '';
            form.dataset.customerId = customer.id;
        } else {
            title.textContent = 'Add Customer';
            form.reset();
            document.getElementById('customerCountryCode').value = '+95';
            document.getElementById('customerCountryCodeSearch').value = 'Myanmar +95';
            delete form.dataset.customerId;
        }

        // Clear validation states
        document.querySelectorAll('.form-group').forEach(group => {
            group.classList.remove('error', 'success');
        });
        document.querySelectorAll('.error-message').forEach(error => {
            error.classList.remove('show');
        });

        modal.classList.add('active');
    }

    async handleCustomerSubmit() {
        const form = document.getElementById('customerForm');
        
        // Validate phone number before submission
        const phoneInput = document.getElementById('customerPhone');
        const countryCode = document.getElementById('customerCountryCode').value;
        
        if (phoneInput.value && !this.validatePhoneNumber(phoneInput.value)) {
            this.showError('Please enter a valid phone number');
            return;
        }
        
        // Prepare customer data
        const customerData = {
            name: document.getElementById('customerName').value,
            email: document.getElementById('customerEmail').value,
            address: document.getElementById('customerAddress').value
        };
        
        // Combine country code and phone number
        if (phoneInput.value.trim()) {
            const cleanPhone = phoneInput.value.replace(/\D/g, '');
            customerData.phone = `${countryCode} ${this.formatPhoneNumber(cleanPhone, countryCode)}`;
        } else {
            customerData.phone = '';
        }

        try {
            let response;
            if (form.dataset.customerId) {
                response = await this.apiCall(`/api/customers/${form.dataset.customerId}`, 'PUT', customerData);
            } else {
                response = await this.apiCall('/api/customers', 'POST', customerData);
            }

            if (response.success) {
                this.showSuccess('Customer saved successfully!');
                this.closeModals();
                this.loadCustomersTable();
                this.loadCustomers();
            } else {
                this.showError('Failed to save customer: ' + response.message);
            }
        } catch (error) {
            this.showError('Failed to save customer: ' + error.message);
        }
    }

    async editCustomer(id) {
        try {
            const response = await this.apiCall(`/api/customers/${id}`);
            if (response.success) {
                this.showCustomerModal(response.data);
            }
        } catch (error) {
            this.showError('Failed to load customer: ' + error.message);
        }
    }

    async deleteCustomer(id) {
        if (confirm('Are you sure you want to delete this customer?')) {
            try {
                const response = await this.apiCall(`/api/customers/${id}`, 'DELETE');
                if (response.success) {
                    this.showSuccess('Customer deleted successfully!');
                    this.loadCustomersTable();
                    this.loadCustomers();
                } else {
                    this.showError('Failed to delete customer: ' + response.message);
                }
            } catch (error) {
                this.showError('Failed to delete customer: ' + error.message);
            }
        }
    }

    // User Management
    async loadUsersTable() {
        try {
            const response = await this.apiCall('/api/users');
            if (response.success) {
                this.renderUsersTable(response.data);
            }
        } catch (error) {
            console.error('Failed to load users table:', error);
        }
    }

    renderUsersTable(users) {
        const tbody = document.getElementById('usersTable');
        tbody.innerHTML = '';

        users.forEach(user => {
            const row = document.createElement('tr');
            const statusClass = user.is_active ? 'status-completed' : 'status-cancelled';
            const statusText = user.is_active ? 'Active' : 'Disabled';
            
            row.innerHTML = `
                <td>${user.name}</td>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td><span class="role-badge role-${user.role}">${user.role}</span></td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <button class="btn btn-small btn-outline" onclick="app.editUser(${user.id})" title="Edit User">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-small ${user.is_active ? 'btn-warning' : 'btn-success'}" 
                            onclick="app.toggleUserStatus(${user.id})" 
                            title="${user.is_active ? 'Disable' : 'Enable'} User">
                        <i class="fas fa-${user.is_active ? 'ban' : 'check'}"></i>
                    </button>
                    <button class="btn btn-small btn-danger" onclick="app.deleteUser(${user.id})" title="Delete User">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    showUserModal(user = null) {
        const modal = document.getElementById('userModal');
        const form = document.getElementById('userForm');
        const title = document.getElementById('userModalTitle');
        const passwordField = document.getElementById('userPassword');

        if (user) {
            title.textContent = 'Edit User';
            document.getElementById('userName').value = user.name;
            document.getElementById('userUsername').value = user.username;
            document.getElementById('userEmail').value = user.email;
            document.getElementById('userRole').value = user.role;
            document.getElementById('userActive').checked = user.is_active;
            passwordField.removeAttribute('required');
            passwordField.placeholder = 'Leave blank to keep current password';
            form.dataset.userId = user.id;
        } else {
            title.textContent = 'Add User';
            form.reset();
            document.getElementById('userActive').checked = true;
            passwordField.setAttribute('required', 'required');
            passwordField.placeholder = '';
            delete form.dataset.userId;
        }

        modal.classList.add('active');
    }

    async handleUserSubmit() {
        const form = document.getElementById('userForm');
        const formData = new FormData(form);
        const userData = Object.fromEntries(formData);
        
        console.log('Submitting user data:', userData);
        console.log('Current token:', this.token);
        console.log('Current user:', this.user);
        
        // Convert checkbox value
        userData.is_active = document.getElementById('userActive').checked;
        
        // Remove empty password for updates
        if (form.dataset.userId && !userData.password.trim()) {
            delete userData.password;
        }

        try {
            let response;
            if (form.dataset.userId) {
                response = await this.apiCall(`/api/users/${form.dataset.userId}`, 'PUT', userData);
            } else {
                response = await this.apiCall('/api/users', 'POST', userData);
            }

            console.log('User submit response:', response);

            if (response.success) {
                this.showSuccess('User saved successfully!');
                this.closeModals();
                this.loadUsersTable();
                this.loadUsers();
            } else {
                this.showError('Failed to save user: ' + response.message);
            }
        } catch (error) {
            console.error('User submit error:', error);
            this.showError('Failed to save user: ' + error.message);
        }
    }

    async editUser(id) {
        try {
            const response = await this.apiCall(`/api/users/${id}`);
            if (response.success) {
                this.showUserModal(response.data);
            }
        } catch (error) {
            this.showError('Failed to load user: ' + error.message);
        }
    }

    async toggleUserStatus(id) {
        try {
            const response = await this.apiCall(`/api/users/${id}/toggle-status`, 'PATCH');
            if (response.success) {
                this.showSuccess(response.message);
                this.loadUsersTable();
                this.loadUsers();
            } else {
                this.showError('Failed to toggle user status: ' + response.message);
            }
        } catch (error) {
            this.showError('Failed to toggle user status: ' + error.message);
        }
    }

    async deleteUser(id) {
        if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            try {
                const response = await this.apiCall(`/api/users/${id}`, 'DELETE');
                if (response.success) {
                    this.showSuccess('User deleted successfully!');
                    this.loadUsersTable();
                    this.loadUsers();
                } else {
                    this.showError('Failed to delete user: ' + response.message);
                }
            } catch (error) {
                this.showError('Failed to delete user: ' + error.message);
            }
        }
    }

    // Sales Management
    async loadSalesTable() {
        try {
            const response = await this.apiCall('/api/sales');
            if (response.success) {
                this.renderSalesTable(response.data);
            }
        } catch (error) {
            console.error('Failed to load sales table:', error);
        }
    }

    renderSalesTable(sales) {
        const tbody = document.getElementById('salesTable');
        tbody.innerHTML = '';

        sales.forEach(sale => {
            const row = document.createElement('tr');
            const date = new Date(sale.created_at).toLocaleDateString();
            row.innerHTML = `
                <td>${date}</td>
                <td>${sale.customer_name || 'Walk-in'}</td>
                <td>${parseFloat(sale.final_amount).toFixed(0)} MMK</td>
                <td>${sale.payment_method}</td>
                <td><span class="status-badge status-${sale.status}">${sale.status}</span></td>
                <td>
                    <button class="btn btn-small btn-outline" onclick="app.viewSale(${sale.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    async viewSale(id) {
        try {
            const response = await this.apiCall(`/api/sales/${id}`);
            if (response.success) {
                // For now, just show an alert with sale details
                // In a real app, you'd show a detailed modal
                alert(`Sale #${id}\nTotal: ${parseFloat(response.data.final_amount).toFixed(0)} MMK\nItems: ${response.data.items.length}`);
            }
        } catch (error) {
            this.showError('Failed to load sale details: ' + error.message);
        }
    }

    // Reports
    async loadReports() {
        try {
            const [summaryResponse, topProductsResponse] = await Promise.all([
                this.apiCall('/api/reports/sales-summary'),
                this.apiCall('/api/reports/top-products?limit=5')
            ]);

            if (summaryResponse.success) {
                this.renderSalesSummary(summaryResponse.data);
            }

            if (topProductsResponse.success) {
                this.renderTopProducts(topProductsResponse.data);
            }
        } catch (error) {
            console.error('Failed to load reports:', error);
        }
    }

    renderSalesSummary(summary) {
        const container = document.getElementById('salesSummary');
        container.innerHTML = `
            <div class="summary-stats">
                <div class="stat">
                    <h4>Total Sales</h4>
                    <p>${summary.total_sales || 0}</p>
                </div>
                <div class="stat">
                    <h4>Total Revenue</h4>
                    <p>${parseFloat(summary.total_revenue || 0).toFixed(0)} MMK</p>
                </div>
                <div class="stat">
                    <h4>Average Sale</h4>
                    <p>${parseFloat(summary.average_sale || 0).toFixed(0)} MMK</p>
                </div>
            </div>
        `;
    }

    renderTopProducts(products) {
        const container = document.getElementById('topProducts');
        container.innerHTML = '<ul class="top-products-list">' +
            products.map(product => `
                <li>
                    <strong>${product.name}</strong><br>
                    Sold: ${product.total_quantity} units<br>
                    Revenue: ${parseFloat(product.total_revenue).toFixed(0)} MMK
                </li>
            `).join('') +
        '</ul>';
    }

    // Modal Management
    closeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    }

    // Utility Methods
    showSuccess(message) {
        // Simple alert for now - in a real app, use a toast notification
        alert('Success: ' + message);
    }

    showError(message) {
        // Simple alert for now - in a real app, use a toast notification
        alert('Error: ' + message);
    }
}

// Initialize the application
const app = new MiniPOS();