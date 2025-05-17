package migration

import (
	"log"

	"github.com/hafidzyami/GetstokFleetMonitoring/backend/config"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/model"
)

// CreateFuelReceiptsTable creates the fuel_receipts table if it doesn't exist
func CreateFuelReceiptsTable() error {
	log.Println("Running fuel_receipts table migration...")
	
	if err := config.DB.AutoMigrate(&model.FuelReceipt{}); err != nil {
		log.Printf("Error creating fuel_receipts table: %v", err)
		return err
	}
	
	log.Println("Fuel receipts table migration completed successfully")
	return nil
}
