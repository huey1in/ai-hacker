# AI HACKER 数字卡密交易平台

基于 Go (Gin) + JSON 存储的数字商品卡密销售系统

## 功能特性

- 商品管理: 商品增删改查、库存自动管理
- 订单管理: 订单查询、状态管理
- 用户系统: 注册登录、JWT认证、角色权限
- 卡密管理: 卡密自动分配、批量导入
- 邮件通知: 购买成功自动发送卡密到邮箱
- 找回密码: 邮件重置密码功能
- 管理后台: 完整的后台管理系统
- 权限控制: 基于角色的细粒度权限管理
- 系统设置: 可视化配置邮件服务

## 项目结构

```
.
├── static/                 # 前端静态文件
│   ├── css/               # 样式文件
│   ├── js/                # JavaScript 文件
│   ├── images/            # 图片资源
│   ├── index.html         # 商品展示页
│   ├── order.html         # 订单查询页
│   ├── login.html         # 登录页
│   ├── register.html      # 注册页
│   ├── forgot-password.html  # 忘记密码页
│   ├── reset-password.html   # 重置密码页
│   └── admin.html         # 管理后台
├── data/                  # JSON 数据存储
│   ├── products.json      # 商品数据
│   ├── orders.json        # 订单数据
│   ├── users.json         # 用户数据
│   ├── roles.json         # 角色权限数据
│   ├── card_keys.json     # 卡密数据
│   └── settings.json      # 系统设置
├── internal/              # 内部代码
│   ├── config/           # 配置管理
│   ├── handlers/         # 请求处理器
│   ├── middleware/       # 中间件
│   ├── models/           # 数据模型
│   └── utils/            # 工具函数
├── config.json           # 配置文件
├── main.go              # 主程序
└── README.md            # 说明文档
```

## 快速开始

### 1. 环境要求

- Go 1.16 或更高版本
- 现代浏览器

### 2. 安装依赖

```bash
go mod download
```

### 3. 配置系统

复制配置文件模板:
```bash
copy config.example.json config.json
```

编辑 `config.json`:
```json
{
  "server": {
    "port": "8080",
    "mode": "release",
    "domain": "http://localhost:8080"
  },
  "security": {
    "jwt_secret": "your-secret-key-change-this"
  }
}
```

重要配置说明:
- `server.port`: 服务器端口
- `server.mode`: 运行模式 (release/debug)
- `server.domain`: 网站域名(生产环境需修改)
- `security.jwt_secret`: JWT密钥(生产环境必须修改)

### 4. 启动服务器

```bash
go run main.go
```

或编译后运行:
```bash
go build
./ai-hacker.exe
```

### 5. 访问系统

- 前台: http://localhost:8080
- 后台: http://localhost:8080/admin.html

### 6. 默认管理员账号

系统首次启动会自动创建超级管理员:
- 邮箱: admin@aihacker.com
- 密码: admin123

登录后请立即修改密码!

## 邮件配置

系统支持两种配置方式:

### 方式一: 后台界面配置(推荐)

1. 使用超级管理员账号登录后台
2. 进入"系统设置"页面
3. 填写邮件服务器信息:
   - SMTP 服务器: smtp.qq.com (QQ邮箱)
   - SMTP 端口: 587
   - 邮箱地址: your@qq.com
   - SMTP 授权码: (不是登录密码)
   - 发件人名称: AI HACKER <your@qq.com>
4. 点击"测试邮件"验证配置
5. 点击"保存配置"

### 方式二: 配置文件

编辑 `config.json`:
```json
{
  "email": {
    "smtp_host": "smtp.qq.com",
    "smtp_port": 587,
    "username": "your@qq.com",
    "password": "your-smtp-authorization-code",
    "from": "AI HACKER <your@qq.com>"
  }
}
```

注意: 数据库配置优先级高于配置文件

### QQ邮箱 SMTP 授权码获取

1. 登录 QQ 邮箱
2. 设置 -> 账户
3. 开启 SMTP 服务
4. 生成授权码
5. 使用授权码而不是 QQ 密码

## 生产环境部署

### 1. 修改配置

编辑 `config.json`:
```json
{
  "server": {
    "port": "8080",
    "mode": "release",
    "domain": "https://yourdomain.com"
  },
  "security": {
    "jwt_secret": "生成一个强随机密钥"
  }
}
```

### 2. 编译程序

```bash
go build -o ai-hacker
```

### 3. 配置反向代理(Nginx 示例)

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 4. 配置 HTTPS

使用 Let's Encrypt 免费证书:
```bash
certbot --nginx -d yourdomain.com
```

### 5. 后台运行

使用 systemd 或 supervisor 管理进程

systemd 示例 (/etc/systemd/system/ai-hacker.service):
```ini
[Unit]
Description=AI HACKER Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/ai-hacker
ExecStart=/path/to/ai-hacker/ai-hacker
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

启动服务:
```bash
systemctl enable ai-hacker
systemctl start ai-hacker
```

## 使用说明

### 商品管理

1. 登录后台,进入"商品管理"
2. 点击"添加商品"创建商品(商品ID自动生成)
3. 进入"卡密管理"为商品添加卡密
4. 库存由卡密数量自动计算

### 卡密管理

1. 进入"卡密管理"页面
2. 选择商品
3. 单个添加或批量添加卡密
4. 用户购买后卡密自动分配

### 权限管理

系统内置三种角色:
- 普通用户(ID:1): 只能查看和购买商品
- 管理员(ID:2): 可管理商品、订单、用户
- 超级管理员(ID:3): 拥有所有权限

超级管理员可以:
- 创建自定义角色
- 分配细粒度权限
- 管理系统设置

## 数据备份

建议定期备份 `data/` 目录下的所有 JSON 文件:

```bash
# 备份脚本示例
tar -czf backup-$(date +%Y%m%d).tar.gz data/
```

## 安全建议

1. 修改默认管理员密码
2. 生产环境使用强 JWT 密钥
3. 启用 HTTPS
4. 定期备份数据
5. 限制管理后台访问 IP
6. 定期更新依赖包

## API 接口

### 公开接口

- GET /api/config - 获取 API 配置
- GET /api/products - 获取商品列表
- POST /api/orders - 创建订单
- GET /api/orders - 查询订单
- POST /api/register - 用户注册
- POST /api/login - 用户登录
- POST /api/forgot-password - 忘记密码
- POST /api/reset-password - 重置密码

### 管理接口

需要管理员权限,详见代码中的路由定义

## 常见问题

### 1. 邮件发送失败

- 检查 SMTP 配置是否正确
- 确认使用的是授权码而不是登录密码
- 查看服务器日志获取详细错误信息

### 2. 登录后跳转到前台

- 检查用户角色是否为管理员(role >= 2)
- 清除浏览器缓存和 localStorage

### 3. 购买后没有收到邮件

- 检查邮件配置
- 查看系统日志
- 在后台"系统设置"中测试邮件

### 4. 生产环境 API 地址错误

- 确认 config.json 中的 domain 配置正确
- 清除浏览器缓存

## 技术栈

- 后端: Go + Gin
- 前端: HTML + Tailwind CSS + Vanilla JS
- 存储: JSON 文件
- 认证: JWT
- 邮件: SMTP

## 开发计划

- [ ] 数据库支持(MySQL/PostgreSQL)
- [ ] 支付接口集成
- [ ] 订单统计报表
- [ ] 多语言支持
- [ ] Docker 部署支持

## 许可证

MIT License

## 联系方式

如有问题或建议,请提交 Issue
