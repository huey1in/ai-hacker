package utils

import (
	"crypto/rand"
	"fmt"
	"sync"
	"time"
)

// VerifyCodeData 验证码结构
type VerifyCodeData struct {
	Code      string
	Email     string
	ExpiresAt time.Time
}

var (
	// 验证码存储（生产环境建议使用 Redis）
	verifyCodes = make(map[string]*VerifyCodeData)
	verifyMutex sync.RWMutex
)

// GenerateID 生成唯一ID（时间戳）
func GenerateID() string {
	return fmt.Sprintf("%d", time.Now().UnixNano())
}

// GenerateVerifyCode 生成6位数字验证码
func GenerateVerifyCode() string {
	const digits = "0123456789"
	b := make([]byte, 6)
	rand.Read(b)
	
	code := make([]byte, 6)
	for i := range code {
		code[i] = digits[int(b[i])%len(digits)]
	}
	
	return string(code)
}

// SaveVerifyCode 保存验证码
func SaveVerifyCode(email, code string) {
	verifyMutex.Lock()
	defer verifyMutex.Unlock()
	
	verifyCodes[email] = &VerifyCodeData{
		Code:      code,
		Email:     email,
		ExpiresAt: time.Now().Add(5 * time.Minute), // 5分钟有效期
	}
}

// VerifyCode 验证验证码
func VerifyCode(email, code string) bool {
	verifyMutex.RLock()
	defer verifyMutex.RUnlock()
	
	vc, exists := verifyCodes[email]
	if !exists {
		return false
	}
	
	// 检查是否过期
	if time.Now().After(vc.ExpiresAt) {
		return false
	}
	
	// 验证码匹配
	return vc.Code == code
}

// DeleteVerifyCode 删除验证码（验证成功后删除）
func DeleteVerifyCode(email string) {
	verifyMutex.Lock()
	defer verifyMutex.Unlock()
	
	delete(verifyCodes, email)
}

// CleanExpiredCodes 清理过期验证码（定期调用）
func CleanExpiredCodes() {
	verifyMutex.Lock()
	defer verifyMutex.Unlock()
	
	now := time.Now()
	for email, vc := range verifyCodes {
		if now.After(vc.ExpiresAt) {
			delete(verifyCodes, email)
		}
	}
}

// SendVerifyCodeEmail 发送验证码邮件
func SendVerifyCodeEmail(email, code string) error {
	siteName := GetSiteName()
	subject := siteName + " - 注册验证码"
	body := fmt.Sprintf(`
		<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
			<h2 style="color: #000;">注册验证码</h2>
			<p>您正在注册 %s 账号，验证码为：</p>
			<div style="background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
				%s
			</div>
			<p style="color: #666;">验证码有效期为 5 分钟，请尽快完成注册。</p>
			<p style="color: #999; font-size: 12px;">如果这不是您的操作，请忽略此邮件。</p>
		</div>
	`, siteName, code)
	
	return SendEmail(email, subject, body)
}
