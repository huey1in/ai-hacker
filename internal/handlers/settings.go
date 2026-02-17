package handlers

import (
	"ai-hacker/internal/config"
	"ai-hacker/internal/models"
	"ai-hacker/internal/utils"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

const settingsFile = "data/settings.json"

// GetSettings 获取系统设置
func GetSettings(c *gin.Context) {
	var settings []models.Setting
	utils.LoadFromFile(settingsFile, &settings)
	
	// 构建设置映射
	settingsMap := make(map[string]string)
	for _, s := range settings {
		settingsMap[s.Key] = s.Value
	}
	
	// 如果数据库中没有配置,使用配置文件中的默认值
	cfg := config.GetConfig()
	if settingsMap["smtp_host"] == "" {
		settingsMap["smtp_host"] = cfg.Email.SMTPHost
	}
	if settingsMap["smtp_port"] == "" {
		settingsMap["smtp_port"] = string(rune(cfg.Email.SMTPPort))
	}
	if settingsMap["smtp_username"] == "" {
		settingsMap["smtp_username"] = cfg.Email.Username
	}
	if settingsMap["smtp_from"] == "" {
		settingsMap["smtp_from"] = cfg.Email.From
	}
	if settingsMap["site_name"] == "" {
		settingsMap["site_name"] = "AI HACKER"
	}
	
	// 返回配置,但不返回密码
	c.JSON(http.StatusOK, gin.H{
		"email": gin.H{
			"smtp_host": settingsMap["smtp_host"],
			"smtp_port": settingsMap["smtp_port"],
			"username":  settingsMap["smtp_username"],
			"from":      settingsMap["smtp_from"],
		},
		"site": gin.H{
			"name":                settingsMap["site_name"],
			"announcement":        settingsMap["site_announcement"],
			"footer_copyright":    settingsMap["footer_copyright"],
			"enable_register":     settingsMap["enable_register"],
			"purchase_interval":   settingsMap["purchase_interval"],
		},
		"legal": gin.H{
			"terms":             settingsMap["terms_of_service"],
			"privacy":           settingsMap["privacy_policy"],
			"terms_updated_at":  settingsMap["terms_updated_at"],
			"privacy_updated_at": settingsMap["privacy_updated_at"],
		},
	})
}

// GetPurchaseInterval 获取购买间隔配置（分钟）
func GetPurchaseInterval() int {
	var settings []models.Setting
	utils.LoadFromFile(settingsFile, &settings)
	
	for _, s := range settings {
		if s.Key == "purchase_interval" && s.Value != "" {
			// 转换为整数
			if interval, err := strconv.Atoi(s.Value); err == nil && interval >= 0 {
				return interval
			}
		}
	}
	
	// 默认 5 分钟
	return 5
}

// GetLegalDocs 获取法律文档（公开接口）
func GetLegalDocs(c *gin.Context) {
	var settings []models.Setting
	utils.LoadFromFile(settingsFile, &settings)
	
	// 构建设置映射
	settingsMap := make(map[string]string)
	for _, s := range settings {
		settingsMap[s.Key] = s.Value
	}
	
	c.JSON(http.StatusOK, gin.H{
		"terms":             settingsMap["terms_of_service"],
		"privacy":           settingsMap["privacy_policy"],
		"terms_updated_at":  settingsMap["terms_updated_at"],
		"privacy_updated_at": settingsMap["privacy_updated_at"],
	})
}

// UpdateEmailConfig 更新邮件配置
func UpdateEmailConfig(c *gin.Context) {
	var req struct {
		SMTPHost string `json:"smtp_host"`
		SMTPPort int    `json:"smtp_port"`
		Username string `json:"username"`
		Password string `json:"password"`
		From     string `json:"from"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}

	var settings []models.Setting
	utils.LoadFromFile(settingsFile, &settings)
	
	// 更新或添加设置
	updateSetting(&settings, "smtp_host", req.SMTPHost)
	updateSetting(&settings, "smtp_port", string(rune(req.SMTPPort)))
	updateSetting(&settings, "smtp_username", req.Username)
	updateSetting(&settings, "smtp_from", req.From)
	
	// 如果提供了密码,则更新密码
	if req.Password != "" {
		updateSetting(&settings, "smtp_password", req.Password)
	}

	// 保存到数据文件
	utils.SaveToFile(settingsFile, settings)

	c.JSON(http.StatusOK, gin.H{"message": "邮件配置更新成功"})
}

// UpdateSiteConfig 更新网站配置
func UpdateSiteConfig(c *gin.Context) {
	var req struct {
		SiteName         string `json:"site_name" binding:"required"`
		Announcement     string `json:"announcement"`
		FooterCopyright  string `json:"footer_copyright"`
		EnableRegister   string `json:"enable_register"`
		PurchaseInterval string `json:"purchase_interval"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}

	var settings []models.Setting
	utils.LoadFromFile(settingsFile, &settings)
	
	// 更新网站配置
	updateSetting(&settings, "site_name", req.SiteName)
	updateSetting(&settings, "site_announcement", req.Announcement)
	updateSetting(&settings, "footer_copyright", req.FooterCopyright)
	updateSetting(&settings, "enable_register", req.EnableRegister)
	updateSetting(&settings, "purchase_interval", req.PurchaseInterval)

	// 保存到数据文件
	utils.SaveToFile(settingsFile, settings)

	c.JSON(http.StatusOK, gin.H{"message": "网站配置更新成功"})
}

// UpdateLegalConfig 更新法律文档配置
func UpdateLegalConfig(c *gin.Context) {
	var req struct {
		Terms   string `json:"terms"`
		Privacy string `json:"privacy"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}

	var settings []models.Setting
	utils.LoadFromFile(settingsFile, &settings)
	
	// 获取当前时间
	currentTime := time.Now().Format("2006-01-02")
	
	// 更新服务条款和隐私政策
	if req.Terms != "" {
		updateSetting(&settings, "terms_of_service", req.Terms)
		updateSetting(&settings, "terms_updated_at", currentTime)
	}
	if req.Privacy != "" {
		updateSetting(&settings, "privacy_policy", req.Privacy)
		updateSetting(&settings, "privacy_updated_at", currentTime)
	}

	// 保存到数据文件
	utils.SaveToFile(settingsFile, settings)

	c.JSON(http.StatusOK, gin.H{"message": "法律文档更新成功"})
}

// TestEmail 测试邮件发送
func TestEmail(c *gin.Context) {
	var req struct {
		To string `json:"to" binding:"required,email"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "邮箱格式错误"})
		return
	}

	// 发送测试邮件
	subject := "测试邮件 - AI HACKER"
	body := `
		<html>
		<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
			<div style="max-width: 600px; margin: 0 auto; padding: 20px;">
				<h2 style="color: #000; border-bottom: 2px solid #000; padding-bottom: 10px;">邮件配置测试</h2>
				<p>您好，</p>
				<p>这是一封测试邮件，用于验证 AI HACKER 系统的邮件配置是否正确。</p>
				<p>如果您收到这封邮件，说明邮件服务配置成功。</p>
				<hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
				<p style="color: #999; font-size: 12px;">此邮件由系统自动发送，请勿回复。</p>
			</div>
		</body>
		</html>
	`

	if err := utils.SendEmail(req.To, subject, body); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "发送测试邮件失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "测试邮件发送成功"})
}

// updateSetting 更新或添加设置项
func updateSetting(settings *[]models.Setting, key, value string) {
	found := false
	for i := range *settings {
		if (*settings)[i].Key == key {
			(*settings)[i].Value = value
			found = true
			break
		}
	}
	
	if !found {
		*settings = append(*settings, models.Setting{
			Key:   key,
			Value: value,
		})
	}
}
