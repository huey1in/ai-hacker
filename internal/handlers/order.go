package handlers

import (
	"ai-hacker/internal/models"
	"ai-hacker/internal/utils"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

const ordersFile = "data/orders.json"

// GetOrders 获取订单列表
func GetOrders(c *gin.Context) {
	email := c.Query("email")
	orderID := c.Query("order_id")

	var orders []models.Order
	utils.LoadFromFile(ordersFile, &orders)

	var filteredOrders []models.Order

	// 如果提供了订单号和邮箱，精确匹配
	if orderID != "" && email != "" {
		for _, order := range orders {
			if order.Email == email && order.ID == orderID {
				filteredOrders = append(filteredOrders, order)
			}
		}
	} else if email != "" {
		// 如果只提供了邮箱，返回该邮箱的所有订单
		for _, order := range orders {
			if order.Email == email {
				filteredOrders = append(filteredOrders, order)
			}
		}
	}

	c.JSON(http.StatusOK, filteredOrders)
}

// CreateOrder 创建订单
func CreateOrder(c *gin.Context) {
	var req struct {
		ProductID string `json:"product_id" binding:"required"`
		Email     string `json:"email" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}

	// 获取商品信息
	var products []models.Product
	utils.LoadFromFile(productsFile, &products)

	var product *models.Product
	for i := range products {
		if products[i].ID == req.ProductID {
			product = &products[i]
			break
		}
	}

	if product == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "商品不存在"})
		return
	}

	// 检查库存（从卡密表获取）
	stock := GetProductStock(req.ProductID)
	if stock <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "商品库存不足"})
		return
	}

	// 防盗刷：检查该邮箱是否在短时间内购买过相同商品
	var orders []models.Order
	utils.LoadFromFile(ordersFile, &orders)
	
	// 获取购买间隔配置（分钟）
	purchaseInterval := GetPurchaseInterval()
	
	// 如果购买间隔大于 0，则进行限制检查
	if purchaseInterval > 0 {
		now := time.Now()
		for _, order := range orders {
			if order.Email == req.Email && order.ProductName == product.Name {
				// 检查是否在配置的时间间隔内购买过相同商品
				if now.Sub(order.CreatedAt) < time.Duration(purchaseInterval)*time.Minute {
					c.JSON(http.StatusBadRequest, gin.H{"error": "您刚刚已购买过该商品，请稍后再试"})
					return
				}
			}
		}
	}

	// 获取可用卡密
	cardKey := GetAvailableCardKey(req.ProductID)
	if cardKey == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "暂无可用卡密"})
		return
	}

	// 生成订单号
	orderID := fmt.Sprintf("ORD%d", time.Now().UnixNano())

	// 标记卡密为已使用
	MarkCardKeyAsUsed(cardKey.ID, orderID)

	// 创建订单
	newOrder := models.Order{
		ID:          orderID,
		ProductName: product.Name,
		Email:       req.Email,
		Amount:      product.Price,
		Status:      "已完成",
		CardKey:     cardKey.Key,
		CreatedAt:   time.Now(),
	}

	// 保存订单
	orders = append(orders, newOrder)
	utils.SaveToFile(ordersFile, orders)

	// 发送邮件通知（异步）
	go func() {
		if err := utils.SendOrderEmail(req.Email, orderID, product.Name, cardKey.Key, product.Price); err != nil {
			// 记录错误但不影响订单创建
			fmt.Printf("发送邮件失败: %v\n", err)
		}
	}()

	c.JSON(http.StatusOK, gin.H{
		"message":  "购买成功",
		"order_id": orderID,
		"order":    newOrder,
	})
}
