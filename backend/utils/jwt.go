package utils

import (
	"errors"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/model"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/repository"
)

var userRepo repository.UserRepository

// SetUserRepository sets the user repository for token validation
func SetUserRepository(repo repository.UserRepository) {
	userRepo = repo
}

// GenerateToken generates JWT token for a user
func GenerateToken(user model.User) (string, error) {
	// Set expiration time to 24 hours
	expirationTime := time.Now().Add(24 * time.Hour)

	// Create claims with user ID and expiration time
	claims := jwt.MapClaims{
		"user_id":   user.ID,
		"issued_at": time.Now().Unix(),
		"role":      user.Role,
		"exp":       expirationTime.Unix(),
	}

	// Create token with claims and sign it
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	// Sign token with secret key
	tokenString, err := token.SignedString([]byte(os.Getenv("JWT_SECRET")))
	if err != nil {
		return "", err
	}

	return tokenString, nil
}

// ValidateToken validates JWT token and returns user ID and role
func ValidateToken(tokenString string) (uint, string, error) {
    // Parse token
    token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
        // Validate signing method
        if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
            return nil, jwt.ErrSignatureInvalid
        }
        
        // Return secret key
        return []byte(os.Getenv("JWT_SECRET")), nil
    })
    
    if err != nil {
        return 0, "", err
    }
    
    // Get claims
    if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
        // Get user ID and role from claims
        userId := uint(claims["user_id"].(float64))
        role := claims["role"].(string)
        issuedAt := time.Unix(int64(claims["issued_at"].(float64)), 0)
        
        // Check if token was issued before password was changed
        if userRepo != nil {
            user, err := userRepo.FindByID(userId)
            if err != nil {
                return 0, "", err
            }
            
            // If password was changed after token was issued, invalidate token
            if user.PasswordChangedAt.After(issuedAt) {
                return 0, "", errors.New("token expired due to password change")
            }
        }
        
        return userId, role, nil
    }
    
    return 0, "", jwt.ErrSignatureInvalid
}
