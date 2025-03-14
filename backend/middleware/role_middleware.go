// middleware/role_middleware.go
package middleware

import (
    "strings"
    
    "github.com/gofiber/fiber/v2"
    
    "github.com/hafidzyami/GetstokFleetMonitoring/backend/model"
    "github.com/hafidzyami/GetstokFleetMonitoring/backend/utils"
)

// RoleAuthorization middleware untuk memeriksa role pengguna
func RoleAuthorization(allowedRoles ...string) fiber.Handler {
    return func(c *fiber.Ctx) error {
        // Get authorization header
        authHeader := c.Get("Authorization")
        
        // Check if authorization header is empty
        if authHeader == "" {
            return c.Status(fiber.StatusUnauthorized).JSON(model.SimpleErrorResponse(
                fiber.StatusUnauthorized,
                "Authorization header is required",
            ))
        }
        
        // Check if authorization header starts with Bearer
        if !strings.HasPrefix(authHeader, "Bearer ") {
            return c.Status(fiber.StatusUnauthorized).JSON(model.SimpleErrorResponse(
                fiber.StatusUnauthorized,
                "Invalid authentication token format",
            ))
        }
        
        // Get token from authorization header
        token := strings.TrimPrefix(authHeader, "Bearer ")
        
        // Validate token dan dapatkan role
        userId, role, err := utils.ValidateToken(token)
        if err != nil {
            return c.Status(fiber.StatusUnauthorized).JSON(model.SimpleErrorResponse(
                fiber.StatusUnauthorized,
                "Invalid or expired token",
            ))
        }
        
        // Periksa apakah role ada dalam daftar allowed roles
        allowed := false
        for _, r := range allowedRoles {
            if r == role {
                allowed = true
                break
            }
        }
        
        // Jika tidak diizinkan, kembalikan error
        if !allowed {
            return c.Status(fiber.StatusForbidden).JSON(model.SimpleErrorResponse(
                fiber.StatusForbidden,
                "You don't have permission to access this resource",
            ))
        }
        
        // Set user ID dan role dalam locals
        c.Locals("userId", userId)
        c.Locals("role", role)
        
        // Next middleware
        return c.Next()
    }
}