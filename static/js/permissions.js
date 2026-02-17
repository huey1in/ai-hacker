// 权限配置文件

// 权限中文映射
const PERMISSION_MAP = {
    'dashboard:view': '查看仪表盘',
    'product:manage': '商品管理',
    'cardkey:manage': '卡密管理',
    'order:view': '查看订单',
    'order:manage': '订单管理',
    'user:manage': '用户管理',
    'role:manage': '角色管理',
    'system:manage': '系统设置'
};

// 权限分组
const PERMISSION_GROUPS = {
    '基础功能': ['dashboard:view'],
    '商品与卡密': ['product:manage', 'cardkey:manage'],
    '订单管理': ['order:view', 'order:manage'],
    '用户与权限': ['user:manage', 'role:manage'],
    '系统设置': ['system:manage']
};

// 所有可用权限
const ALL_PERMISSIONS = Object.keys(PERMISSION_MAP);

// 角色名称映射
const ROLE_NAMES = {
    1: '普通用户',
    2: '运营人员',
    3: '超级管理员'
};

// 权限说明
const PERMISSION_DESCRIPTIONS = {
    'dashboard:view': '可以访问后台仪表盘,查看统计数据',
    'product:manage': '可以创建、编辑、删除商品',
    'cardkey:manage': '可以管理卡密,包括添加、删除卡密',
    'order:view': '可以查看订单列表,但不能修改',
    'order:manage': '可以编辑、删除订单',
    'user:manage': '可以创建、编辑、删除用户',
    'role:manage': '可以管理角色和权限',
    'system:manage': '可以修改系统设置,如邮件配置'
};
