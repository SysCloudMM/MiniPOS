// MiniPOS Application JavaScript

// Global variables
let currentUser = null;
let authToken = null;
let cart = [];
let products = [];
let categories = [];
let customers = [];
let currentSection = 'pos';

// Payment methods management
let paymentMethods = [
    { id: 1, name: 'Cash', type: 'cash', description: 'Physical cash payment', enabled: true, default: true },
    { id: 2, name: 'Credit/Debit Card', type: 'card', description: 'Card payment via terminal', enabled: true, default: true },
    { id: 3, name: 'Digital Payment', type: 'digital', description: 'Mobile payment apps', enabled: true, default: true }
];
let nextPaymentMethodId = 4;

// Pagination variables
let currentPage = 1;
const itemsPerPage = 10;

// API Base URL
const API_BASE = '/api';

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Check if user is already logged in
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('currentUser');
    
    if (token && user) {
        authToken = token;
        currentUser = JSON.parse(user);
        showDashboard();
    } else {
        showLogin();
    }
    
    // Setup event listeners
    setupEventListeners();
}

function setupEventListeners() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Sidebar toggle
    const sidebarToggle = document.getElementById('sidebarToggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', toggleSidebar);
    }
    
    // Navigation links
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', handleNavigation);
    });
    
    // Modal close buttons
    const modalCloses = document.querySelectorAll('.modal-close, .modal-cancel');
    modalCloses.forEach(btn => {
        btn.addEventListener('click', closeModal);
    });
    
    // Modal backdrop clicks
    const modalBackdrops = document.querySelectorAll('.modal-backdrop');
    modalBackdrops.forEach(backdrop => {
        backdrop.addEventListener('click', closeModal);
    });
    
    // Product search
    const productSearch = document.getElementById('productSearch');
    if (productSearch) {
        productSearch.addEventListener('input', debounce(searchProducts, 300));
    }
    
    // Cart actions
    const clearCartBtn = document.getElementById('clearCart');
    if (clearCartBtn) {
        clearCartBtn.addEventListener('click', clearCart);
    }
    
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', processCheckout);
    }
    
    // Add buttons
    const addProductBtn = document.getElementById('addProductBtn');
    if (addProductBtn) {
        addProductBtn.addEventListener('click', () => openProductModal());
    }
    
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    if (addCategoryBtn) {
        addCategoryBtn.addEventListener('click', () => openCategoryModal());
    }
    
    const addCustomerBtn = document.getElementById('addCustomerBtn');
    if (addCustomerBtn) {
        addCustomerBtn.addEventListener('click', () => openCustomerModal());
    }
    
    const addUserBtn = document.getElementById('addUserBtn');
    if (addUserBtn) {
        addUserBtn.addEventListener('click', () => openUserModal());
    }
    
    // Payment method form
    const addPaymentMethodForm = document.getElementById('addPaymentMethodForm');
    if (addPaymentMethodForm) {
        addPaymentMethodForm.addEventListener('submit', handleAddPaymentMethod);
    }
    
    // Form submissions
    const productForm = document.getElementById('productForm');
    if (productForm) {
        productForm.addEventListener('submit', handleProductSubmit);
    }
    
    const categoryForm = document.getElementById('categoryForm');
    if (categoryForm) {
        categoryForm.addEventListener('submit', handleCategorySubmit);
    }
    
    const customerForm = document.getElementById('customerForm');
    if (customerForm) {
        customerForm.addEventListener('submit', handleCustomerSubmit);
    }
    
    const userForm = document.getElementById('userForm');
    if (userForm) {
        userForm.addEventListener('submit', handleUserSubmit);
    }
    
    // Admin panel buttons
    const viewUsersBtn = document.getElementById('viewUsersBtn');
    if (viewUsersBtn) {
        viewUsersBtn.addEventListener('click', toggleUsersList);
    }
    
    const refreshStatsBtn = document.getElementById('refreshStatsBtn');
    if (refreshStatsBtn) {
        refreshStatsBtn.addEventListener('click', refreshSystemStats);
    }
    
    // Pagination buttons
    setupPaginationListeners();
}

function setupPaginationListeners() {
    // POS pagination
    const posPrevBtn = document.getElementById('posPrevBtn');
    const posNextBtn = document.getElementById('posNextBtn');
    if (posPrevBtn) posPrevBtn.addEventListener('click', () => changePage('pos', -1));
    if (posNextBtn) posNextBtn.addEventListener('click', () => changePage('pos', 1));
    
    // Products pagination
    const productsPrevBtn = document.getElementById('productsPrevBtn');
    const productsNextBtn = document.getElementById('productsNextBtn');
    if (productsPrevBtn) productsPrevBtn.addEventListener('click', () => changePage('products', -1));
    if (productsNextBtn) productsNextBtn.addEventListener('click', () => changePage('products', 1));
    
    // Categories pagination
    const categoriesPrevBtn = document.getElementById('categoriesPrevBtn');
    const categoriesNextBtn = document.getElementById('categoriesNextBtn');
    if (categoriesPrevBtn) categoriesPrevBtn.addEventListener('click', () => changePage('categories', -1));
    if (categoriesNextBtn) categoriesNextBtn.addEventListener('click', () => changePage('categories', 1));
}

// Authentication functions
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            authToken = data.data.token;
            currentUser = data.data.user;
            
            // Store in localStorage
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            showDashboard();
            showNotification('Login successful!', 'success');
        } else {
            showNotification(data.message || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Login failed. Please try again.', 'error');
    }
}

function handleLogout() {
    authToken = null;
    currentUser = null;
    cart = [];
    
    // Clear localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    
    showLogin();
    showNotification('Logged out successfully', 'info');
}

// Screen management
function showLogin() {
    document.getElementById('loginScreen').classList.add('active');
    document.getElementById('dashboardScreen').classList.remove('active');
}

function showDashboard() {
    document.getElementById('loginScreen').classList.remove('active');
    document.getElementById('dashboardScreen').classList.add('active');
    
    // Update user info
    const userInfo = document.getElementById('userInfo');
    if (userInfo && currentUser) {
        userInfo.textContent = `Welcome, ${currentUser.name}`;
    }
    
    // Show/hide admin navigation based on role
    const adminNavLink = document.querySelector('.admin-nav-link');
    if (adminNavLink && currentUser) {
        if (currentUser.role === 'admin' || currentUser.role === 'manager') {
            adminNavLink.classList.add('visible');
        } else {
            adminNavLink.classList.remove('visible');
        }
    }
    
    // Load initial data
    loadInitialData();
    
    // Initialize payment methods
    updatePaymentMethodDropdown();
}

// Navigation
function handleNavigation(e) {
    e.preventDefault();
    
    const section = e.currentTarget.getAttribute('data-section');
    if (section) {
        showSection(section);
    }
}

function showSection(sectionName) {
    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    const activeLink = document.querySelector(`[data-section="${sectionName}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
    
    // Update active section
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    const activeSection = document.getElementById(`${sectionName}Section`);
    if (activeSection) {
        activeSection.classList.add('active');
    }
    
    currentSection = sectionName;
    
    // Load section-specific data
    loadSectionData(sectionName);
    
    // Close sidebar on mobile
    if (window.innerWidth <= 768) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.remove('open');
        }
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('open');
    }
}

// Data loading functions
async function loadInitialData() {
    try {
        await Promise.all([
            loadProducts(),
            loadCategories(),
            loadCustomers()
        ]);
        
        // Load current section data
        loadSectionData(currentSection);
    } catch (error) {
        console.error('Error loading initial data:', error);
        showNotification('Error loading data', 'error');
    }
}

async function loadSectionData(section) {
    switch (section) {
        case 'pos':
            displayPOSProducts();
            break;
        case 'products':
            displayProducts();
            break;
        case 'categories':
            displayCategories();
            break;
        case 'customers':
            displayCustomers();
            break;
        case 'sales':
            loadSales();
            break;
        case 'reports':
            loadReports();
            break;
        case 'admin':
            if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'manager')) {
                loadAdminData();
            }
            break;
    }
}

// API helper function
async function apiRequest(endpoint, options = {}) {
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(authToken && { 'Authorization': `Bearer ${authToken}` })
        },
        ...options
    };
    
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.message || 'API request failed');
    }
    
    return data;
}

// Products functions
async function loadProducts() {
    try {
        const data = await apiRequest('/products');
        products = data.data || [];
    } catch (error) {
        console.error('Error loading products:', error);
        showNotification('Error loading products', 'error');
    }
}

function displayPOSProducts(filteredProducts = null) {
    const productGrid = document.getElementById('productGrid');
    if (!productGrid) return;
    
    const productsToShow = filteredProducts || products;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedProducts = productsToShow.slice(startIndex, endIndex);
    
    if (paginatedProducts.length === 0) {
        productGrid.innerHTML = `
            <div class="no-products">
                <i class="fas fa-box-open"></i>
                <p>No products found</p>
                <span>Add products to start selling</span>
            </div>
        `;
    } else {
        productGrid.innerHTML = paginatedProducts.map(product => `
            <div class="product-card" onclick="addToCart(${product.id})">
                <h4>${product.name}</h4>
                <p class="price">${formatCurrency(product.price)}</p>
                <small>Stock: ${product.stock_quantity}</small>
            </div>
        `).join('');
    }
    
    updatePagination('pos', productsToShow.length);
}

function displayProducts() {
    const productsTable = document.getElementById('productsTable');
    if (!productsTable) return;
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedProducts = products.slice(startIndex, endIndex);
    
    productsTable.innerHTML = paginatedProducts.map(product => `
        <tr>
            <td>
                <div>
                    <strong>${product.name}</strong>
                    ${product.barcode ? `<br><small>Barcode: ${product.barcode}</small>` : ''}
                </div>
            </td>
            <td>${formatCurrency(product.price)}</td>
            <td>
                <span class="${product.stock_quantity <= product.min_stock ? 'text-danger' : ''}">${product.stock_quantity}</span>
                ${product.stock_quantity <= product.min_stock ? '<i class="fas fa-exclamation-triangle text-warning"></i>' : ''}
            </td>
            <td>${product.category_name || 'N/A'}</td>
            <td>
                <button class="btn btn-sm btn-outline" onclick="editProduct(${product.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteProduct(${product.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
    
    updatePagination('products', products.length);
}

// Categories functions
async function loadCategories() {
    try {
        const data = await apiRequest('/categories');
        categories = data.data || [];
        
        // Update category dropdown in product form
        updateCategoryDropdown();
    } catch (error) {
        console.error('Error loading categories:', error);
        showNotification('Error loading categories', 'error');
    }
}

function displayCategories() {
    const categoriesTable = document.getElementById('categoriesTable');
    if (!categoriesTable) return;
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedCategories = categories.slice(startIndex, endIndex);
    
    categoriesTable.innerHTML = paginatedCategories.map(category => `
        <tr>
            <td><strong>${category.name}</strong></td>
            <td>${category.description || 'N/A'}</td>
            <td>
                <button class="btn btn-sm btn-outline" onclick="editCategory(${category.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteCategory(${category.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
    
    updatePagination('categories', categories.length);
}

function updateCategoryDropdown() {
    const categorySelect = document.getElementById('productCategory');
    if (!categorySelect) return;
    
    categorySelect.innerHTML = '<option value="">Select Category</option>' +
        categories.map(category => `<option value="${category.id}">${category.name}</option>`).join('');
}

// Customers functions
async function loadCustomers() {
    try {
        const data = await apiRequest('/customers');
        customers = data.data || [];
    } catch (error) {
        console.error('Error loading customers:', error);
        showNotification('Error loading customers', 'error');
    }
}

function displayCustomers() {
    const customersTable = document.getElementById('customersTable');
    if (!customersTable) return;
    
    customersTable.innerHTML = customers.map(customer => `
        <tr>
            <td><strong>${customer.name}</strong></td>
            <td>${customer.email || 'N/A'}</td>
            <td>${customer.phone || 'N/A'}</td>
            <td>
                <button class="btn btn-sm btn-outline" onclick="editCustomer(${customer.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteCustomer(${customer.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Cart functions
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    if (product.stock_quantity <= 0) {
        showNotification('Product is out of stock', 'error');
        return;
    }
    
    const existingItem = cart.find(item => item.product_id === productId);
    
    if (existingItem) {
        if (existingItem.quantity >= product.stock_quantity) {
            showNotification('Cannot add more items than available stock', 'error');
            return;
        }
        existingItem.quantity += 1;
    } else {
        cart.push({
            product_id: productId,
            name: product.name,
            price: product.price,
            quantity: 1
        });
    }
    
    updateCartDisplay();
    showNotification(`${product.name} added to cart`, 'success');
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.product_id !== productId);
    updateCartDisplay();
}

// Payment method functions
function updatePaymentMethodDropdown() {
    const paymentMethodSelect = document.getElementById('paymentMethod');
    if (!paymentMethodSelect) return;
    
    const enabledMethods = paymentMethods.filter(method => method.enabled);
    
    paymentMethodSelect.innerHTML = enabledMethods.map(method => 
        `<option value="${method.type}">${method.name}</option>`
    ).join('');
    
    // Set default selection to cash if available
    const defaultMethod = enabledMethods.find(method => method.type === 'cash');
    if (defaultMethod) {
        paymentMethodSelect.value = defaultMethod.type;
    }
}

function handlePaymentMethodChange() {
    const paymentMethodSelect = document.getElementById('paymentMethod');
    const selectedMethod = paymentMethods.find(method => 
        method.type === paymentMethodSelect.value && method.enabled
    );
    
    if (selectedMethod) {
        console.log('Payment method changed to:', selectedMethod.name);
        // You can add specific logic here for different payment methods
    }
}

function openPaymentMethodSettings() {
    const modal = document.getElementById('paymentMethodModal');
    if (!modal) return;
    
    displayPaymentMethods();
    modal.classList.add('active');
}

function displayPaymentMethods() {
    const paymentMethodsList = document.getElementById('paymentMethodsList');
    if (!paymentMethodsList) return;
    
    paymentMethodsList.innerHTML = paymentMethods.map(method => `
        <div class="payment-method-item">
            <div class="payment-method-info">
                <div class="payment-method-name">${method.name}</div>
                <span class="payment-method-type">${method.type}</span>
                ${method.description ? `<div class="payment-method-description">${method.description}</div>` : ''}
            </div>
            <div class="payment-method-actions">
                <div class="payment-method-toggle">
                    <span>Enabled</span>
                    <div class="toggle-switch ${method.enabled ? 'active' : ''}" 
                         onclick="togglePaymentMethod(${method.id})" 
                         ${method.default ? 'title="Default payment methods cannot be disabled"' : ''}>
                    </div>
                </div>
                ${!method.default ? `
                    <button class="btn btn-sm btn-danger" onclick="deletePaymentMethod(${method.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

function togglePaymentMethod(methodId) {
    const method = paymentMethods.find(m => m.id === methodId);
    if (!method || method.default) return; // Can't disable default methods
    
    method.enabled = !method.enabled;
    displayPaymentMethods();
    updatePaymentMethodDropdown();
    
    showNotification(
        `Payment method "${method.name}" ${method.enabled ? 'enabled' : 'disabled'}`,
        'success'
    );
}

function deletePaymentMethod(methodId) {
    const method = paymentMethods.find(m => m.id === methodId);
    if (!method || method.default) return; // Can't delete default methods
    
    if (!confirm(`Are you sure you want to delete the payment method "${method.name}"?`)) return;
    
    paymentMethods = paymentMethods.filter(m => m.id !== methodId);
    displayPaymentMethods();
    updatePaymentMethodDropdown();
    
    showNotification(`Payment method "${method.name}" deleted successfully`, 'success');
}

async function handleAddPaymentMethod(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    
    const name = document.getElementById('newPaymentMethodName').value.trim();
    const type = document.getElementById('newPaymentMethodType').value;
    const description = document.getElementById('newPaymentMethodDescription').value.trim();
    
    if (!name || !type) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    // Check if payment method name already exists
    const existingMethod = paymentMethods.find(method => 
        method.name.toLowerCase() === name.toLowerCase()
    );
    
    if (existingMethod) {
        showNotification('A payment method with this name already exists', 'error');
        return;
    }
    
    // Add new payment method
    const newMethod = {
        id: nextPaymentMethodId++,
        name: name,
        type: type,
        description: description,
        enabled: true,
        default: false
    };
    
    paymentMethods.push(newMethod);
    
    // Reset form
    form.reset();
    
    // Update displays
    displayPaymentMethods();
    updatePaymentMethodDropdown();
    
    showNotification(`Payment method "${name}" added successfully`, 'success');
}

function updateCartQuantity(productId, change) {
    const item = cart.find(item => item.product_id === productId);
    if (!item) return;
    
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const newQuantity = item.quantity + change;
    
    if (newQuantity <= 0) {
        removeFromCart(productId);
    } else if (newQuantity <= product.stock_quantity) {
        item.quantity = newQuantity;
        updateCartDisplay();
    } else {
        showNotification('Cannot exceed available stock', 'error');
    }
}

function updateCartDisplay() {
    const cartItems = document.getElementById('cartItems');
    const subtotalEl = document.getElementById('subtotal');
    const taxEl = document.getElementById('tax');
    const totalEl = document.getElementById('total');
    
    if (!cartItems) return;
    
    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <p>No items in cart</p>
                <span>Add products to start a sale</span>
            </div>
        `;
    } else {
        cartItems.innerHTML = cart.map(item => `
            <div class="cart-item">
                <div class="item-info">
                    <h5>${item.name}</h5>
                    <div class="item-price">${formatCurrency(item.price)} × ${item.quantity}</div>
                </div>
                <div class="item-controls">
                    <button class="qty-btn" onclick="updateCartQuantity(${item.product_id}, -1)">-</button>
                    <span>${item.quantity}</span>
                    <button class="qty-btn" onclick="updateCartQuantity(${item.product_id}, 1)">+</button>
                    <button class="qty-btn" onclick="removeFromCart(${item.product_id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    // Calculate totals
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.05; // 5% tax
    const total = subtotal + tax;
    
    if (subtotalEl) subtotalEl.textContent = formatCurrency(subtotal);
    if (taxEl) taxEl.textContent = formatCurrency(tax);
    if (totalEl) totalEl.textContent = formatCurrency(total);
}

function clearCart() {
    cart = [];
    updateCartDisplay();
    showNotification('Cart cleared', 'info');
}

// Checkout function
async function processCheckout() {
    if (cart.length === 0) {
        showNotification('Cart is empty', 'error');
        return;
    }
    
    const paymentMethod = document.getElementById('paymentMethod').value;
    
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.05;
    
    const saleData = {
        customer_id: null, // For now, no customer selection
        items: cart.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.price
        })),
        discount_amount: 0,
        tax_amount: tax,
        payment_method: paymentMethod
    };
    
    try {
        const data = await apiRequest('/sales', {
            method: 'POST',
            body: JSON.stringify(saleData)
        });
        
        if (data.success) {
            showNotification('Sale completed successfully!', 'success');
            clearCart();
            
            // Reload products to update stock
            await loadProducts();
            displayPOSProducts();
        }
    } catch (error) {
        console.error('Checkout error:', error);
        showNotification('Checkout failed: ' + error.message, 'error');
    }
}

// Search function
function searchProducts() {
    const searchTerm = document.getElementById('productSearch').value.toLowerCase();
    
    if (!searchTerm) {
        displayPOSProducts();
        return;
    }
    
    const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(searchTerm) ||
        (product.barcode && product.barcode.toLowerCase().includes(searchTerm))
    );
    
    currentPage = 1; // Reset to first page
    displayPOSProducts(filteredProducts);
}

// Modal functions
function openProductModal(productId = null) {
    const modal = document.getElementById('productModal');
    const title = document.getElementById('productModalTitle');
    const form = document.getElementById('productForm');
    
    if (!modal || !form) return;
    
    if (productId) {
        const product = products.find(p => p.id === productId);
        if (product) {
            title.textContent = 'Edit Product';
            form.dataset.productId = productId;
            
            // Fill form with product data
            document.getElementById('productName').value = product.name;
            document.getElementById('productBarcode').value = product.barcode || '';
            document.getElementById('productPrice').value = product.price;
            document.getElementById('productCost').value = product.cost || 0;
            document.getElementById('productStock').value = product.stock_quantity;
            document.getElementById('productMinStock').value = product.min_stock || 0;
            document.getElementById('productCategory').value = product.category_id || '';
            document.getElementById('productDescription').value = product.description || '';
        }
    } else {
        title.textContent = 'Add Product';
        form.reset();
        delete form.dataset.productId;
    }
    
    modal.classList.add('active');
}

function openCategoryModal(categoryId = null) {
    const modal = document.getElementById('categoryModal');
    const title = document.getElementById('categoryModalTitle');
    const form = document.getElementById('categoryForm');
    
    if (!modal || !form) return;
    
    if (categoryId) {
        const category = categories.find(c => c.id === categoryId);
        if (category) {
            title.textContent = 'Edit Category';
            form.dataset.categoryId = categoryId;
            
            document.getElementById('categoryName').value = category.name;
            document.getElementById('categoryDescription').value = category.description || '';
        }
    } else {
        title.textContent = 'Add Category';
        form.reset();
        delete form.dataset.categoryId;
    }
    
    modal.classList.add('active');
}

function openCustomerModal(customerId = null) {
    const modal = document.getElementById('customerModal');
    const title = document.getElementById('customerModalTitle');
    const form = document.getElementById('customerForm');
    
    if (!modal || !form) return;
    
    if (customerId) {
        const customer = customers.find(c => c.id === customerId);
        if (customer) {
            title.textContent = 'Edit Customer';
            form.dataset.customerId = customerId;
            
            document.getElementById('customerName').value = customer.name;
            document.getElementById('customerEmail').value = customer.email || '';
            document.getElementById('customerPhone').value = customer.phone || '';
            document.getElementById('customerAddress').value = customer.address || '';
        }
    } else {
        title.textContent = 'Add Customer';
        form.reset();
        delete form.dataset.customerId;
    }
    
    modal.classList.add('active');
}

function openUserModal(userId = null) {
    const modal = document.getElementById('userModal');
    const title = document.getElementById('userModalTitle');
    const form = document.getElementById('userForm');
    
    if (!modal || !form) return;
    
    if (userId) {
        // Load user data for editing
        title.textContent = 'Edit User';
        form.dataset.userId = userId;
        // TODO: Load user data
    } else {
        title.textContent = 'Add User';
        form.reset();
        delete form.dataset.userId;
    }
    
    modal.classList.add('active');
}

function closeModal() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
}

// Form submission handlers
async function handleProductSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    const productData = Object.fromEntries(formData.entries());
    
    // Convert numeric fields
    productData.price = parseFloat(productData.price);
    productData.cost = parseFloat(productData.cost) || 0;
    productData.stock_quantity = parseInt(productData.stock_quantity);
    productData.min_stock = parseInt(productData.min_stock) || 0;
    productData.category_id = parseInt(productData.category_id) || null;
    
    try {
        const isEdit = form.dataset.productId;
        const endpoint = isEdit ? `/products/${form.dataset.productId}` : '/products';
        const method = isEdit ? 'PUT' : 'POST';
        
        const data = await apiRequest(endpoint, {
            method,
            body: JSON.stringify(productData)
        });
        
        if (data.success) {
            showNotification(`Product ${isEdit ? 'updated' : 'created'} successfully!`, 'success');
            closeModal();
            await loadProducts();
            displayProducts();
            displayPOSProducts();
        }
    } catch (error) {
        console.error('Product submit error:', error);
        showNotification('Error saving product: ' + error.message, 'error');
    }
}

async function handleCategorySubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    const categoryData = Object.fromEntries(formData.entries());
    
    try {
        const isEdit = form.dataset.categoryId;
        const endpoint = isEdit ? `/categories/${form.dataset.categoryId}` : '/categories';
        const method = isEdit ? 'PUT' : 'POST';
        
        const data = await apiRequest(endpoint, {
            method,
            body: JSON.stringify(categoryData)
        });
        
        if (data.success) {
            showNotification(`Category ${isEdit ? 'updated' : 'created'} successfully!`, 'success');
            closeModal();
            await loadCategories();
            displayCategories();
        }
    } catch (error) {
        console.error('Category submit error:', error);
        showNotification('Error saving category: ' + error.message, 'error');
    }
}

async function handleCustomerSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    const customerData = Object.fromEntries(formData.entries());
    
    try {
        const isEdit = form.dataset.customerId;
        const endpoint = isEdit ? `/customers/${form.dataset.customerId}` : '/customers';
        const method = isEdit ? 'PUT' : 'POST';
        
        const data = await apiRequest(endpoint, {
            method,
            body: JSON.stringify(customerData)
        });
        
        if (data.success) {
            showNotification(`Customer ${isEdit ? 'updated' : 'created'} successfully!`, 'success');
            closeModal();
            await loadCustomers();
            displayCustomers();
        }
    } catch (error) {
        console.error('Customer submit error:', error);
        showNotification('Error saving customer: ' + error.message, 'error');
    }
}

async function handleUserSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    const userData = Object.fromEntries(formData.entries());
    
    // Convert checkbox
    userData.is_active = form.querySelector('#userActive').checked;
    
    try {
        const isEdit = form.dataset.userId;
        const endpoint = isEdit ? `/users/${form.dataset.userId}` : '/users';
        const method = isEdit ? 'PUT' : 'POST';
        
        const data = await apiRequest(endpoint, {
            method,
            body: JSON.stringify(userData)
        });
        
        if (data.success) {
            showNotification(`User ${isEdit ? 'updated' : 'created'} successfully!`, 'success');
            closeModal();
            loadAdminData();
        }
    } catch (error) {
        console.error('User submit error:', error);
        showNotification('Error saving user: ' + error.message, 'error');
    }
}

// Edit functions
function editProduct(productId) {
    openProductModal(productId);
}

function editCategory(categoryId) {
    openCategoryModal(categoryId);
}

function editCustomer(customerId) {
    openCustomerModal(customerId);
}

// Delete functions
async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
        const data = await apiRequest(`/products/${productId}`, { method: 'DELETE' });
        
        if (data.success) {
            showNotification('Product deleted successfully!', 'success');
            await loadProducts();
            displayProducts();
            displayPOSProducts();
        }
    } catch (error) {
        console.error('Delete product error:', error);
        showNotification('Error deleting product: ' + error.message, 'error');
    }
}

async function deleteCategory(categoryId) {
    if (!confirm('Are you sure you want to delete this category?')) return;
    
    try {
        const data = await apiRequest(`/categories/${categoryId}`, { method: 'DELETE' });
        
        if (data.success) {
            showNotification('Category deleted successfully!', 'success');
            await loadCategories();
            displayCategories();
        }
    } catch (error) {
        console.error('Delete category error:', error);
        showNotification('Error deleting category: ' + error.message, 'error');
    }
}

async function deleteCustomer(customerId) {
    if (!confirm('Are you sure you want to delete this customer?')) return;
    
    try {
        const data = await apiRequest(`/customers/${customerId}`, { method: 'DELETE' });
        
        if (data.success) {
            showNotification('Customer deleted successfully!', 'success');
            await loadCustomers();
            displayCustomers();
        }
    } catch (error) {
        console.error('Delete customer error:', error);
        showNotification('Error deleting customer: ' + error.message, 'error');
    }
}

// Sales functions
async function loadSales() {
    try {
        const data = await apiRequest('/sales');
        const sales = data.data || [];
        displaySales(sales);
    } catch (error) {
        console.error('Error loading sales:', error);
        showNotification('Error loading sales', 'error');
    }
}

function displaySales(sales) {
    const salesTable = document.getElementById('salesTable');
    if (!salesTable) return;
    
    salesTable.innerHTML = sales.map(sale => `
        <tr>
            <td>${new Date(sale.created_at).toLocaleDateString()}</td>
            <td>${sale.customer_name || 'Walk-in'}</td>
            <td>${formatCurrency(sale.final_amount)}</td>
            <td class="text-capitalize">${sale.payment_method}</td>
            <td><span class="status-badge status-${sale.status}">${sale.status}</span></td>
            <td>
                <button class="btn btn-sm btn-outline" onclick="viewSale(${sale.id})">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Reports functions
async function loadReports() {
    try {
        const [salesSummary, topProducts] = await Promise.all([
            apiRequest('/reports/sales-summary'),
            apiRequest('/reports/top-products?limit=5')
        ]);
        
        displaySalesSummary(salesSummary.data);
        displayTopProducts(topProducts.data);
    } catch (error) {
        console.error('Error loading reports:', error);
        showNotification('Error loading reports', 'error');
    }
}

function displaySalesSummary(summary) {
    const summaryEl = document.getElementById('salesSummary');
    if (!summaryEl) return;
    
    summaryEl.innerHTML = `
        <div class="summary-stats">
            <div class="stat-item">
                <h4>Total Sales</h4>
                <p>${summary.total_sales || 0}</p>
            </div>
            <div class="stat-item">
                <h4>Revenue</h4>
                <p>${formatCurrency(summary.total_revenue || 0)}</p>
            </div>
            <div class="stat-item">
                <h4>Average Sale</h4>
                <p>${formatCurrency(summary.average_sale || 0)}</p>
            </div>
        </div>
    `;
}

function displayTopProducts(topProducts) {
    const topProductsEl = document.getElementById('topProducts');
    if (!topProductsEl) return;
    
    if (!topProducts || topProducts.length === 0) {
        topProductsEl.innerHTML = '<p class="text-center text-muted">No sales data available</p>';
        return;
    }
    
    topProductsEl.innerHTML = `
        <div class="top-products-list">
            ${topProducts.map((product, index) => `
                <div class="product-item">
                    <div class="rank">${index + 1}</div>
                    <div class="name">${product.name}</div>
                    <div class="quantity">${product.total_quantity} sold</div>
                </div>
            `).join('')}
        </div>
    `;
}

// Admin functions
async function loadAdminData() {
    if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'manager')) {
        refreshSystemStats();
    }
}

function toggleUsersList() {
    const usersList = document.getElementById('usersList');
    const btn = document.getElementById('viewUsersBtn');
    
    if (!usersList || !btn) return;
    
    if (usersList.classList.contains('hidden')) {
        usersList.classList.remove('hidden');
        btn.innerHTML = '<i class="fas fa-eye-slash"></i> Hide Users';
        loadUsers();
    } else {
        usersList.classList.add('hidden');
        btn.innerHTML = '<i class="fas fa-list"></i> View All Users';
    }
}

async function loadUsers() {
    try {
        const data = await apiRequest('/users');
        const users = data.data || [];
        displayUsers(users);
    } catch (error) {
        console.error('Error loading users:', error);
        showNotification('Error loading users', 'error');
    }
}

function displayUsers(users) {
    const usersTable = document.getElementById('usersTable');
    if (!usersTable) return;
    
    usersTable.innerHTML = users.map(user => `
        <tr>
            <td><strong>${user.name}</strong></td>
            <td>${user.username}</td>
            <td><span class="role-badge role-${user.role}">${user.role}</span></td>
            <td><span class="status-badge status-${user.is_active ? 'active' : 'inactive'}">${user.is_active ? 'Active' : 'Inactive'}</span></td>
            <td>
                <button class="btn btn-sm btn-outline" onclick="editUser(${user.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm ${user.is_active ? 'btn-warning' : 'btn-success'}" onclick="toggleUserStatus(${user.id})">
                    <i class="fas fa-${user.is_active ? 'ban' : 'check'}"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function editUser(userId) {
    openUserModal(userId);
}

async function toggleUserStatus(userId) {
    try {
        const data = await apiRequest(`/users/${userId}/toggle-status`, { method: 'PATCH' });
        
        if (data.success) {
            showNotification('User status updated successfully!', 'success');
            loadUsers();
        }
    } catch (error) {
        console.error('Toggle user status error:', error);
        showNotification('Error updating user status: ' + error.message, 'error');
    }
}

async function refreshSystemStats() {
    try {
        const [productsData, customersData, salesData, usersData] = await Promise.all([
            apiRequest('/products'),
            apiRequest('/customers'),
            apiRequest('/sales'),
            currentUser.role === 'admin' ? apiRequest('/users') : Promise.resolve({ data: [] })
        ]);
        
        document.getElementById('totalProducts').textContent = productsData.data?.length || 0;
        document.getElementById('totalCustomers').textContent = customersData.data?.length || 0;
        document.getElementById('totalSales').textContent = salesData.data?.length || 0;
        document.getElementById('totalUsers').textContent = usersData.data?.length || 0;
    } catch (error) {
        console.error('Error refreshing stats:', error);
        showNotification('Error refreshing statistics', 'error');
    }
}

// Pagination functions
function changePage(section, direction) {
    const newPage = currentPage + direction;
    let totalItems = 0;
    
    switch (section) {
        case 'pos':
            totalItems = products.length;
            break;
        case 'products':
            totalItems = products.length;
            break;
        case 'categories':
            totalItems = categories.length;
            break;
    }
    
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        loadSectionData(currentSection);
    }
}

function updatePagination(section, totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);
    
    const pageInfo = document.getElementById(`${section}PageInfo`);
    const prevBtn = document.getElementById(`${section}PrevBtn`);
    const nextBtn = document.getElementById(`${section}NextBtn`);
    
    if (pageInfo) {
        pageInfo.textContent = `Showing ${startItem} - ${endItem} of ${totalItems} items`;
    }
    
    if (prevBtn) {
        prevBtn.disabled = currentPage <= 1;
    }
    
    if (nextBtn) {
        nextBtn.disabled = currentPage >= totalPages;
    }
}

// Utility functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'MMK',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount).replace('MMK', '') + ' MMK';
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add to document
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 5000);
    
    // Close button functionality
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    });
}

// View sale details
function viewSale(saleId) {
    // TODO: Implement sale details modal
    showNotification('Sale details feature coming soon', 'info');
}

// Global error handler
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
    showNotification('An unexpected error occurred', 'error');
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled promise rejection:', e.reason);
    showNotification('An unexpected error occurred', 'error');
});