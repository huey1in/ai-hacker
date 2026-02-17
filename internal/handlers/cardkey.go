package handlers

import (
	"ai-hacker/internal/models"
	"ai-hacker/internal/utils"
	"net/http"

	"github.com/gin-gonic/gin"
)

const cardKeysFile = "data/card_keys.json"

// GetCardKeys 获取卡密列表（管理员）
func GetCardKeys(c *gin.Context) {
	productID := c.Query("product_id")

	var cardKeys []models.CardKey
	utils.LoadFromFile(cardKeysFile, &cardKeys)

	// 如果指定了商品ID,只返回该商品的卡密
	if productID != "" {
		filtered := []models.CardKey{}
		for _, ck := range cardKeys {
			if ck.ProductID == productID {
				filtered = append(filtered, ck)
			}
		}
		c.JSON(http.StatusOK, filtered)
		return
	}

	c.JSON(http.StatusOK, cardKeys)
}

// CreateCardKey 创建卡密（管理员）
func CreateCardKey(c *gin.Context) {
	var newCardKey models.CardKey
	if err := c.ShouldBindJSON(&newCardKey); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var cardKeys []models.CardKey
	utils.LoadFromFile(cardKeysFile, &cardKeys)

	// 设置默认状态
	newCardKey.Status = "unused"

	cardKeys = append(cardKeys, newCardKey)
	utils.SaveToFile(cardKeysFile, cardKeys)

	c.JSON(http.StatusOK, gin.H{
		"message": "卡密创建成功",
		"cardkey": newCardKey,
	})
}

// DeleteCardKey 删除卡密（管理员）
func DeleteCardKey(c *gin.Context) {
	cardKeyID := c.Param("id")

	var cardKeys []models.CardKey
	utils.LoadFromFile(cardKeysFile, &cardKeys)

	found := false
	newCardKeys := []models.CardKey{}
	for _, ck := range cardKeys {
		if ck.ID == cardKeyID {
			found = true
			continue
		}
		newCardKeys = append(newCardKeys, ck)
	}

	if !found {
		c.JSON(http.StatusNotFound, gin.H{"error": "卡密不存在"})
		return
	}

	utils.SaveToFile(cardKeysFile, newCardKeys)

	c.JSON(http.StatusOK, gin.H{"message": "卡密删除成功"})
}

// GetAvailableCardKey 获取可用卡密
func GetAvailableCardKey(productID string) *models.CardKey {
	var cardKeys []models.CardKey
	utils.LoadFromFile(cardKeysFile, &cardKeys)

	for i := range cardKeys {
		if cardKeys[i].ProductID == productID && cardKeys[i].Status == "unused" {
			return &cardKeys[i]
		}
	}

	return nil
}

// MarkCardKeyAsUsed 标记卡密为已使用
func MarkCardKeyAsUsed(cardKeyID, orderID string) error {
	var cardKeys []models.CardKey
	utils.LoadFromFile(cardKeysFile, &cardKeys)

	for i := range cardKeys {
		if cardKeys[i].ID == cardKeyID {
			cardKeys[i].Status = "used"
			cardKeys[i].OrderID = orderID
			cardKeys[i].UsedAt = utils.GetCurrentTime()
			utils.SaveToFile(cardKeysFile, cardKeys)
			return nil
		}
	}

	return nil
}

// GetProductStock 获取商品库存（未使用的卡密数量）
func GetProductStock(productID string) int {
	var cardKeys []models.CardKey
	utils.LoadFromFile(cardKeysFile, &cardKeys)

	count := 0
	for _, ck := range cardKeys {
		if ck.ProductID == productID && ck.Status == "unused" {
			count++
		}
	}

	return count
}
