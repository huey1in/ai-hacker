// 管理后台 JS
// API 基础 URL (将在页面加载时从服务器获取)
let API_BASE_URL = 'http://localhost:8080/api';

// 初始化 API 配置
async function initApiConfig() {
    try {
        const response = await fetch('/api/config');
        if (response.ok) {
            const config = await response.json();
            if (config.api_url) {
                API_BASE_URL = config.api_url + '/api';
            }
        }
    } catch (error) {
        console.log('使用默认 API 地址');
    }
}

// 检查登录状态和权限
function checkAuth() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (!token || !user) {
        // 未登录,跳转到登录页
        window.location.href = 'login.html';
        return null;
    }
    
    const userData = JSON.parse(user);
    
    // 检查是否有管理员权限 (role >= 2)
    if (userData.role < 2) {
        showAlert('权限不足', '无法访问管理后台', () => {
            window.location.href = 'index.html';
        });
        return null;
    }
    
    return userData;
}

// 检查用户是否拥有指定权限
function checkPermission(roleId, permission) {
    // 权限映射表
    const rolePermissions = {
        1: [], // 普通用户无后台权限
        2: ['dashboard:view', 'product:manage', 'cardkey:manage', 'order:view'], // 运营人员
        3: ['dashboard:view', 'product:manage', 'cardkey:manage', 'order:manage', 'user:manage', 'role:manage', 'system:manage'] // 超级管理员
    };
    
    const permissions = rolePermissions[roleId] || [];
    
    // 支持通配符匹配
    return permissions.some(p => {
        if (p === permission) return true;
        // 如果有 manage 权限,自动包含 view 权限
        if (permission.endsWith(':view') && p === permission.replace(':view', ':manage')) return true;
        return false;
    });
}

// 获取认证请求头
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
}

// 切换页面
function showSection(sectionId) {
    // 隐藏所有section
    document.querySelectorAll('.section').forEach(section => {
        section.classList.add('hidden');
    });
    
    // 显示选中的section
    document.getElementById(sectionId).classList.remove('hidden');
    
    // 更新侧边栏active状态
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.classList.remove('active');
    });
    event.target.closest('.sidebar-link').classList.add('active');
    
    // 更新标题
    const titles = {
        'dashboard': '仪表盘',
        'products': '商品管理',
        'orders': '订单管理',
        'users': '用户管理',
        'cardkeys': '卡密管理',
        'settings': '系统设置',
        'roles': '权限管理'
    };
    document.getElementById('pageTitle').textContent = titles[sectionId];
    
    // 保存当前页面状态
    localStorage.setItem('adminCurrentSection', sectionId);
    
    // 加载对应数据
    if (sectionId === 'dashboard') {
        loadDashboard();
    } else if (sectionId === 'products') {
        loadProducts();
    } else if (sectionId === 'orders') {
        loadOrders();
    } else if (sectionId === 'users') {
        loadUsers();
    } else if (sectionId === 'cardkeys') {
        loadCardKeys();
    } else if (sectionId === 'settings') {
        loadSettings();
    } else if (sectionId === 'roles') {
        loadRoles();
    }
}

// 加载仪表盘数据
async function loadDashboard() {
    try {
        const headers = getAuthHeaders();
        const user = JSON.parse(localStorage.getItem('user'));
        
        // 根据权限决定加载哪些数据
        const promises = [
            fetch(`${API_BASE_URL}/products`).then(r => r.json()),
            fetch(`${API_BASE_URL}/admin/orders`, { headers }).then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            })
        ];
        
        // 只有有用户管理权限的才加载用户数据
        if (checkPermission(user.role, 'user:manage')) {
            promises.push(
                fetch(`${API_BASE_URL}/admin/users`, { headers }).then(r => {
                    if (!r.ok) throw new Error(`HTTP ${r.status}`);
                    return r.json();
                })
            );
        }
        
        const results = await Promise.all(promises);
        const products = results[0];
        const orders = results[1];
        const users = results[2] || [];
        
        document.getElementById('totalOrders').textContent = orders.length;
        document.getElementById('totalUsers').textContent = users.length || '-';
        document.getElementById('totalProducts').textContent = products.length;
        
        const totalRevenue = orders.reduce((sum, order) => sum + order.amount, 0);
        document.getElementById('totalRevenue').textContent = `￥${totalRevenue.toFixed(2)}`;
    } catch (error) {
        console.error('加载仪表盘数据失败:', error);
        showAlert('错误', '加载数据失败: ' + error.message);
    }
}

// 加载商品列表
async function loadProducts() {
    try {
        const response = await fetch(`${API_BASE_URL}/products`);
        const products = await response.json();
        
        const user = JSON.parse(localStorage.getItem('user'));
        const canManage = checkPermission(user.role, 'product:manage');
        
        const tbody = document.getElementById('productsTable');
        tbody.innerHTML = products.map(product => `
            <tr>
                <td class="px-6 py-4 text-sm">${product.id}</td>
                <td class="px-6 py-4 text-sm font-medium">${product.name}</td>
                <td class="px-6 py-4 text-sm">￥${product.price.toFixed(2)}</td>
                <td class="px-6 py-4 text-sm">${product.stock}</td>
                <td class="px-6 py-4 text-sm">
                    ${canManage ? `
                        <button onclick="editProduct('${product.id}')" class="text-blue-600 hover:underline mr-3">编辑</button>
                        <button onclick="deleteProduct('${product.id}', '${product.name}')" class="text-red-600 hover:underline">删除</button>
                    ` : '<span class="text-gray-400">无操作权限</span>'}
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('加载商品失败:', error);
    }
}

// 加载订单列表
async function loadOrders() {
    try {
        const headers = getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/admin/orders`, { headers });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const orders = await response.json();
        
        const user = JSON.parse(localStorage.getItem('user'));
        const canManage = checkPermission(user.role, 'order:manage');
        
        const tbody = document.getElementById('ordersTable');
        tbody.innerHTML = orders.map(order => `
            <tr>
                <td class="px-6 py-4 text-sm font-mono">${order.id}</td>
                <td class="px-6 py-4 text-sm">${order.product_name}</td>
                <td class="px-6 py-4 text-sm">${order.email}</td>
                <td class="px-6 py-4 text-sm">￥${order.amount.toFixed(2)}</td>
                <td class="px-6 py-4 text-sm">
                    <span class="px-2 py-1 text-xs rounded ${order.status === '已完成' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
                        ${order.status}
                    </span>
                </td>
                <td class="px-6 py-4 text-sm">${formatDate(order.created_at)}</td>
                <td class="px-6 py-4 text-sm">
                    ${canManage ? `
                        <button onclick="editOrder('${order.id}')" class="text-blue-600 hover:underline mr-3">编辑</button>
                        <button onclick="deleteOrder('${order.id}')" class="text-red-600 hover:underline">删除</button>
                    ` : '<span class="text-gray-400">仅查看</span>'}
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('加载订单失败:', error);
        if (error.message.includes('401')) {
            showAlert('错误', '登录已过期', () => {
                window.location.href = 'login.html';
            });
        } else if (error.message.includes('403')) {
            showAlert('错误', '权限不足，无法查看订单');
        } else {
            showAlert('错误', '加载订单失败');
        }
    }
}

// 加载用户列表
async function loadUsers() {
    try {
        const headers = getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/admin/users`, { headers });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const users = await response.json();
        
        const user = JSON.parse(localStorage.getItem('user'));
        const canManage = checkPermission(user.role, 'user:manage');
        
        const tbody = document.getElementById('usersTable');
        tbody.innerHTML = users.map(u => `
            <tr>
                <td class="px-6 py-4 text-sm">${u.id}</td>
                <td class="px-6 py-4 text-sm">${u.email}</td>
                <td class="px-6 py-4 text-sm">
                    <span class="px-2 py-1 text-xs rounded ${u.role >= 2 ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}">
                        ${ROLE_NAMES[u.role] || '未知'}
                    </span>
                </td>
                <td class="px-6 py-4 text-sm">
                    ${canManage ? `
                        <button onclick="editUser('${u.id}')" class="text-blue-600 hover:underline mr-3">编辑</button>
                        <button onclick="deleteUser('${u.id}', '${u.email}')" class="text-red-600 hover:underline">删除</button>
                    ` : '<span class="text-gray-400">无操作权限</span>'}
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('加载用户失败:', error);
        if (error.message.includes('401')) {
            showAlert('错误', '登录已过期', () => {
                window.location.href = 'login.html';
            });
        } else if (error.message.includes('403')) {
            showAlert('错误', '权限不足，无法查看用户列表');
        } else {
            showAlert('错误', '加载用户失败');
        }
    }
}

// 格式化日期
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// 退出登录
function logout() {
    showConfirm('确认退出', '确定要退出登录吗？', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    });
}

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', async function() {
    // 初始化 API 配置
    await initApiConfig();
    
    // 检查权限
    const user = checkAuth();
    if (!user) return;
    
    // 显示用户信息
    const userEmailElement = document.getElementById('adminEmail');
    if (userEmailElement) {
        userEmailElement.textContent = user.email;
    }
    
    // 如果不是超级管理员,隐藏权限管理和系统设置菜单
    if (user.role !== 3) {
        const rolesLink = document.querySelector('a[href="#roles"]');
        if (rolesLink) {
            rolesLink.style.display = 'none';
        }
        const settingsLink = document.querySelector('a[href="#settings"]');
        if (settingsLink) {
            settingsLink.style.display = 'none';
        }
    } else {
        // 如果是超级管理员,显示相关按钮
        const addRoleBtn = document.getElementById('addRoleBtn');
        if (addRoleBtn) {
            addRoleBtn.style.display = 'block';
        }
        
        const saveEmailConfigBtn = document.getElementById('saveEmailConfigBtn');
        if (saveEmailConfigBtn) {
            saveEmailConfigBtn.style.display = 'block';
        }
        
        const testEmailBtn = document.getElementById('testEmailBtn');
        if (testEmailBtn) {
            testEmailBtn.style.display = 'block';
        }
    }
    
    // 根据权限显示/隐藏菜单
    if (!checkPermission(user.role, 'cardkey:manage')) {
        const cardkeysLink = document.querySelector('a[href="#cardkeys"]');
        if (cardkeysLink) {
            cardkeysLink.style.display = 'none';
        }
    }
    
    // 根据权限显示/隐藏按钮
    if (checkPermission(user.role, 'user:manage')) {
        const addUserBtn = document.getElementById('addUserBtn');
        if (addUserBtn) {
            addUserBtn.style.display = 'block';
        }
    }
    
    if (checkPermission(user.role, 'product:manage')) {
        const addProductBtn = document.getElementById('addProductBtn');
        if (addProductBtn) {
            addProductBtn.style.display = 'block';
        }
    }
    
    if (checkPermission(user.role, 'cardkey:manage')) {
        const addCardKeyBtn = document.getElementById('addCardKeyBtn');
        if (addCardKeyBtn) {
            addCardKeyBtn.style.display = 'block';
        }
        
        const addBatchCardKeyBtn = document.getElementById('addBatchCardKeyBtn');
        if (addBatchCardKeyBtn) {
            addBatchCardKeyBtn.style.display = 'block';
        }
    }
    
    if (checkPermission(user.role, 'role:manage')) {
        const addRoleBtn = document.getElementById('addRoleBtn');
        if (addRoleBtn) {
            addRoleBtn.style.display = 'block';
        }
    }
    
    if (checkPermission(user.role, 'system:manage')) {
        const saveSiteConfigBtn = document.getElementById('saveSiteConfigBtn');
        if (saveSiteConfigBtn) {
            saveSiteConfigBtn.style.display = 'block';
        }
        
        const saveEmailConfigBtn = document.getElementById('saveEmailConfigBtn');
        if (saveEmailConfigBtn) {
            saveEmailConfigBtn.style.display = 'block';
        }
        
        const testEmailBtn = document.getElementById('testEmailBtn');
        if (testEmailBtn) {
            testEmailBtn.style.display = 'block';
        }
        
        const saveLegalConfigBtn = document.getElementById('saveLegalConfigBtn');
        if (saveLegalConfigBtn) {
            saveLegalConfigBtn.style.display = 'block';
        }
    }
    
    // 恢复上次的页面状态，如果没有则默认显示仪表盘
    const savedSection = localStorage.getItem('adminCurrentSection') || 'dashboard';
    if (document.getElementById(savedSection)) {
        // 隐藏所有section
        document.querySelectorAll('.section').forEach(section => {
            section.classList.add('hidden');
        });
        
        // 显示保存的section
        document.getElementById(savedSection).classList.remove('hidden');
        
        // 更新侧边栏active状态
        document.querySelectorAll('.sidebar-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === '#' + savedSection) {
                link.classList.add('active');
            }
        });
        
        // 更新标题
        const titles = {
            'dashboard': '仪表盘',
            'products': '商品管理',
            'orders': '订单管理',
            'users': '用户管理',
            'cardkeys': '卡密管理',
            'settings': '系统设置',
            'roles': '权限管理'
        };
        document.getElementById('pageTitle').textContent = titles[savedSection];
        
        // 加载对应数据
        if (savedSection === 'dashboard') {
            loadDashboard();
        } else if (savedSection === 'products') {
            loadProducts();
        } else if (savedSection === 'orders') {
            loadOrders();
        } else if (savedSection === 'users') {
            loadUsers();
        } else if (savedSection === 'cardkeys') {
            loadCardKeys();
        } else if (savedSection === 'settings') {
            loadSettings();
        } else if (savedSection === 'roles') {
            loadRoles();
        }
    }
});


// 加载角色权限列表
async function loadRoles() {
    try {
        const headers = getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/admin/roles`, { headers });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const roles = await response.json();
        const user = JSON.parse(localStorage.getItem('user'));
        const isSuperAdmin = user && user.role === 3;
        
        const container = document.getElementById('rolesContainer');
        container.innerHTML = roles.map(role => `
            <div class="border border-gray-200 rounded-lg p-6">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h3 class="text-lg font-medium">${role.name}</h3>
                        <p class="text-sm text-gray-500 mt-1">角色 ID: ${role.id}</p>
                    </div>
                    ${isSuperAdmin ? `
                        <div class="flex space-x-2">
                            <button onclick="editRole(${role.id})" class="text-blue-600 hover:underline text-sm">
                                编辑权限
                            </button>
                            ${role.id > 3 ? `
                                <button onclick="deleteRole(${role.id}, '${role.name}')" class="text-red-600 hover:underline text-sm">
                                    删除
                                </button>
                            ` : ''}
                        </div>
                    ` : ''}
                </div>
                <div class="space-y-2">
                    <div class="text-sm font-medium text-gray-700 mb-2">权限列表:</div>
                    <div class="flex flex-wrap gap-2">
                        ${role.permissions.length > 0 ? role.permissions.map(perm => `
                            <span class="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                                ${PERMISSION_MAP[perm] || perm}
                            </span>
                        `).join('') : '<span class="text-gray-400 text-sm">无权限</span>'}
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('加载角色失败:', error);
        if (error.message.includes('401') || error.message.includes('403')) {
            showAlert('错误', '登录已过期或权限不足', () => {
                window.location.href = 'login.html';
            });
        }
    }
}

// 编辑角色权限
async function editRole(roleId) {
    try {
        const headers = getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/admin/roles`, { headers });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const roles = await response.json();
        const role = roles.find(r => r.id === roleId);
        
        if (!role) {
            showAlert('错误', '角色不存在');
            return;
        }
        
        // 创建编辑对话框
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.onclick = function(e) {
            if (e.target === modal) {
                modal.remove();
            }
        };
        modal.innerHTML = `
            <div class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
                <h3 class="text-xl font-medium mb-4">编辑角色权限: ${role.name}</h3>
                <div class="space-y-6 mb-6">
                    ${Object.entries(PERMISSION_GROUPS).map(([groupName, perms]) => `
                        <div>
                            <div class="text-sm font-medium text-gray-700 mb-3">${groupName}</div>
                            <div class="space-y-2 pl-4">
                                ${perms.map(perm => `
                                    <label class="flex items-start space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                                        <input type="checkbox" 
                                               value="${perm}" 
                                               ${role.permissions.includes(perm) ? 'checked' : ''}
                                               class="w-4 h-4 mt-0.5 text-black border-gray-300 rounded focus:ring-black">
                                        <div class="flex-1">
                                            <div class="text-sm font-medium">${PERMISSION_MAP[perm]}</div>
                                            <div class="text-xs text-gray-500">${PERMISSION_DESCRIPTIONS[perm]}</div>
                                        </div>
                                    </label>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="flex justify-end space-x-3">
                    <button onclick="this.closest('.fixed').remove()" 
                            class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded">
                        取消
                    </button>
                    <button onclick="saveRolePermissions(${roleId})" 
                            class="px-4 py-2 bg-black text-white rounded hover:bg-gray-800">
                        保存
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    } catch (error) {
        console.error('加载角色失败:', error);
        showAlert('错误', '加载角色失败');
    }
}

// 保存角色权限
async function saveRolePermissions(roleId) {
    const modal = document.querySelector('.fixed');
    const checkboxes = modal.querySelectorAll('input[type="checkbox"]:checked');
    const permissions = Array.from(checkboxes).map(cb => cb.value);
    
    try {
        const headers = getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/admin/roles/${roleId}`, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify({ permissions })
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || '保存失败');
        }
        
        showAlert('成功', '权限更新成功', () => {
            modal.remove();
            loadRoles();
        });
    } catch (error) {
        console.error('保存权限失败:', error);
        showAlert('错误', '保存失败: ' + error.message);
    }
}


// 显示添加角色对话框
function showAddRoleModal() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.onclick = function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    };
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h3 class="text-xl font-medium mb-4">添加新角色</h3>
            <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">角色 ID</label>
                <input type="number" id="newRoleId" min="4" class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black" placeholder="请输入角色 ID (大于3)">
            </div>
            <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">角色名称</label>
                <input type="text" id="newRoleName" class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black" placeholder="请输入角色名称">
            </div>
            <div class="mb-6">
                <label class="block text-sm font-medium text-gray-700 mb-3">选择权限</label>
                <div class="space-y-6">
                    ${Object.entries(PERMISSION_GROUPS).map(([groupName, perms]) => `
                        <div>
                            <div class="text-sm font-medium text-gray-700 mb-3">${groupName}</div>
                            <div class="space-y-2 pl-4">
                                ${perms.map(perm => `
                                    <label class="flex items-start space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                                        <input type="checkbox" 
                                               value="${perm}" 
                                               class="new-role-permission w-4 h-4 mt-0.5 text-black border-gray-300 rounded focus:ring-black">
                                        <div class="flex-1">
                                            <div class="text-sm font-medium">${PERMISSION_MAP[perm]}</div>
                                            <div class="text-xs text-gray-500">${PERMISSION_DESCRIPTIONS[perm]}</div>
                                        </div>
                                    </label>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="flex justify-end space-x-3">
                <button onclick="this.closest('.fixed').remove()" 
                        class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded">
                    取消
                </button>
                <button onclick="createRole()" 
                        class="px-4 py-2 bg-black text-white rounded hover:bg-gray-800">
                    创建
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// 创建角色
async function createRole() {
    const modal = document.querySelector('.fixed');
    const roleId = parseInt(document.getElementById('newRoleId').value);
    const roleName = document.getElementById('newRoleName').value.trim();
    const checkboxes = modal.querySelectorAll('.new-role-permission:checked');
    const permissions = Array.from(checkboxes).map(cb => cb.value);
    
    if (!roleId || roleId <= 3) {
        showAlert('提示', '角色 ID 必须大于 3');
        return;
    }
    
    if (!roleName) {
        showAlert('提示', '请输入角色名称');
        return;
    }
    
    if (permissions.length === 0) {
        showAlert('提示', '请至少选择一个权限');
        return;
    }
    
    try {
        const headers = getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/admin/roles`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                id: roleId,
                name: roleName,
                permissions: permissions
            })
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || '创建失败');
        }
        
        showAlert('成功', '角色创建成功', () => {
            modal.remove();
            loadRoles();
        });
    } catch (error) {
        console.error('创建角色失败:', error);
        showAlert('错误', '创建失败: ' + error.message);
    }
}

// 删除角色
async function deleteRole(roleId, roleName) {
    showConfirm('确认删除', `确定要删除角色 "${roleName}" 吗？\n\n删除前会检查是否有用户使用该角色。`, async () => {
        try {
            const headers = getAuthHeaders();
            const response = await fetch(`${API_BASE_URL}/admin/roles/${roleId}`, {
                method: 'DELETE',
                headers: headers
            });
            
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || '删除失败');
            }
            
            showAlert('成功', '角色删除成功', () => {
                loadRoles();
            });
        } catch (error) {
            console.error('删除角色失败:', error);
            showAlert('错误', '删除失败: ' + error.message);
        }
    });
}


// 自定义确认对话框
function showConfirm(title, message, onConfirm) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.onclick = function(e) {
        if (e.target === overlay) {
            overlay.classList.remove('show');
            setTimeout(() => document.body.removeChild(overlay), 200);
        }
    };
    overlay.innerHTML = `
        <div class="modal-content">
            <div class="modal-title">${title}</div>
            <div class="modal-message">${message}</div>
            <div class="flex space-x-3">
                <button class="flex-1 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded" onclick="this.closest('.modal-overlay').remove()">
                    取消
                </button>
                <button class="flex-1 px-4 py-2 bg-black text-white rounded hover:bg-gray-800" id="confirmBtn">
                    确定
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    setTimeout(() => overlay.classList.add('show'), 10);
    
    overlay.querySelector('#confirmBtn').addEventListener('click', () => {
        overlay.classList.remove('show');
        setTimeout(() => document.body.removeChild(overlay), 200);
        if (onConfirm) onConfirm();
    });
}

// 自定义提示对话框
function showAlert(title, message, callback) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.onclick = function(e) {
        if (e.target === overlay) {
            closeAlert();
        }
    };
    overlay.innerHTML = `
        <div class="modal-content">
            <div class="modal-title">${title}</div>
            <div class="modal-message">${message}</div>
            <button class="modal-button">确定</button>
        </div>
    `;
    
    document.body.appendChild(overlay);
    setTimeout(() => overlay.classList.add('show'), 10);
    
    const closeAlert = () => {
        overlay.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(overlay);
            if (callback) callback();
        }, 200);
    };
    
    overlay.querySelector('.modal-button').addEventListener('click', closeAlert);
}

// 编辑商品
async function editProduct(productId) {
    try {
        const response = await fetch(`${API_BASE_URL}/products`);
        const products = await response.json();
        const product = products.find(p => p.id === productId);
        
        if (!product) {
            showAlert('错误', '商品不存在');
            return;
        }
        
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.onclick = function(e) {
            if (e.target === modal) {
                modal.remove();
            }
        };
        modal.innerHTML = `
            <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <h3 class="text-xl font-medium mb-4">编辑商品</h3>
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">商品 ID</label>
                        <input type="text" id="editProductId" value="${product.id}" disabled class="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">商品名称</label>
                        <input type="text" id="editProductName" value="${product.name}" class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">商品描述</label>
                        <textarea id="editProductDesc" class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black" rows="3">${product.description}</textarea>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">价格</label>
                        <input type="number" id="editProductPrice" value="${product.price}" step="0.01" class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">库存</label>
                        <input type="number" id="editProductStock" value="${product.stock}" disabled class="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100">
                        <p class="text-xs text-gray-500 mt-1">库存由卡密数量自动计算</p>
                    </div>
                </div>
                <div class="flex justify-end space-x-3 mt-6">
                    <button onclick="this.closest('.fixed').remove()" class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded">
                        取消
                    </button>
                    <button onclick="saveProduct('${productId}')" class="px-4 py-2 bg-black text-white rounded hover:bg-gray-800">
                        保存
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    } catch (error) {
        console.error('加载商品失败:', error);
        showAlert('错误', '加载商品失败');
    }
}

// 保存商品
async function saveProduct(productId) {
    const name = document.getElementById('editProductName').value.trim();
    const description = document.getElementById('editProductDesc').value.trim();
    const price = parseFloat(document.getElementById('editProductPrice').value);
    
    if (!name || !description || isNaN(price)) {
        showAlert('提示', '请填写完整信息');
        return;
    }
    
    try {
        const headers = getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/admin/products/${productId}`, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify({
                id: productId,
                name: name,
                description: description,
                price: price
            })
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || '保存失败');
        }
        
        document.querySelector('.fixed').remove();
        showAlert('成功', '商品更新成功', () => {
            loadProducts();
        });
    } catch (error) {
        console.error('保存商品失败:', error);
        showAlert('错误', '保存失败: ' + error.message);
    }
}

// 删除商品
async function deleteProduct(productId, productName) {
    showConfirm('确认删除', `确定要删除商品 "${productName}" 吗？`, async () => {
        try {
            const headers = getAuthHeaders();
            const response = await fetch(`${API_BASE_URL}/admin/products/${productId}`, {
                method: 'DELETE',
                headers: headers
            });
            
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || '删除失败');
            }
            
            showAlert('成功', '商品删除成功', () => {
                loadProducts();
            });
        } catch (error) {
            console.error('删除商品失败:', error);
            showAlert('错误', '删除失败: ' + error.message);
        }
    });
}

// 编辑订单
async function editOrder(orderId) {
    try {
        const headers = getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/admin/orders`, { headers });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const orders = await response.json();
        const order = orders.find(o => o.id === orderId);
        
        if (!order) {
            showAlert('错误', '订单不存在');
            return;
        }
        
        const statusOptions = [
            { value: '已完成', label: '已完成' },
            { value: '处理中', label: '处理中' },
            { value: '已取消', label: '已取消' }
        ];
        
        let selectedStatus = order.status;
        
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.onclick = function(e) {
            if (e.target === modal) {
                modal.remove();
            }
        };
        modal.innerHTML = `
            <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <h3 class="text-xl font-medium mb-4">编辑订单</h3>
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">订单号</label>
                        <input type="text" value="${order.id}" disabled class="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">商品名称</label>
                        <input type="text" value="${order.product_name}" disabled class="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">用户邮箱</label>
                        <input type="text" value="${order.email}" disabled class="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">订单金额</label>
                        <input type="text" value="￥${order.amount.toFixed(2)}" disabled class="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">订单状态</label>
                        ${createCustomDropdown(statusOptions, selectedStatus, (value) => {
                            selectedStatus = value;
                        })}
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">卡密</label>
                        <textarea id="editOrderCardKey" class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black" rows="3">${order.card_key || ''}</textarea>
                    </div>
                </div>
                <div class="flex justify-end space-x-3 mt-6">
                    <button onclick="this.closest('.fixed').remove()" class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded">
                        取消
                    </button>
                    <button onclick="saveOrderWithDropdown('${orderId}')" class="px-4 py-2 bg-black text-white rounded hover:bg-gray-800">
                        保存
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    } catch (error) {
        console.error('加载订单失败:', error);
        showAlert('错误', '加载订单失败');
    }
}

// 保存订单(使用下拉菜单)
async function saveOrderWithDropdown(orderId) {
    const dropdown = document.querySelector('.custom-dropdown');
    const status = getDropdownValue(dropdown.id);
    const cardKey = document.getElementById('editOrderCardKey').value.trim();
    
    if (!cardKey) {
        showAlert('提示', '请填写卡密');
        return;
    }
    
    try {
        const headers = getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/admin/orders/${orderId}`, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify({
                status: status,
                card_key: cardKey
            })
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || '保存失败');
        }
        
        document.querySelector('.fixed').remove();
        showAlert('成功', '订单更新成功', () => {
            loadOrders();
        });
    } catch (error) {
        console.error('保存订单失败:', error);
        showAlert('错误', '保存失败: ' + error.message);
    }
}

// 删除订单
async function deleteOrder(orderId) {
    showConfirm('确认删除', `确定要删除订单 ${orderId} 吗？`, async () => {
        try {
            const headers = getAuthHeaders();
            const response = await fetch(`${API_BASE_URL}/admin/orders/${orderId}`, {
                method: 'DELETE',
                headers: headers
            });
            
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || '删除失败');
            }
            
            showAlert('成功', '订单删除成功', () => {
                loadOrders();
            });
        } catch (error) {
            console.error('删除订单失败:', error);
            showAlert('错误', '删除失败: ' + error.message);
        }
    });
}

// 删除用户
async function deleteUser(userId, userEmail) {
    showConfirm('确认删除', `确定要删除用户 "${userEmail}" 吗？`, async () => {
        try {
            const headers = getAuthHeaders();
            const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
                method: 'DELETE',
                headers: headers
            });
            
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || '删除失败');
            }
            
            showAlert('成功', '用户删除成功', () => {
                loadUsers();
            });
        } catch (error) {
            console.error('删除用户失败:', error);
            showAlert('错误', '删除失败: ' + error.message);
        }
    });
}


// 显示添加商品对话框
function showAddProductModal() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.onclick = function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    };
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 class="text-xl font-medium mb-4">添加商品</h3>
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">商品名称</label>
                    <input type="text" id="newProductName" class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black" placeholder="请输入商品名称">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">商品描述</label>
                    <textarea id="newProductDesc" class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black" rows="3" placeholder="请输入商品描述"></textarea>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">价格</label>
                    <input type="number" id="newProductPrice" step="0.01" class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black" placeholder="请输入价格">
                </div>
                <div class="bg-gray-50 p-3 rounded">
                    <p class="text-xs text-gray-600">提示: 商品创建后,请前往"卡密管理"添加卡密,库存将自动计算</p>
                </div>
            </div>
            <div class="flex justify-end space-x-3 mt-6">
                <button onclick="this.closest('.fixed').remove()" class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded">
                    取消
                </button>
                <button onclick="createProduct()" class="px-4 py-2 bg-black text-white rounded hover:bg-gray-800">
                    创建
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// 创建商品
async function createProduct() {
    const name = document.getElementById('newProductName').value.trim();
    const description = document.getElementById('newProductDesc').value.trim();
    const price = parseFloat(document.getElementById('newProductPrice').value);
    
    if (!name || !description || isNaN(price)) {
        showAlert('提示', '请填写完整信息');
        return;
    }
    
    if (price <= 0) {
        showAlert('提示', '价格必须大于0');
        return;
    }
    
    try {
        const headers = getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/admin/products`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                id: 'P' + Date.now(),
                name: name,
                description: description,
                price: price,
                stock: 0
            })
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || '创建失败');
        }
        
        document.querySelector('.fixed').remove();
        showAlert('成功', '商品创建成功,请前往卡密管理添加卡密', () => {
            loadProducts();
        });
    } catch (error) {
        console.error('创建商品失败:', error);
        showAlert('错误', '创建失败: ' + error.message);
    }
}

// 显示添加用户对话框
async function showAddUserModal() {
    try {
        const headers = getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/admin/roles`, { headers });
        const roles = await response.json();
        
        const roleOptions = roles.map(role => ({
            value: role.id,
            label: role.name
        }));
        
        let selectedRole = roles[0].id;
        
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.onclick = function(e) {
            if (e.target === modal) {
                modal.remove();
            }
        };
        modal.innerHTML = `
            <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <h3 class="text-xl font-medium mb-4">添加用户</h3>
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">邮箱</label>
                        <input type="email" id="newUserEmail" class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black" placeholder="请输入邮箱">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">密码</label>
                        <input type="password" id="newUserPassword" class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black" placeholder="请输入密码">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">角色</label>
                        ${createCustomDropdown(roleOptions, selectedRole, (value) => {
                            selectedRole = value;
                        })}
                    </div>
                </div>
                <div class="flex justify-end space-x-3 mt-6">
                    <button onclick="this.closest('.fixed').remove()" class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded">
                        取消
                    </button>
                    <button onclick="createUserWithDropdown()" class="px-4 py-2 bg-black text-white rounded hover:bg-gray-800">
                        创建
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 保存选中的角色到全局变量
        window.currentNewUserRole = selectedRole;
    } catch (error) {
        console.error('加载角色失败:', error);
        showAlert('错误', '加载角色失败');
    }
}

// 创建用户(使用下拉菜单)
async function createUserWithDropdown() {
    const email = document.getElementById('newUserEmail').value.trim();
    const password = document.getElementById('newUserPassword').value;
    const dropdown = document.querySelector('.custom-dropdown');
    const role = parseInt(getDropdownValue(dropdown.id));
    
    if (!email || !password) {
        showAlert('提示', '请填写完整信息');
        return;
    }
    
    if (password.length < 6) {
        showAlert('提示', '密码至少6位');
        return;
    }
    
    try {
        const headers = getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/admin/users`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                id: Date.now().toString(),
                email: email,
                password: password,
                role: role
            })
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || '创建失败');
        }
        
        document.querySelector('.fixed').remove();
        showAlert('成功', '用户创建成功', () => {
            loadUsers();
        });
    } catch (error) {
        console.error('创建用户失败:', error);
        showAlert('错误', '创建失败: ' + error.message);
    }
}


// 编辑用户
async function editUser(userId) {
    try {
        const headers = getAuthHeaders();
        const [usersResponse, rolesResponse] = await Promise.all([
            fetch(`${API_BASE_URL}/admin/users`, { headers }),
            fetch(`${API_BASE_URL}/admin/roles`, { headers })
        ]);
        
        const users = await usersResponse.json();
        const roles = await rolesResponse.json();
        const user = users.find(u => u.id === userId);
        
        if (!user) {
            showAlert('错误', '用户不存在');
            return;
        }
        
        const roleOptions = roles.map(role => ({
            value: role.id,
            label: role.name
        }));
        
        let selectedRole = user.role;
        
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.onclick = function(e) {
            if (e.target === modal) {
                modal.remove();
            }
        };
        modal.innerHTML = `
            <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <h3 class="text-xl font-medium mb-4">编辑用户</h3>
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">用户 ID</label>
                        <input type="text" value="${user.id}" disabled class="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">邮箱</label>
                        <input type="email" id="editUserEmail" value="${user.email}" class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">新密码 (留空则不修改)</label>
                        <input type="password" id="editUserPassword" class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black" placeholder="留空则不修改密码">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">角色</label>
                        ${createCustomDropdown(roleOptions, selectedRole, (value) => {
                            selectedRole = value;
                        })}
                    </div>
                </div>
                <div class="flex justify-end space-x-3 mt-6">
                    <button onclick="this.closest('.fixed').remove()" class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded">
                        取消
                    </button>
                    <button onclick="saveUserWithDropdown('${userId}')" class="px-4 py-2 bg-black text-white rounded hover:bg-gray-800">
                        保存
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    } catch (error) {
        console.error('加载用户失败:', error);
        showAlert('错误', '加载用户失败');
    }
}

// 保存用户(使用下拉菜单)
async function saveUserWithDropdown(userId) {
    const email = document.getElementById('editUserEmail').value.trim();
    const password = document.getElementById('editUserPassword').value;
    const dropdown = document.querySelector('.custom-dropdown');
    const role = parseInt(getDropdownValue(dropdown.id));
    
    if (!email) {
        showAlert('提示', '请填写邮箱');
        return;
    }
    
    if (password && password.length < 6) {
        showAlert('提示', '密码至少6位');
        return;
    }
    
    try {
        const headers = getAuthHeaders();
        const body = {
            email: email,
            role: role
        };
        
        if (password) {
            body.password = password;
        }
        
        const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify(body)
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || '保存失败');
        }
        
        document.querySelector('.fixed').remove();
        showAlert('成功', '用户更新成功', () => {
            loadUsers();
        });
    } catch (error) {
        console.error('保存用户失败:', error);
        showAlert('错误', '保存失败: ' + error.message);
    }
}


// 创建自定义下拉菜单
function createCustomDropdown(options, selectedValue, onChange) {
    const dropdownId = 'dropdown-' + Date.now();
    const selectedOption = options.find(opt => opt.value == selectedValue) || options[0];
    
    const html = `
        <div class="custom-dropdown" id="${dropdownId}">
            <div class="custom-dropdown-trigger" onclick="toggleDropdown('${dropdownId}')">
                <span class="dropdown-text">${selectedOption.label}</span>
                <span class="custom-dropdown-arrow"></span>
            </div>
            <div class="custom-dropdown-menu">
                ${options.map(opt => `
                    <div class="custom-dropdown-option ${opt.value == selectedValue ? 'selected' : ''}" 
                         data-value="${opt.value}"
                         onclick="selectDropdownOption('${dropdownId}', '${opt.value}', '${opt.label}')">
                        ${opt.label}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    // 保存 onChange 回调
    if (!window.dropdownCallbacks) {
        window.dropdownCallbacks = {};
    }
    window.dropdownCallbacks[dropdownId] = onChange;
    
    return html;
}

// 切换下拉菜单
function toggleDropdown(dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;
    
    const trigger = dropdown.querySelector('.custom-dropdown-trigger');
    const menu = dropdown.querySelector('.custom-dropdown-menu');
    
    // 关闭其他下拉菜单
    document.querySelectorAll('.custom-dropdown-menu.show').forEach(m => {
        if (m !== menu) {
            m.classList.remove('show');
            m.parentElement.querySelector('.custom-dropdown-trigger').classList.remove('active');
        }
    });
    
    // 切换当前下拉菜单
    trigger.classList.toggle('active');
    menu.classList.toggle('show');
}

// 选择下拉菜单选项
function selectDropdownOption(dropdownId, value, label) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;
    
    const trigger = dropdown.querySelector('.custom-dropdown-trigger');
    const menu = dropdown.querySelector('.custom-dropdown-menu');
    const text = dropdown.querySelector('.dropdown-text');
    
    // 更新显示文本
    text.textContent = label;
    
    // 更新选中状态
    dropdown.querySelectorAll('.custom-dropdown-option').forEach(opt => {
        opt.classList.remove('selected');
        if (opt.dataset.value == value) {
            opt.classList.add('selected');
        }
    });
    
    // 关闭菜单
    trigger.classList.remove('active');
    menu.classList.remove('show');
    
    // 调用回调
    if (window.dropdownCallbacks && window.dropdownCallbacks[dropdownId]) {
        window.dropdownCallbacks[dropdownId](value);
    }
}

// 点击外部关闭下拉菜单
document.addEventListener('click', function(e) {
    if (!e.target.closest('.custom-dropdown')) {
        document.querySelectorAll('.custom-dropdown-menu.show').forEach(menu => {
            menu.classList.remove('show');
            menu.parentElement.querySelector('.custom-dropdown-trigger').classList.remove('active');
        });
    }
});

// 获取下拉菜单的值
function getDropdownValue(dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return null;
    
    const selected = dropdown.querySelector('.custom-dropdown-option.selected');
    return selected ? selected.dataset.value : null;
}


// 卡密管理相关功能
let currentFilterProductId = '';

// 加载卡密列表
async function loadCardKeys(productId = '') {
    try {
        const headers = getAuthHeaders();
        const url = productId ? `${API_BASE_URL}/admin/cardkeys?product_id=${productId}` : `${API_BASE_URL}/admin/cardkeys`;
        const response = await fetch(url, { headers });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const cardKeys = await response.json();
        currentFilterProductId = productId;
        
        // 加载商品列表用于筛选
        await loadProductFilter();
        
        const tbody = document.getElementById('cardKeysTable');
        if (cardKeys.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="px-6 py-8 text-center text-gray-500">暂无卡密数据</td></tr>';
            return;
        }
        
        tbody.innerHTML = cardKeys.map(ck => `
            <tr>
                <td class="px-6 py-4 text-sm font-mono">${ck.id}</td>
                <td class="px-6 py-4 text-sm">${ck.product_id}</td>
                <td class="px-6 py-4 text-sm font-mono">${ck.key}</td>
                <td class="px-6 py-4 text-sm">
                    <span class="px-2 py-1 text-xs rounded ${ck.status === 'unused' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                        ${ck.status === 'unused' ? '未使用' : '已使用'}
                    </span>
                </td>
                <td class="px-6 py-4 text-sm">${ck.order_id || '-'}</td>
                <td class="px-6 py-4 text-sm">${ck.used_at ? formatDate(ck.used_at) : '-'}</td>
                <td class="px-6 py-4 text-sm">
                    ${ck.status === 'unused' ? `<button onclick="deleteCardKey('${ck.id}')" class="text-red-600 hover:underline">删除</button>` : '<span class="text-gray-400">已使用</span>'}
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('加载卡密失败:', error);
        if (error.message.includes('401') || error.message.includes('403')) {
            showAlert('错误', '登录已过期或权限不足', () => {
                window.location.href = 'login.html';
            });
        }
    }
}

// 加载商品筛选器
async function loadProductFilter() {
    try {
        const response = await fetch(`${API_BASE_URL}/products`);
        const products = await response.json();
        
        const options = [
            { value: '', label: '全部商品' },
            ...products.map(p => ({ value: p.id, label: `${p.name} (${p.id})` }))
        ];
        
        const container = document.getElementById('productFilterContainer');
        container.innerHTML = createCustomDropdown(options, currentFilterProductId, (value) => {
            loadCardKeys(value);
        });
    } catch (error) {
        console.error('加载商品列表失败:', error);
    }
}

// 显示添加卡密对话框
async function showAddCardKeyModal() {
    try {
        const response = await fetch(`${API_BASE_URL}/products`);
        const products = await response.json();
        
        if (products.length === 0) {
            showAlert('提示', '请先添加商品');
            return;
        }
        
        const productOptions = products.map(p => ({
            value: p.id,
            label: `${p.name} (${p.id})`
        }));
        
        let selectedProduct = currentFilterProductId || products[0].id;
        
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.onclick = function(e) {
            if (e.target === modal) {
                modal.remove();
            }
        };
        modal.innerHTML = `
            <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <h3 class="text-xl font-medium mb-4">添加卡密</h3>
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">选择商品</label>
                        ${createCustomDropdown(productOptions, selectedProduct, (value) => {
                            selectedProduct = value;
                        })}
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">卡密</label>
                        <input type="text" id="newCardKey" class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black" placeholder="请输入卡密">
                    </div>
                </div>
                <div class="flex justify-end space-x-3 mt-6">
                    <button onclick="this.closest('.fixed').remove()" class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded">
                        取消
                    </button>
                    <button onclick="createCardKey()" class="px-4 py-2 bg-black text-white rounded hover:bg-gray-800">
                        创建
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    } catch (error) {
        console.error('加载商品列表失败:', error);
        showAlert('错误', '加载商品列表失败');
    }
}

// 创建卡密
async function createCardKey() {
    const modal = document.querySelector('.fixed');
    const dropdown = modal.querySelector('.custom-dropdown');
    const productId = getDropdownValue(dropdown.id);
    const key = document.getElementById('newCardKey').value.trim();
    
    if (!key) {
        showAlert('提示', '请输入卡密');
        return;
    }
    
    try {
        const headers = getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/admin/cardkeys`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                id: 'CK' + Date.now(),
                product_id: productId,
                key: key
            })
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || '创建失败');
        }
        
        modal.remove();
        showAlert('成功', '卡密创建成功', () => {
            loadCardKeys(currentFilterProductId);
        });
    } catch (error) {
        console.error('创建卡密失败:', error);
        showAlert('错误', '创建失败: ' + error.message);
    }
}

// 显示批量添加卡密对话框
async function showBatchAddCardKeyModal() {
    try {
        const response = await fetch(`${API_BASE_URL}/products`);
        const products = await response.json();
        
        if (products.length === 0) {
            showAlert('提示', '请先添加商品');
            return;
        }
        
        const productOptions = products.map(p => ({
            value: p.id,
            label: `${p.name} (${p.id})`
        }));
        
        let selectedProduct = currentFilterProductId || products[0].id;
        
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.onclick = function(e) {
            if (e.target === modal) {
                modal.remove();
            }
        };
        modal.innerHTML = `
            <div class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
                <h3 class="text-xl font-medium mb-4">批量添加卡密</h3>
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">选择商品</label>
                        ${createCustomDropdown(productOptions, selectedProduct, (value) => {
                            selectedProduct = value;
                        })}
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">卡密列表 (每行一个)</label>
                        <textarea id="batchCardKeys" class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black" rows="10" placeholder="请输入卡密，每行一个&#10;例如：&#10;ABCD-1234-EFGH&#10;IJKL-5678-MNOP&#10;QRST-9012-UVWX"></textarea>
                        <p class="text-xs text-gray-500 mt-1">每行一个卡密，空行将被忽略</p>
                    </div>
                </div>
                <div class="flex justify-end space-x-3 mt-6">
                    <button onclick="this.closest('.fixed').remove()" class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded">
                        取消
                    </button>
                    <button onclick="batchCreateCardKeys()" class="px-4 py-2 bg-black text-white rounded hover:bg-gray-800">
                        批量创建
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    } catch (error) {
        console.error('加载商品列表失败:', error);
        showAlert('错误', '加载商品列表失败');
    }
}

// 批量创建卡密
async function batchCreateCardKeys() {
    const modal = document.querySelector('.fixed');
    const dropdown = modal.querySelector('.custom-dropdown');
    const productId = getDropdownValue(dropdown.id);
    const keysText = document.getElementById('batchCardKeys').value;
    
    // 分割并过滤空行
    const keys = keysText.split('\n')
        .map(k => k.trim())
        .filter(k => k.length > 0);
    
    if (keys.length === 0) {
        showAlert('提示', '请输入至少一个卡密');
        return;
    }
    
    try {
        const headers = getAuthHeaders();
        let successCount = 0;
        let failCount = 0;
        
        // 逐个创建卡密
        for (const key of keys) {
            try {
                const response = await fetch(`${API_BASE_URL}/admin/cardkeys`, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({
                        id: 'CK' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                        product_id: productId,
                        key: key
                    })
                });
                
                if (response.ok) {
                    successCount++;
                } else {
                    failCount++;
                }
                
                // 添加小延迟避免ID冲突
                await new Promise(resolve => setTimeout(resolve, 10));
            } catch (error) {
                failCount++;
            }
        }
        
        modal.remove();
        showAlert('完成', `成功创建 ${successCount} 个卡密${failCount > 0 ? `，失败 ${failCount} 个` : ''}`, () => {
            loadCardKeys(currentFilterProductId);
        });
    } catch (error) {
        console.error('批量创建卡密失败:', error);
        showAlert('错误', '批量创建失败: ' + error.message);
    }
}

// 删除卡密
async function deleteCardKey(cardKeyId) {
    showConfirm('确认删除', '确定要删除这个卡密吗？', async () => {
        try {
            const headers = getAuthHeaders();
            const response = await fetch(`${API_BASE_URL}/admin/cardkeys/${cardKeyId}`, {
                method: 'DELETE',
                headers: headers
            });
            
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || '删除失败');
            }
            
            showAlert('成功', '卡密删除成功', () => {
                loadCardKeys(currentFilterProductId);
            });
        } catch (error) {
            console.error('删除卡密失败:', error);
            showAlert('错误', '删除失败: ' + error.message);
        }
    });
}


// 系统设置相关功能

// 加载系统设置
async function loadSettings() {
    try {
        const headers = getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/admin/settings`, { headers });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const settings = await response.json();
        
        // 填充网站配置
        if (settings.site) {
            document.getElementById('siteName').value = settings.site.name || 'AI HACKER';
            document.getElementById('siteAnnouncement').value = settings.site.announcement || '';
            document.getElementById('footerCopyright').value = settings.site.footer_copyright || '';
            document.getElementById('purchaseInterval').value = settings.site.purchase_interval || '5';
            document.getElementById('enableRegister').checked = settings.site.enable_register !== 'false';
        }
        
        // 填充邮件配置
        if (settings.email) {
            document.getElementById('smtpHost').value = settings.email.smtp_host || '';
            document.getElementById('smtpPort').value = settings.email.smtp_port || 587;
            document.getElementById('smtpUsername').value = settings.email.username || '';
            document.getElementById('smtpPassword').value = ''; // 不显示密码
            document.getElementById('smtpFrom').value = settings.email.from || '';
        }
        
        // 填充法律文档
        if (settings.legal) {
            document.getElementById('termsOfService').value = settings.legal.terms || '';
            document.getElementById('privacyPolicy').value = settings.legal.privacy || '';
        }
    } catch (error) {
        console.error('加载系统设置失败:', error);
        if (error.message.includes('401')) {
            showAlert('错误', '登录已过期', () => {
                window.location.href = 'login.html';
            });
        } else if (error.message.includes('403')) {
            showAlert('错误', '权限不足，无法查看系统设置');
        } else {
            showAlert('错误', '加载系统设置失败');
        }
    }
}

// 保存网站配置
async function saveSiteConfig() {
    const siteName = document.getElementById('siteName').value.trim();
    const announcement = document.getElementById('siteAnnouncement').value.trim();
    const footerCopyright = document.getElementById('footerCopyright').value.trim();
    const purchaseInterval = document.getElementById('purchaseInterval').value.trim();
    const enableRegister = document.getElementById('enableRegister').checked ? 'true' : 'false';
    
    if (!siteName) {
        showAlert('提示', '请输入网站名称');
        return;
    }
    
    if (purchaseInterval && (isNaN(purchaseInterval) || parseInt(purchaseInterval) < 0)) {
        showAlert('提示', '购买间隔时间必须是大于等于0的整数，0表示不限制');
        return;
    }
    
    try {
        const headers = getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/admin/settings/site`, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify({
                site_name: siteName,
                announcement: announcement,
                footer_copyright: footerCopyright,
                purchase_interval: purchaseInterval || '5',
                enable_register: enableRegister
            })
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || '保存失败');
        }
        
        showAlert('成功', '网站配置保存成功');
    } catch (error) {
        console.error('保存网站配置失败:', error);
        showAlert('错误', '保存失败: ' + error.message);
    }
}

// 保存邮件配置
async function saveEmailConfig() {
    const smtpHost = document.getElementById('smtpHost').value.trim();
    const smtpPort = parseInt(document.getElementById('smtpPort').value);
    const smtpUsername = document.getElementById('smtpUsername').value.trim();
    const smtpPassword = document.getElementById('smtpPassword').value;
    const smtpFrom = document.getElementById('smtpFrom').value.trim();
    
    if (!smtpHost || !smtpPort || !smtpUsername || !smtpFrom) {
        showAlert('提示', '请填写完整的邮件配置信息');
        return;
    }
    
    const emailConfig = {
        smtp_host: smtpHost,
        smtp_port: smtpPort,
        username: smtpUsername,
        from: smtpFrom
    };
    
    // 如果填写了密码,则更新密码
    if (smtpPassword) {
        emailConfig.password = smtpPassword;
    }
    
    try {
        const headers = getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/admin/settings/email`, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify(emailConfig)
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || '保存失败');
        }
        
        showAlert('成功', '邮件配置保存成功', () => {
            // 清空密码输入框
            document.getElementById('smtpPassword').value = '';
        });
    } catch (error) {
        console.error('保存邮件配置失败:', error);
        showAlert('错误', '保存失败: ' + error.message);
    }
}

// 测试邮件配置
async function testEmailConfig() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user.email) {
        showAlert('错误', '无法获取用户邮箱');
        return;
    }
    
    try {
        const headers = getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/admin/settings/test-email`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                to: user.email
            })
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || '测试失败');
        }
        
        showAlert('成功', `测试邮件已发送到 ${user.email}，请查收`);
    } catch (error) {
        console.error('测试邮件失败:', error);
        showAlert('错误', '测试失败: ' + error.message);
    }
}

// 保存法律文档配置
async function saveLegalConfig() {
    const terms = document.getElementById('termsOfService').value.trim();
    const privacy = document.getElementById('privacyPolicy').value.trim();
    
    try {
        const headers = getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/admin/settings/legal`, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify({
                terms: terms,
                privacy: privacy
            })
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || '保存失败');
        }
        
        showAlert('成功', '法律文档保存成功');
    } catch (error) {
        console.error('保存法律文档失败:', error);
        showAlert('错误', '保存失败: ' + error.message);
    }
}
