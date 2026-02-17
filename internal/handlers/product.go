package handlers

import (
	"ai-hacker/internal/models"
	"ai-hacker/internal/utils"
	"net/http"

	"github.com/gin-gonic/gin"
)

const productsFile = "data/products.json"

// GetProducts 获取商品列表
func GetProducts(c *gin.Context) {
	var products []models.Product
	utils.LoadFromFile(productsFile, &products)
	
	// 动态计算库存
	for i := range products {
		products[i].Stock = GetProductStock(products[i].ID)
	}
	
	c.JSON(http.StatusOK, products)
}

// CreateProduct 创建商品（管理员）
func CreateProduct(c *gin.Context) {
	var newProduct models.Product
	if err := c.ShouldBindJSON(&newProduct); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var products []models.Product
	utils.LoadFromFile(productsFile, &products)

	// 检查 ID 是否已存在
	for _, product := range products {
		if product.ID == newProduct.ID {
			c.JSON(http.StatusConflict, gin.H{"error": "商品 ID 已存在"})
			return
		}
	}

	products = append(products, newProduct)
	utils.SaveToFile(productsFile, products)

	c.JSON(http.StatusOK, gin.H{
		"message": "商品创建成功",
		"product": newProduct,
	})
}

// UpdateProduct 更新商品（管理员）
func UpdateProduct(c *gin.Context) {
	productID := c.Param("id")
	
	var updateData models.Product
	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var products []models.Product
	utils.LoadFromFile(productsFile, &products)

	found := false
	for i := range products {
		if products[i].ID == productID {
			// 保持 ID 不变
			updateData.ID = productID
			products[i] = updateData
			found = true
			break
		}
	}

	if !found {
		c.JSON(http.StatusNotFound, gin.H{"error": "商品不存在"})
		return
	}

	utils.SaveToFile(productsFile, products)

	c.JSON(http.StatusOK, gin.H{
		"message": "商品更新成功",
		"product": updateData,
	})
}

// DeleteProduct 删除商品（管理员）
func DeleteProduct(c *gin.Context) {
	productID := c.Param("id")

	var products []models.Product
	utils.LoadFromFile(productsFile, &products)

	found := false
	newProducts := []models.Product{}
	for _, product := range products {
		if product.ID == productID {
			found = true
			continue
		}
		newProducts = append(newProducts, product)
	}

	if !found {
		c.JSON(http.StatusNotFound, gin.H{"error": "商品不存在"})
		return
	}

	utils.SaveToFile(productsFile, newProducts)

	c.JSON(http.StatusOK, gin.H{"message": "商品删除成功"})
}
