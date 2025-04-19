package migration

import (
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/config"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/model"
)

// CreateDriverLocationsTable creates the driver_locations table if it doesn't exist
func CreateDriverLocationsTable() error {
	// Check if the table already exists
	if config.DB.Migrator().HasTable(&model.DriverLocation{}) {
		return nil
	}
	
	// Create the table
	return config.DB.AutoMigrate(&model.DriverLocation{})
}