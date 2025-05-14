package model

import (
	"gorm.io/gorm"
	"time"
)

// FuelReceipt represents a fuel receipt entry in the database
type FuelReceipt struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	ProductName string         `json:"product_name"`
	Price       float64        `json:"price"`
	Volume      float64        `json:"volume"`
	TotalPrice  float64        `json:"total_price"`
	DriverID    uint           `json:"driver_id"`
	TruckID     uint           `json:"truck_id"`
	ImageURL    string         `json:"image_url,omitempty"` // URL to the receipt image in S3
	Timestamp   time.Time      `json:"timestamp"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}

// FuelReceiptDTO for creating a new fuel receipt
type FuelReceiptCreateRequest struct {
	ProductName string  `json:"product_name" validate:"required"`
	Price       float64 `json:"price" validate:"required,min=0"`
	Volume      float64 `json:"volume" validate:"required,min=0"`
	TotalPrice  float64 `json:"total_price" validate:"required,min=0"`
	TruckID     uint    `json:"truck_id" validate:"required"`
	Timestamp   string  `json:"timestamp" validate:"required"`
	ImageBase64 string  `json:"image_base64,omitempty"` // Optional base64 encoded image
}

// FuelReceiptUpdateRequest for updating a fuel receipt
type FuelReceiptUpdateRequest struct {
	ProductName string    `json:"product_name,omitempty"`
	Price       *float64  `json:"price,omitempty"`
	Volume      *float64  `json:"volume,omitempty"`
	TotalPrice  *float64  `json:"total_price,omitempty"`
	TruckID     *uint     `json:"truck_id,omitempty"`
	Timestamp   time.Time `json:"timestamp,omitempty"`
}

// FuelReceiptQueryParams for filtering fuel receipts
type FuelReceiptQueryParams struct {
	DriverID  *uint      `json:"driver_id,omitempty"`
	TruckID   *uint      `json:"truck_id,omitempty"`
	StartDate *time.Time `json:"start_date,omitempty"`
	EndDate   *time.Time `json:"end_date,omitempty"`
	Page      *int       `json:"page,omitempty"`
	Limit     *int       `json:"limit,omitempty"`
}

// FuelReceiptResponse for returning fuel receipt data
type FuelReceiptResponse struct {
	ID          uint           `json:"id"`
	ProductName string         `json:"product_name"`
	Price       float64        `json:"price"`
	Volume      float64        `json:"volume"`
	TotalPrice  float64        `json:"total_price"`
	DriverID    uint           `json:"driver_id"`
	TruckID     uint           `json:"truck_id"`
	TruckInfo   *TruckResponse `json:"truck_info,omitempty"`
	DriverInfo  *UserResponse  `json:"driver_info,omitempty"`
	ImageURL    string         `json:"image_url,omitempty"`
	Timestamp   time.Time      `json:"timestamp"`
	CreatedAt   time.Time      `json:"created_at"`
}

// ToFuelReceiptResponse converts FuelReceipt model to FuelReceiptResponse DTO
func (fr *FuelReceipt) ToFuelReceiptResponse() FuelReceiptResponse {
	return FuelReceiptResponse{
		ID:          fr.ID,
		ProductName: fr.ProductName,
		Price:       fr.Price,
		Volume:      fr.Volume,
		TotalPrice:  fr.TotalPrice,
		DriverID:    fr.DriverID,
		TruckID:     fr.TruckID,
		ImageURL:    fr.ImageURL,
		Timestamp:   fr.Timestamp,
		CreatedAt:   fr.CreatedAt,
	}
}

// FuelReceiptListResponse for paginated responses
type FuelReceiptListResponse struct {
	Receipts   []FuelReceiptResponse `json:"receipts"`
	Total      int64                 `json:"total"`
	Page       int                   `json:"page"`
	Limit      int                   `json:"limit"`
	TotalPages int                   `json:"total_pages"`
}
