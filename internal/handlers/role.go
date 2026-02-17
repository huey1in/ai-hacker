package handlers

import (
	"ai-hacker/internal/models"
	"ai-hacker/internal/utils"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

const rolesFile = "data/roles.json"

// GetAllRoles 获取所有角色（管理员）
func GetAllRoles(c *gin.Context) {
	var roles []models.Role
	utils.LoadFromFile(rolesFile, &roles)
	c.JSON(http.StatusOK, roles)
}

// CreateRole 创建角色（超级管理员）
func CreateRole(c *gin.Context) {
	var newRole models.Role
	if err := c.ShouldBindJSON(&newRole); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var roles []models.Role
	utils.LoadFromFile(rolesFile, &roles)

	// 检查 ID 是否已存在
	for _, role := range roles {
		if role.ID == newRole.ID {
			c.JSON(http.StatusConflict, gin.H{"error": "角色 ID 已存在"})
			return
		}
	}

	// 检查名称是否已存在
	for _, role := range roles {
		if role.Name == newRole.Name {
			c.JSON(http.StatusConflict, gin.H{"error": "角色名称已存在"})
			return
		}
	}

	roles = append(roles, newRole)
	utils.SaveToFile(rolesFile, roles)

	c.JSON(http.StatusOK, gin.H{
		"message": "角色创建成功",
		"role":    newRole,
	})
}

// UpdateRole 更新角色权限（超级管理员）
func UpdateRole(c *gin.Context) {
	roleIDStr := c.Param("id")
	roleID, err := strconv.Atoi(roleIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的角色 ID"})
		return
	}

	var updateData struct {
		Permissions []string `json:"permissions" binding:"required"`
	}

	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var roles []models.Role
	utils.LoadFromFile(rolesFile, &roles)

	found := false
	for i := range roles {
		if roles[i].ID == roleID {
			roles[i].Permissions = updateData.Permissions
			found = true
			break
		}
	}

	if !found {
		c.JSON(http.StatusNotFound, gin.H{"error": "角色不存在"})
		return
	}

	utils.SaveToFile(rolesFile, roles)

	c.JSON(http.StatusOK, gin.H{
		"message": "角色权限更新成功",
	})
}

// DeleteRole 删除角色（超级管理员）
func DeleteRole(c *gin.Context) {
	roleIDStr := c.Param("id")
	roleID, err := strconv.Atoi(roleIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的角色 ID"})
		return
	}

	// 不能删除系统默认角色 (1, 2, 3)
	if roleID <= 3 {
		c.JSON(http.StatusForbidden, gin.H{"error": "不能删除系统默认角色"})
		return
	}

	// 检查是否有用户使用该角色
	var users []models.User
	utils.LoadFromFile(usersFile, &users)

	for _, user := range users {
		if user.Role == roleID {
			c.JSON(http.StatusConflict, gin.H{"error": "该角色下还有用户,无法删除"})
			return
		}
	}

	var roles []models.Role
	utils.LoadFromFile(rolesFile, &roles)

	found := false
	newRoles := []models.Role{}
	for _, role := range roles {
		if role.ID == roleID {
			found = true
			continue
		}
		newRoles = append(newRoles, role)
	}

	if !found {
		c.JSON(http.StatusNotFound, gin.H{"error": "角色不存在"})
		return
	}

	utils.SaveToFile(rolesFile, newRoles)

	c.JSON(http.StatusOK, gin.H{"message": "角色删除成功"})
}
