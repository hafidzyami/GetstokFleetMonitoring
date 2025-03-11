package model

import (
	"time"
	"gorm.io/gorm"
)

type User struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	Name      string         `json:"name" validate:"required"`
	Email     string         `json:"email" validate:"required,email" gorm:"uniqueIndex"`
	Password  string         `json:"password,omitempty" validate:"required,min=6"`
	Role      string         `json:"role" validate:"required"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}

// DTOs
type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=6"`
}

type RegisterRequest struct {
	Name     string `json:"name" validate:"required"`
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=6"`
	Role     string `json:"role" validate:"required"`
}

type AuthResponse struct {
	User  User   `json:"user"`
	Token string `json:"token"`
}

type UserResponse struct {
	User User `json:"user"`
}

// Convert User model to UserResponse DTO
func (u *User) ToUserResponse() UserResponse {
	return UserResponse{User: *u}
}