package handlers

import (
	"ai-hacker/internal/models"
	"ai-hacker/internal/utils"
	"net/http"

	"github.com/gin-gonic/gin"
)

// GetAllOrders 获取所有订单（管理员）
func GetAllOrders(c *gin.Context) {
	var orders []models.Order
	utils.LoadFromFile(ordersFile, &orders)
	c.JSON(http.StatusOK, orders)
}

// GetAllUsers 获取所有用户（管理员）
func GetAllUsers(c *gin.Context) {
	var users []models.User
	utils.LoadFromFile(usersFile, &users)
	
	// 不返回密码
	type UserResponse struct {
		ID    string `json:"id"`
		Email string `json:"email"`
		Role  int    `json:"role"`
	}
	
	var response []UserResponse
	for _, user := range users {
		response = append(response, UserResponse{
			ID:    user.ID,
			Email: user.Email,
			Role:  user.Role,
		})
	}
	
	c.JSON(http.StatusOK, response)
}

// DeleteUser 删除用户（超级管理员）
func DeleteUser(c *gin.Context) {
	userID := c.Param("id")

	var users []models.User
	utils.LoadFromFile(usersFile, &users)

	found := false
	var deletedUser models.User
	newUsers := []models.User{}
	
	for _, user := range users {
		if user.ID == userID {
			found = true
			deletedUser = user
			// 不能删除超级管理员
			if user.Role == 3 {
				c.JSON(http.StatusForbidden, gin.H{"error": "不能删除超级管理员"})
				return
			}
			continue
		}
		newUsers = append(newUsers, user)
	}

	if !found {
		c.JSON(http.StatusNotFound, gin.H{"error": "用户不存在"})
		return
	}

	utils.SaveToFile(usersFile, newUsers)

	c.JSON(http.StatusOK, gin.H{
		"message": "用户删除成功",
		"email":   deletedUser.Email,
	})
}


// DeleteOrder 删除订单（超级管理员）
func DeleteOrder(c *gin.Context) {
	orderID := c.Param("id")

	var orders []models.Order
	utils.LoadFromFile(ordersFile, &orders)

	found := false
	newOrders := []models.Order{}
	for _, order := range orders {
		if order.ID == orderID {
			found = true
			continue
		}
		newOrders = append(newOrders, order)
	}

	if !found {
		c.JSON(http.StatusNotFound, gin.H{"error": "订单不存在"})
		return
	}

	utils.SaveToFile(ordersFile, newOrders)

	c.JSON(http.StatusOK, gin.H{"message": "订单删除成功"})
}


// CreateUser 创建用户（超级管理员）
func CreateUser(c *gin.Context) {
	var newUser models.User
	if err := c.ShouldBindJSON(&newUser); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var users []models.User
	utils.LoadFromFile(usersFile, &users)

	// 检查邮箱是否已存在
	for _, user := range users {
		if user.Email == newUser.Email {
			c.JSON(http.StatusConflict, gin.H{"error": "邮箱已被注册"})
			return
		}
	}

	// 加密密码
	hashedPassword, err := utils.HashPassword(newUser.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "密码加密失败"})
		return
	}
	newUser.Password = hashedPassword

	users = append(users, newUser)
	utils.SaveToFile(usersFile, users)

	c.JSON(http.StatusOK, gin.H{
		"message": "用户创建成功",
		"user": gin.H{
			"id":    newUser.ID,
			"email": newUser.Email,
			"role":  newUser.Role,
		},
	})
}


// UpdateUser 更新用户信息（管理员）
func UpdateUser(c *gin.Context) {
	userID := c.Param("id")

	var updateData struct {
		Email    string `json:"email"`
		Password string `json:"password"`
		Role     int    `json:"role"`
	}

	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var users []models.User
	utils.LoadFromFile(usersFile, &users)

	found := false
	for i := range users {
		if users[i].ID == userID {
			// 更新邮箱
			if updateData.Email != "" {
				users[i].Email = updateData.Email
			}

			// 更新密码（如果提供）
			if updateData.Password != "" {
				hashedPassword, err := utils.HashPassword(updateData.Password)
				if err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": "密码加密失败"})
					return
				}
				users[i].Password = hashedPassword
			}

			// 更新角色
			users[i].Role = updateData.Role

			found = true
			break
		}
	}

	if !found {
		c.JSON(http.StatusNotFound, gin.H{"error": "用户不存在"})
		return
	}

	utils.SaveToFile(usersFile, users)

	c.JSON(http.StatusOK, gin.H{"message": "用户更新成功"})
}


// UpdateOrder 更新订单信息（管理员）
func UpdateOrder(c *gin.Context) {
	orderID := c.Param("id")

	var updateData struct {
		Status  string `json:"status"`
		CardKey string `json:"card_key"`
	}

	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var orders []models.Order
	utils.LoadFromFile(ordersFile, &orders)

	found := false
	for i := range orders {
		if orders[i].ID == orderID {
			// 更新状态
			if updateData.Status != "" {
				orders[i].Status = updateData.Status
			}

			// 更新卡密
			if updateData.CardKey != "" {
				orders[i].CardKey = updateData.CardKey
			}

			found = true
			break
		}
	}

	if !found {
		c.JSON(http.StatusNotFound, gin.H{"error": "订单不存在"})
		return
	}

	utils.SaveToFile(ordersFile, orders)

	c.JSON(http.StatusOK, gin.H{"message": "订单更新成功"})
}
