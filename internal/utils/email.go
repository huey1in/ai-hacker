package utils

import (
	"ai-hacker/internal/config"
	"ai-hacker/internal/models"
	"fmt"
	"log"
	"strconv"

	"gopkg.in/gomail.v2"
)

const settingsFile = "data/settings.json"

// getEmailConfig 获取邮件配置(优先从数据库读取)
func getEmailConfig() config.EmailConfig {
	var settings []models.Setting
	LoadFromFile(settingsFile, &settings)
	
	// 构建设置映射
	settingsMap := make(map[string]string)
	for _, s := range settings {
		settingsMap[s.Key] = s.Value
	}
	
	// 如果数据库中有配置,使用数据库配置
	if settingsMap["smtp_host"] != "" {
		port, _ := strconv.Atoi(settingsMap["smtp_port"])
		if port == 0 {
			port = 587
		}
		return config.EmailConfig{
			SMTPHost: settingsMap["smtp_host"],
			SMTPPort: port,
			Username: settingsMap["smtp_username"],
			Password: settingsMap["smtp_password"],
			From:     settingsMap["smtp_from"],
		}
	}
	
	// 否则使用配置文件中的配置
	cfg := config.GetConfig()
	return cfg.Email
}

// isEmailConfigured 检查邮件是否已配置
func isEmailConfigured(emailCfg config.EmailConfig) bool {
	return emailCfg.SMTPHost != "" &&
		emailCfg.SMTPHost != "smtp.example.com" &&
		emailCfg.Username != "" &&
		emailCfg.Username != "your-email@example.com" &&
		emailCfg.Password != "" &&
		emailCfg.Password != "your-password"
}

// SendEmail 发送邮件
func SendEmail(to, subject, body string) error {
	emailCfg := getEmailConfig()

	// 检查邮件是否已配置
	if !isEmailConfigured(emailCfg) {
		log.Printf("警告: 邮件未配置,跳过发送邮件到 %s", to)
		log.Println("请在后台系统设置中配置邮件服务器信息")
		return nil // 返回 nil 避免阻塞业务流程
	}

	m := gomail.NewMessage()
	m.SetHeader("From", emailCfg.From)
	m.SetHeader("To", to)
	m.SetHeader("Subject", subject)
	m.SetBody("text/html", body)

	d := gomail.NewDialer(
		emailCfg.SMTPHost,
		emailCfg.SMTPPort,
		emailCfg.Username,
		emailCfg.Password,
	)

	if err := d.DialAndSend(m); err != nil {
		return fmt.Errorf("发送邮件失败: %v", err)
	}

	log.Printf("邮件已发送到: %s", to)
	return nil
}

// SendOrderEmail 发送订单邮件
func SendOrderEmail(to, orderID, productName, cardKey string, amount float64) error {
	siteName := GetSiteName()
	subject := "订单购买成功 - " + siteName
	body := fmt.Sprintf(`
		<html>
		<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
			<div style="max-width: 600px; margin: 0 auto; padding: 20px;">
				<h2 style="color: #000; border-bottom: 2px solid #000; padding-bottom: 10px;">订单购买成功</h2>
				<p>您好，</p>
				<p>感谢您在 %s 购买商品，以下是您的订单信息：</p>
				<table style="width: 100%%; border-collapse: collapse; margin: 20px 0;">
					<tr style="background-color: #f5f5f5;">
						<td style="padding: 10px; border: 1px solid #ddd;"><strong>订单号</strong></td>
						<td style="padding: 10px; border: 1px solid #ddd;">%s</td>
					</tr>
					<tr>
						<td style="padding: 10px; border: 1px solid #ddd;"><strong>商品名称</strong></td>
						<td style="padding: 10px; border: 1px solid #ddd;">%s</td>
					</tr>
					<tr style="background-color: #f5f5f5;">
						<td style="padding: 10px; border: 1px solid #ddd;"><strong>支付金额</strong></td>
						<td style="padding: 10px; border: 1px solid #ddd;">￥%.2f</td>
					</tr>
					<tr>
						<td style="padding: 10px; border: 1px solid #ddd;"><strong>卡密</strong></td>
						<td style="padding: 10px; border: 1px solid #ddd; font-family: monospace; font-size: 16px; color: #000;">%s</td>
					</tr>
				</table>
				<p style="color: #666; font-size: 14px;">请妥善保管您的卡密，如有问题请联系客服。</p>
				<hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
				<p style="color: #999; font-size: 12px;">此邮件由系统自动发送，请勿回复。</p>
			</div>
		</body>
		</html>
	`, siteName, orderID, productName, amount, cardKey)

	return SendEmail(to, subject, body)
}

// SendResetPasswordEmail 发送重置密码邮件
func SendResetPasswordEmail(to, resetToken string) error {
	siteName := GetSiteName()
	cfg := config.GetConfig()
	subject := "重置密码 - " + siteName
	resetLink := fmt.Sprintf("%s/reset-password.html?token=%s", cfg.Server.Domain, resetToken)
	body := fmt.Sprintf(`
		<html>
		<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
			<div style="max-width: 600px; margin: 0 auto; padding: 20px;">
				<h2 style="color: #000; border-bottom: 2px solid #000; padding-bottom: 10px;">重置密码</h2>
				<p>您好，</p>
				<p>您请求重置 %s 账户密码。请点击下面的链接重置密码：</p>
				<p style="margin: 30px 0;">
					<a href="%s" style="display: inline-block; padding: 12px 30px; background-color: #000; color: #fff; text-decoration: none; border-radius: 5px;">重置密码</a>
				</p>
				<p style="color: #666; font-size: 14px;">此链接将在 30 分钟后失效。</p>
				<p style="color: #666; font-size: 14px;">如果您没有请求重置密码，请忽略此邮件。</p>
				<hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
				<p style="color: #999; font-size: 12px;">此邮件由系统自动发送，请勿回复。</p>
			</div>
		</body>
		</html>
	`, siteName, resetLink)

	return SendEmail(to, subject, body)
}
