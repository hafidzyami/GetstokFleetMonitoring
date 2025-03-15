package model

import (
	"time"
	"gorm.io/gorm"
)

type PushSubscription struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	UserID    uint           `json:"user_id"`
	Endpoint  string         `json:"endpoint" gorm:"uniqueIndex"`
	P256dh    string         `json:"p256dh"`
	Auth      string         `json:"auth"`
	Role      string         `json:"role"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}

// DTO untuk request
type SubscriptionRequest struct {
	Endpoint string `json:"endpoint"`
	P256dh   string `json:"p256dh"`
	Auth     string `json:"auth"`
}

type UnsubscribeRequest struct {
	Endpoint string `json:"endpoint"`
}

type NotificationRequest struct {
	Title       string   `json:"title"`
	Message     string   `json:"message"`
	URL         string   `json:"url"`
	TargetRoles []string `json:"targetRoles"`
}