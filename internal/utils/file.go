package utils

import (
	"encoding/json"
	"os"
	"time"
)

// LoadFromFile 从文件加载数据
func LoadFromFile(filename string, v interface{}) error {
	data, err := os.ReadFile(filename)
	if err != nil {
		return err
	}
	return json.Unmarshal(data, v)
}

// SaveToFile 保存数据到文件
func SaveToFile(filename string, v interface{}) error {
	data, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(filename, data, 0644)
}

// InitFileIfNotExists 如果文件不存在则初始化
func InitFileIfNotExists(filename string, data interface{}) {
	if _, err := os.Stat(filename); os.IsNotExist(err) {
		SaveToFile(filename, data)
	}
}


// GetCurrentTime 获取当前时间字符串
func GetCurrentTime() string {
	return time.Now().Format("2006-01-02 15:04:05")
}
