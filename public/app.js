// Global variables
let currentUser = null;
let cart = [];
let products = [];
let customers = [];
let users = [];
let categories = [];

// API Base URL
const API_BASE = '/api';

// Utility functions
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-MM', {
        style: 'currency',
        currency: 'MMK',
        minimumFractionDigits: 0
    }).format(amount).replace('MMK', '') + ' MMK';
};

const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-MM', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const showError = (message) => {
    // Create or update error message
    let errorDiv = document.getElementById('errorMessage');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = 'errorMessage';
        errorDiv.className = 'login-error';
        document.querySelector('.login-card form').appendChild(errorDiv);
    }
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    }, 5000);
};

const showAlert = (message, type = 'info') => {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#d1ecf1'};
        color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#0c5460'};
        border: 1px solid ${type === 'success' ? '#c3e6cb' : type === 'error' ? '#f5c6cb' : '#bee5eb'};
        border-radius: 6px;
        z-index: 9999;
        max-width: 300px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    `;
    alertDiv.textContent = message;
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.parentNode.removeChild(alertDiv);
        }
    }, 5000);
};

// API functions
const apiCall = async (endpoint, options = {}) => {
    const token = localStorage.getItem('token');
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        }
    };

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...defaultOptions,
        ...options,
        headers: { ...defaultOptions.headers, ...options.headers }
    });

    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.message || 'API request failed');
    }
    
    return data;
};

// Authentication
const login = async (username, password) => {
    try {
        const response = await apiCall('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });

        localStorage.setItem('token', response.data.token);
        currentUser = response.data.user;
        
        showDashboard();
        return response;
    } catch (error) {
        throw error;
    }
};

const logout = () => {
    localStorage.removeItem('token');
    currentUser = null;
    cart = [];
    showLogin();
};

const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        showLogin();
        return false;
    }

    try {
        // Validate token by making an authenticated API call
        const response = await apiCall('/products');
        
        // If we get here, token is valid, but we need to get user info
        // Try to decode the token to get user info (basic decode, not verification)
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            
            // Check if token is expired
            if (payload.exp && payload.exp * 1000 < Date.now()) {
                throw new Error('Token expired');
            }
            
            // Set current user from token payload
            currentUser = {
                id: payload.userId,
                username: payload.username,
                role: payload.role,
                name: payload.username // We'll get the full name from API if needed
            };
            
            // Try to get full user details
            try {
                const userResponse = await apiCall(`/users/${payload.userId}`);
                if (userResponse.success) {
                    currentUser.name = userResponse.data.name;
                    currentUser.email = userResponse.data.email;
                }
            } catch (userError) {
                // If we can't get user details, that's okay, we have basic info
                console.log('Could not fetch user details, using token info');
            }
        }
        
        showDashboard();
        return true;
    } catch (error) {
        console.log('Token validation failed:', error.message);
        logout();
        return false;
    }
};

// Screen management
const showScreen = (screenId) => {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
};

const showLogin = () => {
    showScreen('loginScreen');
};

const showDashboard = () => {
    showScreen('dashboardScreen');
    const userName = currentUser ? (currentUser.name || currentUser.username) : 'User';
    document.getElementById('userInfo').textContent = `Welcome, ${userName}`;
    
    // Show/hide settings based on role
    const settingsLink = document.getElementById('settingsLink');
    if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'manager')) {
        settingsLink.style.display = 'block';
    } else {
        settingsLink.style.display = 'none';
    }
    
    showSection('pos');
    loadProducts();
};

const showSection = (sectionName) => {
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
    
    // Load section-specific data
    switch(sectionName) {
        case 'products':
            loadProducts();
            break;
        case 'categories':
            loadCategories();
            break;
        case 'customers':
            loadCustomers();
            break;
        case 'settings':
            // Settings section doesn't need to load data initially
            break;
        case 'users':
            loadUsers();
            break;
        case 'sales':
            loadSales();
            break;
        case 'reports':
            loadReports();
            break;
    }
};

// Settings subsection navigation
const showSettingsSubsection = (subsection) => {
    switch(subsection) {
        case 'users':
            showSection('users');
            break;
    }
};

// Category management
const loadCategories = async () => {
    try {
        const response = await apiCall('/categories');
        categories = response.data;
        renderCategories();
        updateCategoryDropdown();
    } catch (error) {
        console.error('Failed to load categories:', error);
        showAlert('Failed to load categories: ' + error.message, 'error');
    }
};

const renderCategories = async () => {
    const tbody = document.getElementById('categoriesTable');
    tbody.innerHTML = '';
    
    categories.forEach(category => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${category.name}</td>
            <td>${category.description || 'N/A'}</td>
            <td>
                <button class="btn btn-small btn-warning" onclick="editCategory(${category.id})">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-small btn-danger" onclick="deleteCategory(${category.id})">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
};

const updateCategoryDropdown = () => {
    const categorySelect = document.getElementById('productCategory');
    if (!categorySelect) return;
    
    categorySelect.innerHTML = '';
    
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        categorySelect.appendChild(option);
    });
};

const saveCategory = async (categoryData, isEdit = false, categoryId = null) => {
    try {
        const endpoint = isEdit ? `/categories/${categoryId}` : '/categories';
        const method = isEdit ? 'PUT' : 'POST';
        
        const response = await apiCall(endpoint, {
            method,
            body: JSON.stringify(categoryData)
        });
        
        showAlert(`Category ${isEdit ? 'updated' : 'created'} successfully!`, 'success');
        closeModal('categoryModal');
        loadCategories();
    } catch (error) {
        showAlert('Failed to save category: ' + error.message, 'error');
    }
};

const editCategory = (id) => {
    const category = categories.find(c => c.id === id);
    if (!category) return;
    
    document.getElementById('categoryModalTitle').textContent = 'Edit Category';
    document.getElementById('categoryName').value = category.name;
    document.getElementById('categoryDescription').value = category.description || '';
    
    document.getElementById('categoryForm').onsubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const categoryData = {
            name: formData.get('name'),
            description: formData.get('description') || ''
        };
        saveCategory(categoryData, true, id);
    };
    
    openModal('categoryModal');
};

const deleteCategory = async (id) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    
    try {
        await apiCall(`/categories/${id}`, { method: 'DELETE' });
        showAlert('Category deleted successfully!', 'success');
        loadCategories();
    } catch (error) {
        showAlert('Failed to delete category: ' + error.message, 'error');
    }
};

// Product management
const loadProducts = async () => {
    try {
        const response = await apiCall('/products');
        products = response.data;
        renderProducts();
        renderProductGrid();
        // Load categories for dropdown
        if (categories.length === 0) {
            await loadCategories();
        }
    } catch (error) {
        console.error('Failed to load products:', error);
        showAlert('Failed to load products: ' + error.message, 'error');
    }
};

const renderProducts = () => {
    const tbody = document.getElementById('productsTable');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    products.forEach(product => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${product.name}</td>
            <td>${formatCurrency(product.price)}</td>
            <td>${product.stock_quantity}</td>
            <td>${product.category_name || 'N/A'}</td>
            <td>
                <button class="btn btn-small btn-warning" onclick="editProduct(${product.id})">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-small btn-danger" onclick="deleteProduct(${product.id})">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
};

const renderProductGrid = () => {
    const grid = document.getElementById('productGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    const activeProducts = products.filter(p => p.is_active !== false);
    
    if (activeProducts.length === 0) {
        grid.innerHTML = '<div class="no-products">No products available</div>';
        return;
    }
    
    activeProducts.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.onclick = () => addToCart(product);
        card.innerHTML = `
            <h4>${product.name}</h4>
            <div class="price">${formatCurrency(product.price)}</div>
        `;
        grid.appendChild(card);
    });
};

const saveProduct = async (productData, isEdit = false, productId = null) => {
    try {
        const endpoint = isEdit ? `/products/${productId}` : '/products';
        const method = isEdit ? 'PUT' : 'POST';
        
        const response = await apiCall(endpoint, {
            method,
            body: JSON.stringify(productData)
        });
        
        showAlert(`Product ${isEdit ? 'updated' : 'created'} successfully!`, 'success');
        closeModal('productModal');
        loadProducts();
    } catch (error) {
        showAlert('Failed to save product: ' + error.message, 'error');
    }
};

const editProduct = (id) => {
    const product = products.find(p => p.id === id);
    if (!product) return;
    
    document.getElementById('productModalTitle').textContent = 'Edit Product';
    document.getElementById('productName').value = product.name;
    document.getElementById('productDescription').value = product.description || '';
    document.getElementById('productBarcode').value = product.barcode || '';
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productCost').value = product.cost || 0;
    document.getElementById('productStock').value = product.stock_quantity;
    document.getElementById('productMinStock').value = product.min_stock || 0;
    document.getElementById('productCategory').value = product.category_id;
    
    document.getElementById('productForm').onsubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const productData = {
            name: formData.get('name'),
            description: formData.get('description') || '',
            barcode: formData.get('barcode') || '',
            price: parseFloat(formData.get('price')),
            cost: parseFloat(formData.get('cost')) || 0,
            stock_quantity: parseInt(formData.get('stock_quantity')),
            min_stock: parseInt(formData.get('min_stock')) || 0,
            category_id: parseInt(formData.get('category_id')),
            is_active: product.is_active
        };
        saveProduct(productData, true, id);
    };
    
    openModal('productModal');
};

const deleteProduct = async (id) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
        await apiCall(`/products/${id}`, { method: 'DELETE' });
        showAlert('Product deleted successfully!', 'success');
        loadProducts();
    } catch (error) {
        showAlert('Failed to delete product: ' + error.message, 'error');
    }
};

// Customer management
const loadCustomers = async () => {
    try {
        const response = await apiCall('/customers');
        customers = response.data;
        renderCustomers();
    } catch (error) {
        console.error('Failed to load customers:', error);
        showAlert('Failed to load customers: ' + error.message, 'error');
    }
};

const renderCustomers = () => {
    const tbody = document.getElementById('customersTable');
    tbody.innerHTML = '';
    
    customers.forEach(customer => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${customer.name}</td>
            <td>${customer.email || 'N/A'}</td>
            <td>${customer.phone || 'N/A'}</td>
            <td>
                <button class="btn btn-small btn-warning" onclick="editCustomer(${customer.id})">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-small btn-danger" onclick="deleteCustomer(${customer.id})">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
};

const saveCustomer = async (customerData, isEdit = false, customerId = null) => {
    try {
        const endpoint = isEdit ? `/customers/${customerId}` : '/customers';
        const method = isEdit ? 'PUT' : 'POST';
        
        const response = await apiCall(endpoint, {
            method,
            body: JSON.stringify(customerData)
        });
        
        showAlert(`Customer ${isEdit ? 'updated' : 'created'} successfully!`, 'success');
        closeModal('customerModal');
        loadCustomers();
    } catch (error) {
        showAlert('Failed to save customer: ' + error.message, 'error');
    }
};

const editCustomer = (id) => {
    const customer = customers.find(c => c.id === id);
    if (!customer) return;
    
    document.getElementById('customerModalTitle').textContent = 'Edit Customer';
    document.getElementById('customerName').value = customer.name;
    document.getElementById('customerEmail').value = customer.email || '';
    document.getElementById('customerPhone').value = customer.phone || '';
    document.getElementById('customerAddress').value = customer.address || '';
    
    document.getElementById('customerForm').onsubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const customerData = {
            name: formData.get('name'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            address: formData.get('address')
        };
        saveCustomer(customerData, true, id);
    };
    
    openModal('customerModal');
};

const deleteCustomer = async (id) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;
    
    try {
        await apiCall(`/customers/${id}`, { method: 'DELETE' });
        showAlert('Customer deleted successfully!', 'success');
        loadCustomers();
    } catch (error) {
        showAlert('Failed to delete customer: ' + error.message, 'error');
    }
};

// User management
const loadUsers = async () => {
    try {
        const response = await apiCall('/users');
        users = response.data;
        renderUsers();
    } catch (error) {
        console.error('Failed to load users:', error);
        showAlert('Failed to load users: ' + error.message, 'error');
    }
};

const renderUsers = () => {
    const tbody = document.getElementById('usersTable');
    tbody.innerHTML = '';
    
    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.name}</td>
            <td>${user.username}</td>
            <td>${user.email}</td>
            <td><span class="role-badge role-${user.role}">${user.role}</span></td>
            <td><span class="status-badge status-${user.is_active ? 'completed' : 'cancelled'}">${user.is_active ? 'Active' : 'Inactive'}</span></td>
            <td>
                <button class="btn btn-small btn-warning" onclick="editUser(${user.id})">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-small btn-danger" onclick="deleteUser(${user.id})">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
};

const saveUser = async (userData, isEdit = false, userId = null) => {
    try {
        const endpoint = isEdit ? `/users/${userId}` : '/users';
        const method = isEdit ? 'PUT' : 'POST';
        
        const response = await apiCall(endpoint, {
            method,
            body: JSON.stringify(userData)
        });
        
        showAlert(`User ${isEdit ? 'updated' : 'created'} successfully!`, 'success');
        closeModal('userModal');
        loadUsers();
    } catch (error) {
        showAlert('Failed to save user: ' + error.message, 'error');
    }
};

const editUser = (id) => {
    const user = users.find(u => u.id === id);
    if (!user) return;
    
    document.getElementById('userModalTitle').textContent = 'Edit User';
    document.getElementById('userName').value = user.name;
    document.getElementById('userUsername').value = user.username;
    document.getElementById('userEmail').value = user.email;
    document.getElementById('userPassword').value = '';
    document.getElementById('userRole').value = user.role;
    document.getElementById('userActive').value = user.is_active ? '1' : '0';
    
    // Make password field optional for editing
    const passwordField = document.getElementById('userPassword');
    passwordField.removeAttribute('required');
    passwordField.placeholder = 'Leave blank to keep current password';
    
    document.getElementById('userForm').onsubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const userData = {
            name: formData.get('name'),
            username: formData.get('username'),
            email: formData.get('email'),
            role: formData.get('role'),
            is_active: formData.get('is_active') === '1' // Convert to boolean
        };
        
        // Only include password if it's provided
        const password = formData.get('password');
        if (password && password.trim() !== '') {
            userData.password = password;
        }
        
        saveUser(userData, true, id);
    };
    
    openModal('userModal');
};

const deleteUser = async (id) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
        await apiCall(`/users/${id}`, { method: 'DELETE' });
        showAlert('User deleted successfully!', 'success');
        loadUsers();
    } catch (error) {
        showAlert('Failed to delete user: ' + error.message, 'error');
    }
};

// Sales management
const loadSales = async () => {
    try {
        const response = await apiCall('/sales');
        renderSales(response.data);
    } catch (error) {
        console.error('Failed to load sales:', error);
        showAlert('Failed to load sales: ' + error.message, 'error');
    }
};

const renderSales = (sales) => {
    const tbody = document.getElementById('salesTable');
    tbody.innerHTML = '';
    
    sales.forEach(sale => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDate(sale.created_at)}</td>
            <td>${sale.customer_name || 'Walk-in'}</td>
            <td>${formatCurrency(sale.final_amount)}</td>
            <td><span class="status-badge">${sale.payment_method}</span></td>
            <td><span class="status-badge status-${sale.status}">${sale.status}</span></td>
            <td>
                <button class="btn btn-small btn-primary" onclick="viewSale(${sale.id})">
                    <i class="fas fa-eye"></i> View
                </button>
                <button class="btn btn-small btn-danger" onclick="deleteSale(${sale.id})">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
};

const viewSale = async (id) => {
    try {
        const response = await apiCall(`/sales/${id}`);
        const sale = response.data;
        
        let itemsHtml = '';
        sale.items.forEach(item => {
            itemsHtml += `
                <tr>
                    <td>${item.product_name}</td>
                    <td>${item.quantity}</td>
                    <td>${formatCurrency(item.unit_price)}</td>
                    <td>${formatCurrency(item.total_price)}</td>
                </tr>
            `;
        });
        
        const saleDetails = `
            <div class="sale-details">
                <h3>Sale #${sale.id}</h3>
                
                <div class="sale-info-grid">
                    <div class="sale-info-item">
                        <strong>Date:</strong>
                        <span>${formatDate(sale.created_at)}</span>
                    </div>
                    <div class="sale-info-item">
                        <strong>Customer:</strong>
                        <span>${sale.customer_name || 'Walk-in'}</span>
                    </div>
                    <div class="sale-info-item">
                        <strong>Cashier:</strong>
                        <span>${sale.cashier_name}</span>
                    </div>
                    <div class="sale-info-item">
                        <strong>Payment Method:</strong>
                        <span>${sale.payment_method}</span>
                    </div>
                    <div class="sale-info-item">
                        <strong>Status:</strong>
                        <span class="status-badge status-${sale.status}">${sale.status}</span>
                    </div>
                </div>
                
                <h4>Items:</h4>
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>Qty</th>
                                <th>Unit Price</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                    </table>
                </div>
                
                <div class="sale-summary">
                    <p><strong>Subtotal:</strong> <span>${formatCurrency(sale.total_amount)}</span></p>
                    <p><strong>Discount:</strong> <span>${formatCurrency(sale.discount_amount)}</span></p>
                    <p><strong>Tax:</strong> <span>${formatCurrency(sale.tax_amount)}</span></p>
                    <p><strong>Total:</strong> <span>${formatCurrency(sale.final_amount)}</span></p>
                </div>
            </div>
        `;
        
        // Create a simple modal for sale details
        const modal = document.createElement('div');
        modal.className = 'modal modal-large active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Sale Details</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div style="padding: 1rem;">
                    ${saleDetails}
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
    } catch (error) {
        showAlert('Failed to load sale details: ' + error.message, 'error');
    }
};

const deleteSale = async (id) => {
    if (!confirm('Are you sure you want to delete this sale? This action cannot be undone.')) return;
    
    try {
        await apiCall(`/sales/${id}`, { method: 'DELETE' });
        showAlert('Sale deleted successfully!', 'success');
        loadSales();
    } catch (error) {
        showAlert('Failed to delete sale: ' + error.message, 'error');
    }
};

// Reports
const loadReports = async () => {
    try {
        const [salesSummary, topProducts] = await Promise.all([
            apiCall('/reports/sales-summary'),
            apiCall('/reports/top-products?limit=5')
        ]);
        
        renderSalesSummary(salesSummary.data);
        renderTopProducts(topProducts.data);
    } catch (error) {
        console.error('Failed to load reports:', error);
        showAlert('Failed to load reports: ' + error.message, 'error');
    }
};

const renderSalesSummary = (summary) => {
    const container = document.getElementById('salesSummary');
    container.innerHTML = `
        <div class="summary-stats">
            <div class="stat-item">
                <h4>Total Sales</h4>
                <p>${summary.total_sales || 0}</p>
            </div>
            <div class="stat-item">
                <h4>Total Revenue</h4>
                <p>${formatCurrency(summary.total_revenue || 0)}</p>
            </div>
            <div class="stat-item">
                <h4>Average Sale</h4>
                <p>${formatCurrency(summary.average_sale || 0)}</p>
            </div>
        </div>
    `;
};

const renderTopProducts = (products) => {
    const container = document.getElementById('topProducts');
    let html = '<div class="top-products-list">';
    
    products.forEach((product, index) => {
        html += `
            <div class="product-item">
                <span class="rank">#${index + 1}</span>
                <span class="name">${product.name}</span>
                <span class="quantity">${product.total_quantity} sold</span>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
};

// Cart management
const addToCart = (product) => {
    if (product.stock_quantity <= 0) {
        showAlert('Product is out of stock!', 'error');
        return;
    }
    
    const existingItem = cart.find(item => item.product_id === product.id);
    
    if (existingItem) {
        if (existingItem.quantity >= product.stock_quantity) {
            showAlert('Cannot add more items than available stock!', 'error');
            return;
        }
        existingItem.quantity++;
    } else {
        cart.push({
            product_id: product.id,
            name: product.name,
            unit_price: product.price,
            quantity: 1
        });
    }
    
    renderCart();
};

const removeFromCart = (productId) => {
    cart = cart.filter(item => item.product_id !== productId);
    renderCart();
};

const updateCartQuantity = (productId, change) => {
    const item = cart.find(item => item.product_id === productId);
    if (!item) return;
    
    const product = products.find(p => p.id === productId);
    const newQuantity = item.quantity + change;
    
    if (newQuantity <= 0) {
        removeFromCart(productId);
        return;
    }
    
    if (newQuantity > product.stock_quantity) {
        showAlert('Cannot add more items than available stock!', 'error');
        return;
    }
    
    item.quantity = newQuantity;
    renderCart();
};

const renderCart = () => {
    const container = document.getElementById('cartItems');
    container.innerHTML = '';
    
    if (cart.length === 0) {
        container.innerHTML = '<p class="text-center">No items in cart</p>';
        updateCartSummary();
        return;
    }
    
    cart.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'cart-item';
        itemDiv.innerHTML = `
            <div class="item-info">
                <h5>${item.name}</h5>
                <div class="item-price">${formatCurrency(item.unit_price)} each</div>
            </div>
            <div class="item-controls">
                <button class="qty-btn" onclick="updateCartQuantity(${item.product_id}, -1)">-</button>
                <span>${item.quantity}</span>
                <button class="qty-btn" onclick="updateCartQuantity(${item.product_id}, 1)">+</button>
                <button class="qty-btn" onclick="removeFromCart(${item.product_id})" style="background: #dc3545; color: white; margin-left: 0.5rem;">×</button>
            </div>
        `;
        container.appendChild(itemDiv);
    });
    
    updateCartSummary();
};

const updateCartSummary = () => {
    const subtotal = cart.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const tax = subtotal * 0.05; // 5% tax
    const total = subtotal + tax;
    
    document.getElementById('subtotal').textContent = formatCurrency(subtotal);
    document.getElementById('tax').textContent = formatCurrency(tax);
    document.getElementById('total').textContent = formatCurrency(total);
};

const clearCart = () => {
    cart = [];
    renderCart();
};

const checkout = async () => {
    if (cart.length === 0) {
        showAlert('Cart is empty!', 'error');
        return;
    }
    
    const paymentMethod = document.getElementById('paymentMethod').value;
    const subtotal = cart.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const tax = subtotal * 0.05;
    
    const saleData = {
        customer_id: null, // For now, all sales are walk-in
        items: cart.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price
        })),
        discount_amount: 0,
        tax_amount: tax,
        payment_method: paymentMethod
    };
    
    try {
        const response = await apiCall('/sales', {
            method: 'POST',
            body: JSON.stringify(saleData)
        });
        
        showAlert('Sale completed successfully!', 'success');
        clearCart();
        loadProducts(); // Refresh products to update stock
        
        // Optionally show receipt
        if (confirm('Sale completed! Would you like to view the receipt?')) {
            viewSale(response.data.id);
        }
        
    } catch (error) {
        showAlert('Failed to complete sale: ' + error.message, 'error');
    }
};

// Modal management
const openModal = (modalId) => {
    document.getElementById(modalId).classList.add('active');
};

const closeModal = (modalId) => {
    document.getElementById(modalId).classList.remove('active');
    
    // Reset forms
    const form = document.querySelector(`#${modalId} form`);
    if (form) {
        form.reset();
    }
};

// Phone number validation and formatting
const setupPhoneValidation = () => {
    const phoneInput = document.getElementById('customerPhone');
    const countryCodeSelect = document.getElementById('customerCountryCode');
    const countryCodeSearch = document.getElementById('customerCountryCodeSearch');
    const phoneError = document.getElementById('phoneError');
    
    if (!phoneInput || !countryCodeSelect || !countryCodeSearch || !phoneError) return;
    
    // Country code search functionality
    countryCodeSearch.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const options = countryCodeSelect.querySelectorAll('option');
        
        options.forEach(option => {
            const text = option.textContent.toLowerCase();
            option.style.display = text.includes(searchTerm) ? 'block' : 'none';
        });
    });
    
    // Phone number validation
    const validatePhone = () => {
        const countryCode = countryCodeSelect.value;
        const phoneNumber = phoneInput.value.trim();
        
        if (!phoneNumber) {
            phoneError.textContent = '';
            phoneError.classList.remove('show');
            phoneInput.parentElement.parentElement.classList.remove('error', 'success');
            return true; // Empty is valid (optional field)
        }
        
        // Remove any existing formatting
        const cleanNumber = phoneNumber.replace(/[\s\-\(\)]/g, '');
        
        // Basic validation: should be 7-15 digits
        if (!/^\d{7,15}$/.test(cleanNumber)) {
            phoneError.textContent = 'Phone number should be 7-15 digits';
            phoneError.classList.add('show');
            phoneInput.parentElement.parentElement.classList.add('error');
            phoneInput.parentElement.parentElement.classList.remove('success');
            return false;
        }
        
        // Format the phone number
        const fullNumber = countryCode + cleanNumber;
        
        phoneError.textContent = '';
        phoneError.classList.remove('show');
        phoneInput.parentElement.parentElement.classList.remove('error');
        phoneInput.parentElement.parentElement.classList.add('success');
        
        // Update the input value with the full international format
        phoneInput.value = fullNumber;
        
        return true;
    };
    
    phoneInput.addEventListener('blur', validatePhone);
    countryCodeSelect.addEventListener('change', validatePhone);
};

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication on page load
    checkAuth();
    
    // Login form
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const username = formData.get('username');
        const password = formData.get('password');
        
        try {
            await login(username, password);
        } catch (error) {
            showError(error.message);
        }
    });
    
    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.getAttribute('data-section');
            showSection(section);
        });
    });
    
    // Product search
    document.getElementById('productSearch').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredProducts = products.filter(product => 
            product.name.toLowerCase().includes(searchTerm) ||
            (product.barcode && product.barcode.toLowerCase().includes(searchTerm))
        );
        
        const grid = document.getElementById('productGrid');
        grid.innerHTML = '';
        
        filteredProducts.filter(p => p.is_active).forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.onclick = () => addToCart(product);
            card.innerHTML = `
                <h4>${product.name}</h4>
                <div class="price">${formatCurrency(product.price)}</div>
            `;
            grid.appendChild(card);
        });
    });
    
    // Cart actions
    document.getElementById('clearCart').addEventListener('click', clearCart);
    document.getElementById('checkoutBtn').addEventListener('click', checkout);
    
    // Modal actions
    document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            if (modal) {
                modal.classList.remove('active');
            }
        });
    });
    
    // Add buttons
    document.getElementById('addProductBtn').addEventListener('click', () => {
        document.getElementById('productModalTitle').textContent = 'Add Product';
        // Load categories before opening modal
        loadCategories().then(() => {
            updateCategoryDropdown();
        });
        document.getElementById('productForm').onsubmit = (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const productData = {
                name: formData.get('name'),
                description: formData.get('description') || '',
                barcode: formData.get('barcode') || '',
                price: parseFloat(formData.get('price')),
                cost: parseFloat(formData.get('cost')) || 0,
                stock_quantity: parseInt(formData.get('stock_quantity')),
                min_stock: parseInt(formData.get('min_stock')) || 0,
                category_id: parseInt(formData.get('category_id')),
                is_active: true
            };
            saveProduct(productData);
        };
        openModal('productModal');
    });
    
    document.getElementById('addCategoryBtn').addEventListener('click', () => {
        document.getElementById('categoryModalTitle').textContent = 'Add Category';
        document.getElementById('categoryForm').onsubmit = (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const categoryData = {
                name: formData.get('name'),
                description: formData.get('description') || ''
            };
            saveCategory(categoryData);
        };
        openModal('categoryModal');
    });
    
    document.getElementById('addCustomerBtn').addEventListener('click', () => {
        document.getElementById('customerModalTitle').textContent = 'Add Customer';
        document.getElementById('customerForm').onsubmit = (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const customerData = {
                name: formData.get('name'),
                email: formData.get('email'),
                phone: formData.get('phone'),
                address: formData.get('address')
            };
            saveCustomer(customerData);
        };
        setupPhoneValidation();
        openModal('customerModal');
    });
    
    document.getElementById('addUserBtn').addEventListener('click', () => {
        document.getElementById('userModalTitle').textContent = 'Add User';
        
        // Make password field required for new users
        const passwordField = document.getElementById('userPassword');
        passwordField.setAttribute('required', 'required');
        passwordField.placeholder = '';
        
        document.getElementById('userForm').onsubmit = (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const userData = {
                name: formData.get('name'),
                username: formData.get('username'),
                email: formData.get('email'),
                password: formData.get('password'),
                role: formData.get('role'),
                is_active: formData.get('is_active') === '1' // Convert to boolean
            };
            saveUser(userData);
        };
        openModal('userModal');
    });
    
    // Close modals when clicking outside
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
    
});