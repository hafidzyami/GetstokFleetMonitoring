package service

import (
	"errors"
	"math"
	"time"

	"github.com/hafidzyami/GetstokFleetMonitoring/backend/model"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/repository"
)

// FuelReceiptService provides business logic for fuel receipts
type FuelReceiptService interface {
	CreateFuelReceipt(req model.FuelReceiptCreateRequest, driverID uint) (*model.FuelReceiptResponse, error)
	UpdateFuelReceipt(id uint, req model.FuelReceiptUpdateRequest) (*model.FuelReceiptResponse, error)
	DeleteFuelReceipt(id uint) error
	GetFuelReceiptByID(id uint) (*model.FuelReceiptResponse, error)
	GetAllFuelReceipts(params model.FuelReceiptQueryParams) (*model.FuelReceiptListResponse, error)
	GetFuelReceiptsByDriverID(driverID uint, page, limit int) (*model.FuelReceiptListResponse, error)
	GetFuelReceiptsByTruckID(truckID uint, page, limit int) (*model.FuelReceiptListResponse, error)
}

// fuelReceiptService implements FuelReceiptService
type fuelReceiptService struct {
	receiptRepo repository.FuelReceiptRepository
	truckRepo   repository.TruckRepository
	userRepo    repository.UserRepository
	s3Service   S3Service
}

// NewFuelReceiptService creates a new instance of FuelReceiptService
func NewFuelReceiptService(
	receiptRepo repository.FuelReceiptRepository,
	truckRepo repository.TruckRepository,
	userRepo repository.UserRepository,
	s3Service S3Service,
) FuelReceiptService {
	return &fuelReceiptService{
		receiptRepo: receiptRepo,
		truckRepo:   truckRepo,
		userRepo:    userRepo,
		s3Service:   s3Service,
	}
}

// CreateFuelReceipt creates a new fuel receipt
func (s *fuelReceiptService) CreateFuelReceipt(req model.FuelReceiptCreateRequest, driverID uint) (*model.FuelReceiptResponse, error) {
	// Validate truck exists
	truck, err := s.truckRepo.FindByID(req.TruckID)
	if err != nil {
		return nil, errors.New("truck not found")
	}

	var timestamp time.Time
	if req.Timestamp != "" {
        // Coba beberapa format timestamp umum
        formats := []string{
            time.RFC3339,
            "2006-01-02T15:04:05Z07:00",
            "2006-01-02 15:04:05",
            "2006-01-02",
        }

        var parseErr error
        for _, format := range formats {
            timestamp, parseErr = time.Parse(format, req.Timestamp)
            if parseErr == nil {
                break
            }
        }

        if parseErr != nil {
            // Jika gagal parsing, gunakan waktu sekarang
            timestamp = time.Now()
        }
    } else {
        timestamp = time.Now()
    }
	// Create new receipt
	receipt := &model.FuelReceipt{
		ProductName: req.ProductName,
		Price:       req.Price,
		Volume:      req.Volume,
		TotalPrice:  req.TotalPrice,
		DriverID:    driverID,
		TruckID:     req.TruckID,
		Timestamp:   timestamp,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	// Handle image upload if provided
	if req.ImageBase64 != "" {
		_, imageURL, err := s.s3Service.UploadBase64Image(req.ImageBase64, "fuel-receipt")
		if err != nil {
			return nil, errors.New("failed to upload receipt image: " + err.Error())
		}
		// Just use the URL as the image reference
		receipt.ImageURL = imageURL
	}

	// Save to database
	if err := s.receiptRepo.Create(receipt); err != nil {
		return nil, errors.New("failed to create fuel receipt: " + err.Error())
	}

	// Prepare response
	response := receipt.ToFuelReceiptResponse()
	
	// Convert truck to TruckResponse
	truckResponse := truck.ToTruckResponse()
	response.TruckInfo = &truckResponse

	// Add driver info if available
	driver, err := s.userRepo.FindByID(driverID)
	if err == nil {
		driverResponse := driver.ToUserResponse()
		response.DriverInfo = &driverResponse
	}

	return &response, nil
}

// UpdateFuelReceipt updates an existing fuel receipt
func (s *fuelReceiptService) UpdateFuelReceipt(id uint, req model.FuelReceiptUpdateRequest) (*model.FuelReceiptResponse, error) {
	// Find existing receipt
	receipt, err := s.receiptRepo.FindByID(id)
	if err != nil {
		return nil, errors.New("fuel receipt not found")
	}

	// Update fields if provided
	if req.ProductName != "" {
		receipt.ProductName = req.ProductName
	}
	if req.Price != nil {
		receipt.Price = *req.Price
	}
	if req.Volume != nil {
		receipt.Volume = *req.Volume
	}
	if req.TotalPrice != nil {
		receipt.TotalPrice = *req.TotalPrice
	}
	if req.TruckID != nil {
		// Validate truck exists
		if _, err := s.truckRepo.FindByID(*req.TruckID); err != nil {
			return nil, errors.New("truck not found")
		}
		receipt.TruckID = *req.TruckID
	}
	if !req.Timestamp.IsZero() {
		receipt.Timestamp = req.Timestamp
	}
	receipt.UpdatedAt = time.Now()

	// Save to database
	if err := s.receiptRepo.Update(receipt); err != nil {
		return nil, errors.New("failed to update fuel receipt: " + err.Error())
	}

	// Prepare response
	response := receipt.ToFuelReceiptResponse()

	// Add truck info
	truck, err := s.truckRepo.FindByID(receipt.TruckID)
	if err == nil {
		truckResponse := truck.ToTruckResponse()
		response.TruckInfo = &truckResponse
	}

	// Add driver info
	driver, err := s.userRepo.FindByID(receipt.DriverID)
	if err == nil {
		driverResponse := driver.ToUserResponse()
		response.DriverInfo = &driverResponse
	}

	return &response, nil
}

// DeleteFuelReceipt deletes a fuel receipt
func (s *fuelReceiptService) DeleteFuelReceipt(id uint) error {
	// Check if receipt exists
	if _, err := s.receiptRepo.FindByID(id); err != nil {
		return errors.New("fuel receipt not found")
	}

	// Delete receipt
	return s.receiptRepo.Delete(id)
}

// GetFuelReceiptByID retrieves a fuel receipt by ID
func (s *fuelReceiptService) GetFuelReceiptByID(id uint) (*model.FuelReceiptResponse, error) {
	// Find receipt
	receipt, err := s.receiptRepo.FindByID(id)
	if err != nil {
		return nil, errors.New("fuel receipt not found")
	}

	// Prepare response
	response := receipt.ToFuelReceiptResponse()

	// Add truck info
	truck, err := s.truckRepo.FindByID(receipt.TruckID)
	if err == nil {
		truckResponse := truck.ToTruckResponse()
		response.TruckInfo = &truckResponse
	}

	// Add driver info
	driver, err := s.userRepo.FindByID(receipt.DriverID)
	if err == nil {
		driverResponse := driver.ToUserResponse()
		response.DriverInfo = &driverResponse
	}

	return &response, nil
}

// GetAllFuelReceipts retrieves all fuel receipts with pagination and filtering
func (s *fuelReceiptService) GetAllFuelReceipts(params model.FuelReceiptQueryParams) (*model.FuelReceiptListResponse, error) {
	// Get receipts with filtering and pagination
	receipts, total, err := s.receiptRepo.FindAll(params)
	if err != nil {
		return nil, errors.New("failed to retrieve fuel receipts: " + err.Error())
	}

	// Determine pagination info
	limit := 10
	page := 1
	if params.Limit != nil && *params.Limit > 0 {
		limit = *params.Limit
	}
	if params.Page != nil && *params.Page > 0 {
		page = *params.Page
	}
	totalPages := int(math.Ceil(float64(total) / float64(limit)))

	// Prepare response
	response := &model.FuelReceiptListResponse{
		Receipts:   make([]model.FuelReceiptResponse, len(receipts)),
		Total:      total,
		Page:       page,
		Limit:      limit,
		TotalPages: totalPages,
	}

	// Convert receipts to response DTOs and add related info
	for i, receipt := range receipts {
		receiptResponse := receipt.ToFuelReceiptResponse()

		// Add truck info
		truck, err := s.truckRepo.FindByID(receipt.TruckID)
		if err == nil {
			truckResponse := truck.ToTruckResponse()
			receiptResponse.TruckInfo = &truckResponse
		}

		// Add driver info
		driver, err := s.userRepo.FindByID(receipt.DriverID)
		if err == nil {
			driverResponse := driver.ToUserResponse()
			receiptResponse.DriverInfo = &driverResponse
		}

		response.Receipts[i] = receiptResponse
	}

	return response, nil
}

// GetFuelReceiptsByDriverID retrieves fuel receipts for a specific driver
func (s *fuelReceiptService) GetFuelReceiptsByDriverID(driverID uint, page, limit int) (*model.FuelReceiptListResponse, error) {
	// Validate driver exists
	if _, err := s.userRepo.FindByID(driverID); err != nil {
		return nil, errors.New("driver not found")
	}

	// Default pagination values
	if page <= 0 {
		page = 1
	}
	if limit <= 0 {
		limit = 10
	}
	offset := (page - 1) * limit

	// Get receipts
	receipts, total, err := s.receiptRepo.FindByDriverID(driverID, limit, offset)
	if err != nil {
		return nil, errors.New("failed to retrieve fuel receipts: " + err.Error())
	}

	// Calculate total pages
	totalPages := int(math.Ceil(float64(total) / float64(limit)))

	// Prepare response
	response := &model.FuelReceiptListResponse{
		Receipts:   make([]model.FuelReceiptResponse, len(receipts)),
		Total:      total,
		Page:       page,
		Limit:      limit,
		TotalPages: totalPages,
	}

	// Convert receipts to response DTOs and add related info
	for i, receipt := range receipts {
		receiptResponse := receipt.ToFuelReceiptResponse()

		// Add truck info
		truck, err := s.truckRepo.FindByID(receipt.TruckID)
		if err == nil {
			truckResponse := truck.ToTruckResponse()
			receiptResponse.TruckInfo = &truckResponse
		}

		response.Receipts[i] = receiptResponse
	}

	return response, nil
}

// GetFuelReceiptsByTruckID retrieves fuel receipts for a specific truck
func (s *fuelReceiptService) GetFuelReceiptsByTruckID(truckID uint, page, limit int) (*model.FuelReceiptListResponse, error) {
	// Validate truck exists
	if _, err := s.truckRepo.FindByID(truckID); err != nil {
		return nil, errors.New("truck not found")
	}

	// Default pagination values
	if page <= 0 {
		page = 1
	}
	if limit <= 0 {
		limit = 10
	}
	offset := (page - 1) * limit

	// Get receipts
	receipts, total, err := s.receiptRepo.FindByTruckID(truckID, limit, offset)
	if err != nil {
		return nil, errors.New("failed to retrieve fuel receipts: " + err.Error())
	}

	// Calculate total pages
	totalPages := int(math.Ceil(float64(total) / float64(limit)))

	// Prepare response
	response := &model.FuelReceiptListResponse{
		Receipts:   make([]model.FuelReceiptResponse, len(receipts)),
		Total:      total,
		Page:       page,
		Limit:      limit,
		TotalPages: totalPages,
	}

	// Convert receipts to response DTOs and add related info
	for i, receipt := range receipts {
		receiptResponse := receipt.ToFuelReceiptResponse()

		// Add driver info
		driver, err := s.userRepo.FindByID(receipt.DriverID)
		if err == nil {
			driverResponse := driver.ToUserResponse()
			receiptResponse.DriverInfo = &driverResponse
		}

		response.Receipts[i] = receiptResponse
	}

	return response, nil
}
