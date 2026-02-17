package models

import "time"

// Product 商品结构
type Product struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Price       float64 `json:"price"`
	Stock       int     `json:"stock"`
}

// Order 订单结构
type Order struct {
	ID          string    `json:"id"`
	ProductName string    `json:"product_name"`
	Email       string    `json:"email"`
	Amount      float64   `json:"amount"`
	Status      string    `json:"status"`
	CardKey     string    `json:"card_key"`
	CreatedAt   time.Time `json:"created_at"`
}

// User 用户结构
type User struct {
	ID       string `json:"id"`
	Email    string `json:"email"`
	Password string `json:"password"`
	Role     int    `json:"role"` // 1:普通用户 2:管理员 3:超级管理员
}

// CardKey 卡密结构
type CardKey struct {
	ID        string `json:"id"`
	ProductID string `json:"product_id"`
	Key       string `json:"key"`
	Status    string `json:"status"` // unused:未使用 used:已使用
	OrderID   string `json:"order_id,omitempty"`
	UsedAt    string `json:"used_at,omitempty"`
}

// Role 角色结构
type Role struct {
	ID          int      `json:"id"`
	Name        string   `json:"name"`
	Permissions []string `json:"permissions"`
}

// Setting 系统设置
type Setting struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

// Claims JWT 声明结构
type Claims struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
}
