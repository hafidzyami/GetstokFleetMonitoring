package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/utils"
)

// Protected middleware for routes that require authentication
func Protected() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Get authorization header
		authHeader := c.Get("Authorization")
		
		// Check if authorization header is empty
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"message": "Unauthorized",
			})
		}
		
		// Check if authorization header starts with Bearer
		if !strings.HasPrefix(authHeader, "Bearer ") {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"message": "Invalid authentication token",
			})
		}
		
		// Get token from authorization header
		token := strings.TrimPrefix(authHeader, "Bearer ")
		
		// Validate token
		userId, err := utils.ValidateToken(token)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"message": "Invalid or expired token",
			})
		}
		
		// Set user ID in locals
		c.Locals("userId", userId)
		
		// Next middleware
		return c.Next()
	}
}