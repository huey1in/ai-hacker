// 主应用 JS 文件
// 此文件用于处理页面交互逻辑

// API 基础 URL (将在页面加载时从服务器获取)
let API_BASE_URL = 'http://localhost:8080/api';

// 初始化 API 配置
async function initApiConfig() {
    try {
        // 尝试从当前域名获取配置
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

// 全局变量存储所有商品
let allProducts = [];

// 自定义弹窗函数
function showModal(title, message, callback) {
    // 创建弹窗元素
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal-content">
            <div class="modal-title">${title}</div>
            <div class="modal-message">${message}</div>
            <button class="modal-button">确定</button>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // 显示动画
    setTimeout(() => overlay.classList.add('show'), 10);
    
    // 绑定关闭事件
    const closeModal = () => {
        overlay.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(overlay);
            if (callback) callback();
        }, 200);
    };
    
    overlay.querySelector('.modal-button').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });
}

// 加载商品列表
async function loadProducts() {
    try {
        const response = await fetch(`${API_BASE_URL}/products`);
        const products = await response.json();
        
        allProducts = products;
        displayProducts(products);
    } catch (error) {
        console.error('加载商品失败:', error);
    }
}

// 显示商品列表
function displayProducts(products) {
    const productList = document.getElementById('productList');
    if (!productList) return;
    
    if (products.length === 0) {
        productList.innerHTML = '<p class="text-gray-500 text-center col-span-full">暂无商品</p>';
        return;
    }
    
    productList.innerHTML = products.map(product => `
        <div class="card-container p-6 flex flex-col">
            <div class="flex justify-between items-start mb-4">
                <h3 class="text-lg font-medium">${product.name}</h3>
                <span class="stock-tag ${product.stock > 10 ? 'stock-high' : 'stock-low'}">
                    库存 ${product.stock}
                </span>
            </div>
            <p class="text-gray-500 text-sm mb-6 flex-grow">${product.description}</p>
            <div class="flex items-center justify-between mt-auto pt-6 border-t border-gray-50">
                <span class="price-text text-xl">￥${product.price.toFixed(2)}</span>
                <button class="text-sm bg-black text-white px-6 py-2 rounded hover:bg-gray-800" 
                        onclick="buyProduct('${product.id}')">立即购买</button>
            </div>
        </div>
    `).join('');
}

// 搜索商品
function searchProducts(keyword) {
    if (!keyword.trim()) {
        displayProducts(allProducts);
        return;
    }
    
    const filtered = allProducts.filter(product => 
        product.name.toLowerCase().includes(keyword.toLowerCase()) ||
        product.description.toLowerCase().includes(keyword.toLowerCase())
    );
    
    displayProducts(filtered);
}

// 初始化搜索功能
function initSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', (e) => {
        searchProducts(e.target.value);
    });
}

// 查询订单
async function searchOrders() {
    const orderIdInput = document.getElementById('orderIdInput');
    const emailInput = document.getElementById('orderEmailInput');
    
    if (!orderIdInput || !emailInput) return;
    
    const orderId = orderIdInput.value.trim();
    const email = emailInput.value.trim();
    
    if (!orderId || !email) {
        showModal('提示', '请输入订单号和邮箱地址');
        return;
    }
    
    try {
        const params = new URLSearchParams();
        params.append('order_id', orderId);
        params.append('email', email);
        
        const response = await fetch(`${API_BASE_URL}/orders?${params}`);
        const orders = await response.json();
        
        displayOrders(orders);
    } catch (error) {
        console.error('查询订单失败:', error);
        showModal('错误', '查询失败，请稍后重试');
    }
}

// 加载用户所有订单
async function loadUserOrders() {
    const user = checkLoginStatus();
    if (!user) return;
    
    try {
        const params = new URLSearchParams();
        params.append('email', user.email);
        
        const response = await fetch(`${API_BASE_URL}/orders?${params}`);
        const orders = await response.json();
        
        displayOrders(orders);
    } catch (error) {
        console.error('加载订单失败:', error);
    }
}

// 显示订单列表
function displayOrders(orders) {
    const orderList = document.getElementById('orderList');
    if (!orderList) return;
    
    const title = '<h2 class="text-xl font-medium mb-4">订单记录</h2>';
    
    if (orders.length === 0) {
        orderList.innerHTML = title + '<p class="text-gray-500 text-center">未找到相关订单</p>';
        return;
    }
    
    const orderCards = orders.map((order, index) => `
        <div class="card-container p-6">
            <div class="flex justify-between items-start mb-4">
                <div>
                    <div class="text-sm text-gray-500 mb-1">订单号: ${order.id}</div>
                    <h3 class="text-lg font-medium">${order.product_name}</h3>
                </div>
                <span class="status-badge ${order.status === '已完成' ? 'status-completed' : 'status-pending'}">
                    ${order.status}
                </span>
            </div>
            <div class="grid grid-cols-2 gap-4 text-sm mb-4">
                <div>
                    <span class="text-gray-500">购买时间:</span>
                    <span class="ml-2">${formatDate(order.created_at)}</span>
                </div>
                <div>
                    <span class="text-gray-500">支付金额:</span>
                    <span class="ml-2 font-medium">￥${order.amount.toFixed(2)}</span>
                </div>
            </div>
            <div class="pt-4 border-t border-gray-100">
                <div class="text-sm text-gray-500 mb-1">卡密:</div>
                <div class="flex items-center gap-2">
                    <div id="cardKey-${index}" class="font-mono text-base font-medium bg-gray-50 p-3 rounded flex-1">
                        ${maskCardKey(order.card_key)}
                    </div>
                    <button onclick="toggleCardKey(${index}, '${order.card_key}')" 
                            class="p-3 hover:bg-gray-100 rounded transition-colors"
                            title="显示/隐藏">
                        <svg id="eyeIcon-${index}" class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                        </svg>
                    </button>
                    <button onclick="copyCardKey('${order.card_key}')" 
                            class="p-3 hover:bg-gray-100 rounded transition-colors"
                            title="复制卡密">
                        <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
    
    orderList.innerHTML = title + orderCards;
}

// 脱敏显示卡密
function maskCardKey(cardKey) {
    if (cardKey.length <= 8) {
        return cardKey;
    }
    // 显示前4个和后4个字符，中间用星号代替
    const start = cardKey.substring(0, 4);
    const end = cardKey.substring(cardKey.length - 4);
    const middle = '*'.repeat(cardKey.length - 8);
    return start + middle + end;
}

// 复制卡密
async function copyCardKey(cardKey) {
    try {
        await navigator.clipboard.writeText(cardKey);
        showModal('成功', '卡密已复制到剪贴板');
    } catch (error) {
        // 降级方案：使用传统方法
        const textarea = document.createElement('textarea');
        textarea.value = cardKey;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            showModal('成功', '卡密已复制到剪贴板');
        } catch (err) {
            showModal('错误', '复制失败，请手动复制');
        }
        document.body.removeChild(textarea);
    }
}

// 切换卡密显示
function toggleCardKey(index, realCardKey) {
    const cardKeyElement = document.getElementById(`cardKey-${index}`);
    const eyeIcon = document.getElementById(`eyeIcon-${index}`);
    
    if (cardKeyElement.textContent.includes('*')) {
        // 显示真实卡密
        cardKeyElement.textContent = realCardKey;
        eyeIcon.innerHTML = `
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
        `;
    } else {
        // 隐藏卡密
        cardKeyElement.textContent = maskCardKey(realCardKey);
        eyeIcon.innerHTML = `
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
        `;
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

// 发送验证码
let sendCodeTimer = null;
let sendCodeCountdown = 0;

async function sendVerifyCode() {
    const email = document.getElementById('registerEmail').value.trim();
    
    if (!email) {
        showModal('提示', '请先输入邮箱地址');
        return;
    }
    
    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showModal('提示', '请输入有效的邮箱地址');
        return;
    }
    
    // 如果正在倒计时，不允许重复发送
    if (sendCodeCountdown > 0) {
        return;
    }
    
    const sendCodeBtn = document.getElementById('sendCodeBtn');
    sendCodeBtn.disabled = true;
    sendCodeBtn.textContent = '发送中...';
    
    try {
        const response = await fetch(`${API_BASE_URL}/send-verify-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showModal('成功', data.message);
            
            // 开始60秒倒计时
            sendCodeCountdown = 60;
            sendCodeBtn.textContent = `${sendCodeCountdown}秒后重试`;
            
            sendCodeTimer = setInterval(() => {
                sendCodeCountdown--;
                if (sendCodeCountdown > 0) {
                    sendCodeBtn.textContent = `${sendCodeCountdown}秒后重试`;
                } else {
                    clearInterval(sendCodeTimer);
                    sendCodeBtn.disabled = false;
                    sendCodeBtn.textContent = '发送验证码';
                }
            }, 1000);
        } else {
            showModal('错误', data.error || '发送失败');
            sendCodeBtn.disabled = false;
            sendCodeBtn.textContent = '发送验证码';
        }
    } catch (error) {
        console.error('发送验证码失败:', error);
        showModal('错误', '发送失败，请稍后重试');
        sendCodeBtn.disabled = false;
        sendCodeBtn.textContent = '发送验证码';
    }
}

// 用户注册
async function handleRegister(event) {
    event.preventDefault();
    
    const email = document.getElementById('registerEmail').value.trim();
    const verifyCode = document.getElementById('registerVerifyCode').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    
    if (!email || !verifyCode || !password || !confirmPassword) {
        showModal('提示', '请填写完整信息');
        return;
    }
    
    if (password !== confirmPassword) {
        showModal('提示', '两次输入的密码不一致');
        return;
    }
    
    if (password.length < 6) {
        showModal('提示', '密码至少需要6位字符');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                password,
                verify_code: verifyCode
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // 保存 Token 到 localStorage
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            showModal('成功', '注册成功', () => {
                window.location.href = 'index.html';
            });
        } else {
            showModal('错误', data.error || '注册失败');
        }
    } catch (error) {
        console.error('注册失败:', error);
        showModal('错误', '注册失败，请稍后重试');
    }
}

// 检查注册是否开启
async function checkRegisterEnabled() {
    try {
        const response = await fetch('/api/site-config');
        if (response.ok) {
            const config = await response.json();
            if (config.enable_register === 'false') {
                // 注册已关闭，显示提示并跳转
                document.body.innerHTML = `
                    <div class="min-h-screen flex items-center justify-center bg-gray-50">
                        <div class="max-w-md w-full mx-4">
                            <div class="bg-white rounded-lg border border-gray-200 p-8 text-center">
                                <h2 class="text-2xl font-light mb-4">注册暂时关闭</h2>
                                <p class="text-gray-600 mb-6">管理员已暂时关闭新用户注册功能</p>
                                <a href="login.html" class="inline-block px-6 py-2 bg-black text-white rounded hover:bg-gray-800">
                                    返回登录
                                </a>
                            </div>
                        </div>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('检查注册开关失败:', error);
    }
}

// 用户登录
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        showModal('提示', '请填写完整信息');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // 保存 Token 和用户信息到 localStorage
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            // 根据用户角色跳转
            if (data.user.role >= 2) {
                // 管理员或超级管理员跳转到后台
                showModal('成功', '登录成功', () => {
                    window.location.href = 'admin.html';
                });
            } else {
                // 普通用户跳转到前台
                showModal('成功', '登录成功', () => {
                    window.location.href = 'index.html';
                });
            }
        } else {
            showModal('错误', data.error || '登录失败');
        }
    } catch (error) {
        console.error('登录失败:', error);
        showModal('错误', '登录失败，请稍后重试');
    }
}

// 退出登录
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

// 检查登录状态
function checkLoginStatus() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
        return JSON.parse(user);
    }
    return null;
}

// 获取认证请求头
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
}

// 购买商品
async function buyProduct(productId) {
    // 检查登录状态
    const user = checkLoginStatus();
    
    // 如果未登录,显示邮箱输入对话框
    if (!user) {
        showEmailInputModal(productId);
        return;
    }
    
    // 已登录用户直接购买
    await processPurchase(productId, user.email);
}

// 显示邮箱输入对话框
function showEmailInputModal(productId) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.onclick = function(e) {
        if (e.target === overlay) {
            overlay.classList.remove('show');
            setTimeout(() => document.body.removeChild(overlay), 200);
        }
    };
    overlay.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <div class="modal-title">购买商品</div>
            <div class="modal-message">请输入您的邮箱地址，卡密将发送到此邮箱</div>
            <input type="email" id="purchaseEmail" placeholder="your@email.com" class="input-field" style="margin: 20px 0;">
            <div style="display: flex; gap: 10px;">
                <button class="flex-1 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded" onclick="this.closest('.modal-overlay').remove()">
                    取消
                </button>
                <button class="flex-1 px-4 py-2 bg-black text-white rounded hover:bg-gray-800" onclick="confirmPurchase('${productId}')">
                    确认购买
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    setTimeout(() => overlay.classList.add('show'), 10);
    
    // 聚焦到邮箱输入框
    setTimeout(() => {
        const emailInput = document.getElementById('purchaseEmail');
        if (emailInput) emailInput.focus();
    }, 100);
}

// 确认购买
async function confirmPurchase(productId) {
    const email = document.getElementById('purchaseEmail').value.trim();
    
    if (!email) {
        showModal('提示', '请输入邮箱地址');
        return;
    }
    
    // 简单的邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showModal('提示', '请输入有效的邮箱地址');
        return;
    }
    
    // 关闭邮箱输入对话框
    const overlay = document.querySelector('.modal-overlay');
    if (overlay) {
        overlay.remove();
    }
    
    // 执行购买
    await processPurchase(productId, email);
}

// 处理购买逻辑
async function processPurchase(productId, email) {
    try {
        const response = await fetch(`${API_BASE_URL}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                product_id: productId,
                email: email
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showModal('购买成功', `订单号: ${data.order_id}<br>卡密已发送到您的邮箱: ${email}<br>请妥善保管订单号，可在"查询订单"页面查看详情`, () => {
                // 刷新商品列表以更新库存
                loadProducts();
            });
        } else {
            showModal('购买失败', data.error || '购买失败，请稍后重试');
        }
    } catch (error) {
        console.error('购买失败:', error);
        showModal('错误', '购买失败，请稍后重试');
    }
}

// 更新导航栏登录状态
function updateNavbar() {
    const user = checkLoginStatus();
    
    // 桌面端
    const notLoggedIn = document.getElementById('notLoggedIn');
    const loggedIn = document.getElementById('loggedIn');
    const userEmail = document.getElementById('userEmail');
    
    // 移动端
    const mobileNotLoggedIn = document.getElementById('mobileNotLoggedIn');
    const mobileLoggedIn = document.getElementById('mobileLoggedIn');
    const mobileUserEmail = document.getElementById('mobileUserEmail');
    
    if (user) {
        // 已登录 - 桌面端
        if (notLoggedIn && loggedIn) {
            notLoggedIn.classList.add('hidden');
            loggedIn.classList.remove('hidden');
            loggedIn.classList.add('flex');
            if (userEmail) {
                userEmail.textContent = user.email;
            }
        }
        
        // 已登录 - 移动端
        if (mobileNotLoggedIn && mobileLoggedIn) {
            mobileNotLoggedIn.classList.add('hidden');
            mobileLoggedIn.classList.remove('hidden');
            if (mobileUserEmail) {
                mobileUserEmail.textContent = user.email;
            }
        }
    } else {
        // 未登录 - 桌面端
        if (notLoggedIn && loggedIn) {
            notLoggedIn.classList.remove('hidden');
            loggedIn.classList.add('hidden');
            loggedIn.classList.remove('flex');
        }
        
        // 未登录 - 移动端
        if (mobileNotLoggedIn && mobileLoggedIn) {
            mobileNotLoggedIn.classList.remove('hidden');
            mobileLoggedIn.classList.add('hidden');
        }
    }
}

// 切换移动端菜单
function toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    if (mobileMenu) {
        mobileMenu.classList.toggle('hidden');
    }
}

// 初始化移动端菜单
function initMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', toggleMobileMenu);
    }
}

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', async function() {
    // 初始化 API 配置
    await initApiConfig();
    
    // 更新导航栏状态
    updateNavbar();
    
    // 初始化移动端菜单
    initMobileMenu();
    
    // 主页加载商品
    if (document.getElementById('productList')) {
        loadProducts();
        initSearch();
    }
    
    // 订单页面
    const orderPage = document.getElementById('orderList');
    if (orderPage) {
        // 如果已登录，自动加载用户订单
        const user = checkLoginStatus();
        if (user) {
            loadUserOrders();
        }
        
        // 绑定查询按钮
        const searchButton = document.getElementById('searchOrderBtn');
        if (searchButton) {
            searchButton.addEventListener('click', searchOrders);
        }
        
        // 支持回车键查询
        const orderIdInput = document.getElementById('orderIdInput');
        const emailInput = document.getElementById('orderEmailInput');
        if (orderIdInput && emailInput) {
            orderIdInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') searchOrders();
            });
            emailInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') searchOrders();
            });
        }
    }
    
    // 注册页面绑定表单
    if (window.location.pathname.includes('register')) {
        // 检查注册开关
        await checkRegisterEnabled();
        
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', handleRegister);
        }
    }
    
    // 登录页面绑定表单
    if (window.location.pathname.includes('login')) {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', handleLogin);
        }
    }
    
    // 忘记密码页面
    if (window.location.pathname.includes('forgot-password')) {
        initForgotPasswordPage();
    }
    
    // 重置密码页面
    if (window.location.pathname.includes('reset-password')) {
        initResetPasswordPage();
    }
});



// 忘记密码 - 发送重置链接
async function handleForgotPassword(event) {
    event.preventDefault();
    
    const email = document.getElementById('emailInput').value.trim();
    
    if (!email) {
        showModal('提示', '请输入邮箱地址');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showModal('成功', '重置密码链接已发送到您的邮箱，请查收。链接有效期为30分钟。', () => {
                window.location.href = 'login.html';
            });
        } else {
            showModal('错误', data.error || '发送失败，请稍后重试');
        }
    } catch (error) {
        console.error('发送重置链接失败:', error);
        showModal('错误', '发送失败，请稍后重试');
    }
}

// 重置密码
async function handleResetPassword(event) {
    event.preventDefault();
    
    const newPassword = document.getElementById('newPasswordInput').value;
    const confirmPassword = document.getElementById('confirmPasswordInput').value;
    
    if (!newPassword || !confirmPassword) {
        showModal('提示', '请填写完整信息');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showModal('提示', '两次输入的密码不一致');
        return;
    }
    
    if (newPassword.length < 6) {
        showModal('提示', '密码至少需要6位字符');
        return;
    }
    
    // 从 URL 获取 token
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (!token) {
        showModal('错误', '无效的重置链接', () => {
            window.location.href = 'login.html';
        });
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: token,
                new_password: newPassword
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showModal('成功', '密码重置成功，请使用新密码登录', () => {
                window.location.href = 'login.html';
            });
        } else {
            showModal('错误', data.error || '重置失败，请重新申请重置链接');
        }
    } catch (error) {
        console.error('重置密码失败:', error);
        showModal('错误', '重置失败，请稍后重试');
    }
}

// 初始化忘记密码页面
function initForgotPasswordPage() {
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', handleForgotPassword);
    }
}

// 初始化重置密码页面
function initResetPasswordPage() {
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    if (resetPasswordForm) {
        resetPasswordForm.addEventListener('submit', handleResetPassword);
    }
}
