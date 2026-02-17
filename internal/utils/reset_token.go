package utils

import (
	"crypto/rand"
	"encoding/hex"
	"sync"
	"time"
)

// ResetToken 重置密码令牌
type ResetToken struct {
	Email     string
	ExpiresAt time.Time
}

// TokenStore 令牌存储
type TokenStore struct {
	tokens map[string]ResetToken
	mu     sync.RWMutex
}

var resetTokenStore = &TokenStore{
	tokens: make(map[string]ResetToken),
}

// GenerateResetToken 生成重置密码令牌
func GenerateResetToken(email string) (string, error) {
	// 生成随机令牌
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	token := hex.EncodeToString(bytes)

	// 存储令牌，30分钟有效期
	resetTokenStore.mu.Lock()
	resetTokenStore.tokens[token] = ResetToken{
		Email:     email,
		ExpiresAt: time.Now().Add(30 * time.Minute),
	}
	resetTokenStore.mu.Unlock()

	// 启动清理过期令牌
	go cleanExpiredTokens()

	return token, nil
}

// ValidateResetToken 验证重置密码令牌
func ValidateResetToken(token string) (string, bool) {
	resetTokenStore.mu.RLock()
	defer resetTokenStore.mu.RUnlock()

	resetToken, exists := resetTokenStore.tokens[token]
	if !exists {
		return "", false
	}

	if time.Now().After(resetToken.ExpiresAt) {
		return "", false
	}

	return resetToken.Email, true
}

// DeleteResetToken 删除重置密码令牌
func DeleteResetToken(token string) {
	resetTokenStore.mu.Lock()
	delete(resetTokenStore.tokens, token)
	resetTokenStore.mu.Unlock()
}

// cleanExpiredTokens 清理过期令牌
func cleanExpiredTokens() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		resetTokenStore.mu.Lock()
		now := time.Now()
		for token, resetToken := range resetTokenStore.tokens {
			if now.After(resetToken.ExpiresAt) {
				delete(resetTokenStore.tokens, token)
			}
		}
		resetTokenStore.mu.Unlock()
	}
}
