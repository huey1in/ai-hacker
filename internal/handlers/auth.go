package handlers

import (
	"ai-hacker/internal/models"
	"ai-hacker/internal/utils"
	"net/http"

	"github.com/gin-gonic/gin"
)

const usersFile = "data/users.json"

// SendVerifyCode 发送注册验证码
func SendVerifyCode(c *gin.Context) {
	var req struct {
		Email string `json:"email" binding:"required,email"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "邮箱格式错误"})
		return
	}

	var users []models.User
	utils.LoadFromFile(usersFile, &users)

	// 检查邮箱是否已注册
	for _, user := range users {
		if user.Email == req.Email {
			c.JSON(http.StatusConflict, gin.H{"error": "该邮箱已被注册"})
			return
		}
	}

	// 生成验证码
	code := utils.GenerateVerifyCode()
	utils.SaveVerifyCode(req.Email, code)

	// 发送验证码邮件
	if err := utils.SendVerifyCodeEmail(req.Email, code); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "发送验证码失败，请检查邮件配置"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "验证码已发送，请查收邮件"})
}

// Register 用户注册
func Register(c *gin.Context) {
	var req struct {
		Email      string `json:"email" binding:"required,email"`
		Password   string `json:"password" binding:"required,min=6"`
		VerifyCode string `json:"verify_code" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}

	// 验证验证码
	if !utils.VerifyCode(req.Email, req.VerifyCode) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "验证码错误或已过期"})
		return
	}

	var users []models.User
	utils.LoadFromFile(usersFile, &users)

	// 检查邮箱是否已存在
	for _, user := range users {
		if user.Email == req.Email {
			c.JSON(http.StatusConflict, gin.H{"error": "邮箱已被注册"})
			return
		}
	}

	// 加密密码
	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "密码加密失败"})
		return
	}

	// 创建新用户
	newUser := models.User{
		ID:       "U" + utils.GenerateID(),
		Email:    req.Email,
		Password: hashedPassword,
		Role:     1, // 默认为普通用户
	}

	users = append(users, newUser)
	utils.SaveToFile(usersFile, users)

	// 删除已使用的验证码
	utils.DeleteVerifyCode(req.Email)

	// 生成 JWT Token
	token, err := utils.GenerateToken(newUser.ID, newUser.Email, newUser.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "生成令牌失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "注册成功",
		"token":   token,
		"user": gin.H{
			"id":    newUser.ID,
			"email": newUser.Email,
			"role":  newUser.Role,
		},
	})
}

// Login 用户登录
func Login(c *gin.Context) {
	var loginData models.User
	if err := c.ShouldBindJSON(&loginData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var users []models.User
	utils.LoadFromFile(usersFile, &users)

	// 验证用户
	for _, user := range users {
		if user.Email == loginData.Email {
			// 验证密码
			if !utils.CheckPassword(loginData.Password, user.Password) {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "邮箱或密码错误"})
				return
			}

			// 生成 JWT Token，包含 role 信息
			token, err := utils.GenerateToken(user.ID, user.Email, user.Role)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "生成令牌失败"})
				return
			}

			c.JSON(http.StatusOK, gin.H{
				"message": "登录成功",
				"token":   token,
				"user": gin.H{
					"id":    user.ID,
					"email": user.Email,
					"role":  user.Role,
				},
			})
			return
		}
	}

	c.JSON(http.StatusUnauthorized, gin.H{"error": "邮箱或密码错误"})
}

// ForgotPassword 忘记密码
func ForgotPassword(c *gin.Context) {
	var req struct {
		Email string `json:"email" binding:"required,email"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "邮箱格式错误"})
		return
	}

	var users []models.User
	utils.LoadFromFile(usersFile, &users)

	// 检查邮箱是否存在
	found := false
	for _, user := range users {
		if user.Email == req.Email {
			found = true
			break
		}
	}

	if !found {
		c.JSON(http.StatusNotFound, gin.H{"error": "该邮箱未注册"})
		return
	}

	// 生成重置令牌
	token, err := utils.GenerateResetToken(req.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "生成重置令牌失败"})
		return
	}

	// 发送重置密码邮件
	if err := utils.SendResetPasswordEmail(req.Email, token); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "发送邮件失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "重置密码邮件已发送，请查收"})
}

// ResetPassword 重置密码
func ResetPassword(c *gin.Context) {
	var req struct {
		Token       string `json:"token" binding:"required"`
		NewPassword string `json:"new_password" binding:"required,min=6"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}

	// 验证令牌
	email, valid := utils.ValidateResetToken(req.Token)
	if !valid {
		c.JSON(http.StatusBadRequest, gin.H{"error": "重置令牌无效或已过期"})
		return
	}

	var users []models.User
	utils.LoadFromFile(usersFile, &users)

	// 更新密码
	found := false
	for i := range users {
		if users[i].Email == email {
			hashedPassword, err := utils.HashPassword(req.NewPassword)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "密码加密失败"})
				return
			}
			users[i].Password = hashedPassword
			found = true
			break
		}
	}

	if !found {
		c.JSON(http.StatusNotFound, gin.H{"error": "用户不存在"})
		return
	}

	utils.SaveToFile(usersFile, users)
	utils.DeleteResetToken(req.Token)

	c.JSON(http.StatusOK, gin.H{"message": "密码重置成功"})
}

// ChangePassword 修改密码
func ChangePassword(c *gin.Context) {
	var req struct {
		OldPassword string `json:"old_password" binding:"required"`
		NewPassword string `json:"new_password" binding:"required,min=6"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}

	// 从上下文获取用户邮箱
	email, exists := c.Get("email")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "未登录"})
		return
	}

	var users []models.User
	utils.LoadFromFile(usersFile, &users)

	// 查找用户并验证旧密码
	found := false
	for i := range users {
		if users[i].Email == email.(string) {
			// 验证旧密码
			if !utils.CheckPassword(req.OldPassword, users[i].Password) {
				c.JSON(http.StatusBadRequest, gin.H{"error": "旧密码错误"})
				return
			}

			// 加密新密码
			hashedPassword, err := utils.HashPassword(req.NewPassword)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "密码加密失败"})
				return
			}
			users[i].Password = hashedPassword
			found = true
			break
		}
	}

	if !found {
		c.JSON(http.StatusNotFound, gin.H{"error": "用户不存在"})
		return
	}

	utils.SaveToFile(usersFile, users)

	c.JSON(http.StatusOK, gin.H{"message": "密码修改成功"})
}
