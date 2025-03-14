package model

import (
	"time"
	"gorm.io/gorm"
)

type User struct {
	ID                uint           `gorm:"primaryKey" json:"id"`
	Name              string         `json:"name" validate:"required"`
	Email             string         `json:"email" validate:"required,email" gorm:"uniqueIndex"`
	Password          string         `json:"password,omitempty" validate:"required,min=6"`
	Role              string         `json:"role" validate:"required"`
	PasswordChangedAt time.Time      `json:"password_changed_at,omitempty"`
	CreatedAt         time.Time      `json:"created_at"`
	UpdatedAt         time.Time      `json:"updated_at"`
	DeletedAt         gorm.DeletedAt `json:"-" gorm:"index"`
}

// DTOs
type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=6"`
}

type RegisterRequest struct {
	Name     string `json:"name" validate:"required"`
	Email    string `json:"email" validate:"required,email"`
	Role     string `json:"role" validate:"required"`
}

type UpdatePasswordRequest struct {
	OldPassword string `json:"old_password" validate:"required"`
	NewPassword string `json:"new_password" validate:"required,min=6"`
}

type AuthResponse struct {
	User  User   `json:"user"`
	Token string `json:"token"`
}

type UserResponse struct {
	ID        uint      `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// ToUserResponse converts User model to UserResponse DTO (removing sensitive data)
func (u *User) ToUserResponse() UserResponse {
	return UserResponse{
		ID:        u.ID,
		Name:      u.Name,
		Email:     u.Email,
		CreatedAt: u.CreatedAt,
		UpdatedAt: u.UpdatedAt,
	}
}