package repository

import (
	"errors"
	"time"

	"github.com/hafidzyami/GetstokFleetMonitoring/backend/config"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/model"
	"gorm.io/gorm"
)

// FuelReceiptRepository provides access to fuel receipt data
type FuelReceiptRepository interface {
	Create(receipt *model.FuelReceipt) error
	Update(receipt *model.FuelReceipt) error
	Delete(id uint) error
	FindByID(id uint) (*model.FuelReceipt, error)
	FindAll(params model.FuelReceiptQueryParams) ([]model.FuelReceipt, int64, error)
	FindByDriverID(driverID uint, limit, offset int) ([]model.FuelReceipt, int64, error)
	FindByTruckID(truckID uint, limit, offset int) ([]model.FuelReceipt, int64, error)
	FindByDateRange(startDate, endDate time.Time, limit, offset int) ([]model.FuelReceipt, int64, error)
}

// fuelReceiptRepository implements FuelReceiptRepository
type fuelReceiptRepository struct{}

// NewFuelReceiptRepository creates a new instance of FuelReceiptRepository
func NewFuelReceiptRepository() FuelReceiptRepository {
	return &fuelReceiptRepository{}
}

// Create creates a new fuel receipt
func (r *fuelReceiptRepository) Create(receipt *model.FuelReceipt) error {
	return config.DB.Create(receipt).Error
}

// Update updates an existing fuel receipt
func (r *fuelReceiptRepository) Update(receipt *model.FuelReceipt) error {
	return config.DB.Save(receipt).Error
}

// Delete soft-deletes a fuel receipt
func (r *fuelReceiptRepository) Delete(id uint) error {
	return config.DB.Delete(&model.FuelReceipt{}, id).Error
}

// FindByID retrieves a fuel receipt by its ID
func (r *fuelReceiptRepository) FindByID(id uint) (*model.FuelReceipt, error) {
	var receipt model.FuelReceipt
	if err := config.DB.First(&receipt, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("fuel receipt not found")
		}
		return nil, err
	}
	return &receipt, nil
}

// FindAll retrieves all fuel receipts with optional filtering and pagination
func (r *fuelReceiptRepository) FindAll(params model.FuelReceiptQueryParams) ([]model.FuelReceipt, int64, error) {
	var receipts []model.FuelReceipt
	var total int64

	query := config.DB.Model(&model.FuelReceipt{})

	// Apply filters
	if params.DriverID != nil {
		query = query.Where("driver_id = ?", *params.DriverID)
	}
	if params.TruckID != nil {
		query = query.Where("truck_id = ?", *params.TruckID)
	}
	if params.StartDate != nil && params.EndDate != nil {
		query = query.Where("timestamp BETWEEN ? AND ?", *params.StartDate, *params.EndDate)
	} else if params.StartDate != nil {
		query = query.Where("timestamp >= ?", *params.StartDate)
	} else if params.EndDate != nil {
		query = query.Where("timestamp <= ?", *params.EndDate)
	}

	// Count total before pagination
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Apply pagination
	limit := 10
	page := 1
	if params.Limit != nil && *params.Limit > 0 {
		limit = *params.Limit
	}
	if params.Page != nil && *params.Page > 0 {
		page = *params.Page
	}
	offset := (page - 1) * limit

	// Get paginated result
	if err := query.Limit(limit).Offset(offset).Order("timestamp DESC").Find(&receipts).Error; err != nil {
		return nil, 0, err
	}

	return receipts, total, nil
}

// FindByDriverID retrieves fuel receipts by driver ID with pagination
func (r *fuelReceiptRepository) FindByDriverID(driverID uint, limit, offset int) ([]model.FuelReceipt, int64, error) {
	var receipts []model.FuelReceipt
	var total int64

	query := config.DB.Model(&model.FuelReceipt{}).Where("driver_id = ?", driverID)

	// Count total before pagination
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Apply pagination
	if err := query.Limit(limit).Offset(offset).Order("timestamp DESC").Find(&receipts).Error; err != nil {
		return nil, 0, err
	}

	return receipts, total, nil
}

// FindByTruckID retrieves fuel receipts by truck ID with pagination
func (r *fuelReceiptRepository) FindByTruckID(truckID uint, limit, offset int) ([]model.FuelReceipt, int64, error) {
	var receipts []model.FuelReceipt
	var total int64

	query := config.DB.Model(&model.FuelReceipt{}).Where("truck_id = ?", truckID)

	// Count total before pagination
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Apply pagination
	if err := query.Limit(limit).Offset(offset).Order("timestamp DESC").Find(&receipts).Error; err != nil {
		return nil, 0, err
	}

	return receipts, total, nil
}

// FindByDateRange retrieves fuel receipts within a date range with pagination
func (r *fuelReceiptRepository) FindByDateRange(startDate, endDate time.Time, limit, offset int) ([]model.FuelReceipt, int64, error) {
	var receipts []model.FuelReceipt
	var total int64

	query := config.DB.Model(&model.FuelReceipt{}).Where("timestamp BETWEEN ? AND ?", startDate, endDate)

	// Count total before pagination
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Apply pagination
	if err := query.Limit(limit).Offset(offset).Order("timestamp DESC").Find(&receipts).Error; err != nil {
		return nil, 0, err
	}

	return receipts, total, nil
}
