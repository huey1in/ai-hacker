package config

import (
	"encoding/json"
	"os"
)

// Config 应用配置结构
type Config struct {
	Server   ServerConfig   `json:"server"`
	Email    EmailConfig    `json:"email"`
	Security SecurityConfig `json:"security"`
}

// ServerConfig 服务器配置
type ServerConfig struct {
	Port   string `json:"port"`
	Mode   string `json:"mode"`
	Domain string `json:"domain"`
}

// EmailConfig 邮件配置
type EmailConfig struct {
	SMTPHost string `json:"smtp_host"`
	SMTPPort int    `json:"smtp_port"`
	Username string `json:"username"`
	Password string `json:"password"`
	From     string `json:"from"`
}

// SecurityConfig 安全配置
type SecurityConfig struct {
	JWTSecret string `json:"jwt_secret"`
}

var globalConfig *Config

// LoadConfig 加载配置文件
func LoadConfig(configPath string) (*Config, error) {
	// 尝试从配置文件加载
	file, err := os.Open(configPath)
	if err != nil {
		// 如果配置文件不存在,使用默认配置
		return getDefaultConfig(), nil
	}
	defer file.Close()

	var config Config
	decoder := json.NewDecoder(file)
	if err := decoder.Decode(&config); err != nil {
		return nil, err
	}

	// 环境变量覆盖配置文件
	overrideWithEnv(&config)

	globalConfig = &config
	return &config, nil
}

// GetConfig 获取全局配置
func GetConfig() *Config {
	if globalConfig == nil {
		globalConfig = getDefaultConfig()
	}
	return globalConfig
}

// overrideWithEnv 使用环境变量覆盖配置
func overrideWithEnv(config *Config) {
	// 服务器配置
	if port := os.Getenv("SERVER_PORT"); port != "" {
		config.Server.Port = port
	}
	if mode := os.Getenv("SERVER_MODE"); mode != "" {
		config.Server.Mode = mode
	}

	// 邮件配置
	if smtpHost := os.Getenv("SMTP_HOST"); smtpHost != "" {
		config.Email.SMTPHost = smtpHost
	}
	if smtpPort := os.Getenv("SMTP_PORT"); smtpPort != "" {
		// 简单处理,实际应该转换为 int
		config.Email.SMTPPort = 587
	}
	if username := os.Getenv("SMTP_USERNAME"); username != "" {
		config.Email.Username = username
	}
	if password := os.Getenv("SMTP_PASSWORD"); password != "" {
		config.Email.Password = password
	}
	if from := os.Getenv("SMTP_FROM"); from != "" {
		config.Email.From = from
	}

	// 安全配置
	if jwtSecret := os.Getenv("JWT_SECRET"); jwtSecret != "" {
		config.Security.JWTSecret = jwtSecret
	}
}

// getDefaultConfig 获取默认配置
func getDefaultConfig() *Config {
	return &Config{
		Server: ServerConfig{
			Port:   "8080",
			Mode:   "release",
			Domain: "http://localhost:8080",
		},
		Email: EmailConfig{
			SMTPHost: "smtp.example.com",
			SMTPPort: 587,
			Username: "your-email@example.com",
			Password: "your-password",
			From:     "AI HACKER <your-email@example.com>",
		},
		Security: SecurityConfig{
			JWTSecret: "default-secret-key-change-this",
		},
	}
}

// IsEmailConfigured 检查邮件是否已配置
func (c *Config) IsEmailConfigured() bool {
	return c.Email.SMTPHost != "smtp.example.com" &&
		c.Email.Username != "your-email@example.com" &&
		c.Email.Password != "your-password"
}
