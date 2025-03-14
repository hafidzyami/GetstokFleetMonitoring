package migration

import (
	"time"
	
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/config"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/model"
)

// AddPasswordChangedAtColumn adds the password_changed_at column to users table
func AddPasswordChangedAtColumn() error {
	// Check if column already exists
	if config.DB.Migrator().HasColumn(&model.User{}, "password_changed_at") {
		return nil
	}
	
	// Add column
	if err := config.DB.Migrator().AddColumn(&model.User{}, "password_changed_at"); err != nil {
		return err
	}
	
	// Set default value for existing users
	return config.DB.Model(&model.User{}).Where("password_changed_at IS NULL").Update("password_changed_at", time.Now()).Error
}