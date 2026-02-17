package utils

import (
	"ai-hacker/internal/models"
)

const rolesFile = "data/roles.json"

// GetSiteName 获取网站名称
func GetSiteName() string {
	var settings []models.Setting
	LoadFromFile("data/settings.json", &settings)
	
	for _, s := range settings {
		if s.Key == "site_name" {
			return s.Value
		}
	}
	
	return "AI HACKER" // 默认值
}

// GetRolePermissions 获取角色的所有权限
func GetRolePermissions(roleID int) []string {
	var roles []models.Role
	LoadFromFile(rolesFile, &roles)
	
	for _, role := range roles {
		if role.ID == roleID {
			return role.Permissions
		}
	}
	
	return []string{}
}

// HasPermission 检查角色是否拥有指定权限
// 支持权限继承：manage 权限自动包含 view 权限
func HasPermission(roleID int, permission string) bool {
	permissions := GetRolePermissions(roleID)
	
	for _, p := range permissions {
		// 完全匹配
		if p == permission {
			return true
		}
		
		// 如果请求的是 view 权限，检查是否有对应的 manage 权限
		// 例如：有 order:manage 权限时，自动拥有 order:view 权限
		if len(permission) > 5 && permission[len(permission)-5:] == ":view" {
			managePermission := permission[:len(permission)-5] + ":manage"
			if p == managePermission {
				return true
			}
		}
	}
	
	return false
}

// HasAnyPermission 检查角色是否拥有任意一个指定权限
func HasAnyPermission(roleID int, permissions []string) bool {
	for _, permission := range permissions {
		if HasPermission(roleID, permission) {
			return true
		}
	}
	return false
}

// HasAllPermissions 检查角色是否拥有所有指定权限
func HasAllPermissions(roleID int, permissions []string) bool {
	for _, permission := range permissions {
		if !HasPermission(roleID, permission) {
			return false
		}
	}
	return true
}
