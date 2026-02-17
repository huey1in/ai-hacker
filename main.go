package main

import (
	"ai-hacker/internal/config"
	"ai-hacker/internal/handlers"
	"ai-hacker/internal/middleware"
	"ai-hacker/internal/models"
	"ai-hacker/internal/utils"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
)

func main() {
	// 加载配置
	cfg, err := config.LoadConfig("config.json")
	if err != nil {
		log.Printf("警告: 加载配置文件失败,使用默认配置: %v", err)
	}

	// 检查邮件配置
	if !cfg.IsEmailConfigured() {
		log.Println("警告: 邮件服务未配置")
		log.Println("请复制 config.example.json 为 config.json 并配置邮件信息")
		log.Println("或设置环境变量: SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM")
	}

	// 初始化数据目录
	initDataDir()

	// 设置 Gin 模式
	gin.SetMode(cfg.Server.Mode)

	router := gin.Default()

	// 配置 CORS
	router.Use(middleware.CORS())

	// 创建限流器：每个 IP 每分钟最多 20 次请求
	limiter := middleware.NewRateLimiter(20, time.Minute)

	// API 路由
	api := router.Group("/api")
	{
		// 获取 API 配置(公开接口)
		api.GET("/config", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"api_url": cfg.Server.Domain,
			})
		})
		
		// 获取网站配置(公开接口)
		api.GET("/site-config", func(c *gin.Context) {
			var settings []models.Setting
			utils.LoadFromFile("data/settings.json", &settings)
			
			settingsMap := make(map[string]string)
			for _, s := range settings {
				settingsMap[s.Key] = s.Value
			}
			
			// 默认值
			siteName := "AI HACKER"
			if settingsMap["site_name"] != "" {
				siteName = settingsMap["site_name"]
			}
			
			enableRegister := "true"
			if settingsMap["enable_register"] != "" {
				enableRegister = settingsMap["enable_register"]
			}
			
			c.JSON(http.StatusOK, gin.H{
				"site_name":         siteName,
				"announcement":      settingsMap["site_announcement"],
				"footer_copyright":  settingsMap["footer_copyright"],
				"enable_register":   enableRegister,
			})
		})
		
		// 获取法律文档(公开接口)
		api.GET("/legal-docs", func(c *gin.Context) {
			var settings []models.Setting
			utils.LoadFromFile("data/settings.json", &settings)
			
			settingsMap := make(map[string]string)
			for _, s := range settings {
				settingsMap[s.Key] = s.Value
			}
			
			c.JSON(http.StatusOK, gin.H{
				"terms":              settingsMap["terms_of_service"],
				"privacy":            settingsMap["privacy_policy"],
				"terms_updated_at":   settingsMap["terms_updated_at"],
				"privacy_updated_at": settingsMap["privacy_updated_at"],
			})
		})
		
		// 商品查询不限流
		api.GET("/products", handlers.GetProducts)
		
		// 订单相关限流
		api.GET("/orders", middleware.RateLimit(limiter), handlers.GetOrders)
		
		// 创建订单严格限流：每分钟最多 5 次
		orderLimiter := middleware.NewRateLimiter(5, time.Minute)
		api.POST("/orders", middleware.RateLimit(orderLimiter), handlers.CreateOrder)
		
		// 认证相关限流
		authLimiter := middleware.NewRateLimiter(10, time.Minute)
		api.POST("/send-verify-code", middleware.RateLimit(authLimiter), handlers.SendVerifyCode)
		api.POST("/register", middleware.RateLimit(authLimiter), handlers.Register)
		api.POST("/login", middleware.RateLimit(authLimiter), handlers.Login)
		api.POST("/forgot-password", middleware.RateLimit(authLimiter), handlers.ForgotPassword)
		api.POST("/reset-password", middleware.RateLimit(authLimiter), handlers.ResetPassword)
		
		// 修改密码需要认证
		api.POST("/change-password", middleware.Auth(), handlers.ChangePassword)
		
		// 管理员接口 - 需要管理员权限
		admin := api.Group("/admin")
		admin.Use(middleware.AdminAuth())
		{
			// 订单管理
			admin.GET("/orders", middleware.RequirePermission("order:view"), handlers.GetAllOrders)
			admin.PUT("/orders/:id", middleware.RequirePermission("order:manage"), handlers.UpdateOrder)
			admin.DELETE("/orders/:id", middleware.RequirePermission("order:manage"), handlers.DeleteOrder)
			
			// 用户管理
			admin.GET("/users", middleware.RequirePermission("user:manage"), handlers.GetAllUsers)
			admin.POST("/users", middleware.RequirePermission("user:manage"), handlers.CreateUser)
			admin.PUT("/users/:id", middleware.RequirePermission("user:manage"), handlers.UpdateUser)
			admin.DELETE("/users/:id", middleware.RequirePermission("user:manage"), handlers.DeleteUser)
			
			// 商品管理
			admin.POST("/products", middleware.RequirePermission("product:manage"), handlers.CreateProduct)
			admin.PUT("/products/:id", middleware.RequirePermission("product:manage"), handlers.UpdateProduct)
			admin.DELETE("/products/:id", middleware.RequirePermission("product:manage"), handlers.DeleteProduct)
			
			// 卡密管理
			admin.GET("/cardkeys", middleware.RequirePermission("cardkey:manage"), handlers.GetCardKeys)
			admin.POST("/cardkeys", middleware.RequirePermission("cardkey:manage"), handlers.CreateCardKey)
			admin.DELETE("/cardkeys/:id", middleware.RequirePermission("cardkey:manage"), handlers.DeleteCardKey)
			
			// 角色管理
			admin.GET("/roles", middleware.RequirePermission("role:manage"), handlers.GetAllRoles)
			admin.POST("/roles", middleware.RequirePermission("role:manage"), handlers.CreateRole)
			admin.PUT("/roles/:id", middleware.RequirePermission("role:manage"), handlers.UpdateRole)
			admin.DELETE("/roles/:id", middleware.RequirePermission("role:manage"), handlers.DeleteRole)
			
			// 系统设置
			admin.GET("/settings", middleware.RequirePermission("system:manage"), handlers.GetSettings)
			admin.PUT("/settings/email", middleware.RequirePermission("system:manage"), handlers.UpdateEmailConfig)
			admin.PUT("/settings/site", middleware.RequirePermission("system:manage"), handlers.UpdateSiteConfig)
			admin.PUT("/settings/legal", middleware.RequirePermission("system:manage"), handlers.UpdateLegalConfig)
			admin.POST("/settings/test-email", middleware.RequirePermission("system:manage"), handlers.TestEmail)
		}
	}

	// 静态文件服务
	router.Static("/css", "./static/css")
	router.Static("/js", "./static/js")
	router.Static("/images", "./static/images")
	router.StaticFile("/", "./static/index.html")
	router.StaticFile("/index.html", "./static/index.html")
	router.StaticFile("/order.html", "./static/order.html")
	router.StaticFile("/login.html", "./static/login.html")
	router.StaticFile("/register.html", "./static/register.html")
	router.StaticFile("/forgot-password.html", "./static/forgot-password.html")
	router.StaticFile("/reset-password.html", "./static/reset-password.html")
	router.StaticFile("/terms.html", "./static/terms.html")
	router.StaticFile("/privacy.html", "./static/privacy.html")
	router.StaticFile("/admin", "./static/admin.html")
	router.StaticFile("/admin.html", "./static/admin.html")

	router.Run(":" + cfg.Server.Port)
}

// 初始化数据目录
func initDataDir() {
	if _, err := os.Stat("data"); os.IsNotExist(err) {
		os.Mkdir("data", 0755)
	}

	// 初始化空数据文件
	utils.InitFileIfNotExists("data/products.json", []models.Product{})
	utils.InitFileIfNotExists("data/orders.json", []models.Order{})
	utils.InitFileIfNotExists("data/users.json", []models.User{})
	utils.InitFileIfNotExists("data/roles.json", []models.Role{})
	utils.InitFileIfNotExists("data/card_keys.json", []models.CardKey{})
	utils.InitFileIfNotExists("data/settings.json", []models.Setting{})
	
	// 检查并创建超级管理员
	ensureSuperAdmin()
}

// 确保系统中存在超级管理员
func ensureSuperAdmin() {
	var users []models.User
	utils.LoadFromFile("data/users.json", &users)
	
	// 检查是否存在超级管理员 (role = 3)
	hasSuperAdmin := false
	for _, user := range users {
		if user.Role == 3 {
			hasSuperAdmin = true
			break
		}
	}
	
	// 如果不存在超级管理员,创建默认超级管理员
	if !hasSuperAdmin {
		// 默认密码: admin123
		hashedPassword, err := utils.HashPassword("admin123")
		if err != nil {
			panic("创建超级管理员失败: " + err.Error())
		}
		
		superAdmin := models.User{
			ID:       "super_admin_001",
			Email:    "admin@aihacker.com",
			Password: hashedPassword,
			Role:     3,
		}
		
		users = append(users, superAdmin)
		utils.SaveToFile("data/users.json", users)
		
		println("系统初始化: 已创建默认超级管理员")
		println("邮箱: admin@aihacker.com")
		println("密码: admin123")
		println("请登录后及时修改密码")
	}
}
