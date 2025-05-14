package controller

import (
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/model"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/service"
)

// FuelReceiptController handles HTTP requests related to fuel receipts
type FuelReceiptController struct {
	fuelReceiptService service.FuelReceiptService
}

// NewFuelReceiptController creates a new instance of FuelReceiptController
func NewFuelReceiptController(fuelReceiptService service.FuelReceiptService) *FuelReceiptController {
	return &FuelReceiptController{
		fuelReceiptService: fuelReceiptService,
	}
}

// CreateFuelReceipt godoc
// @Summary Create a new fuel receipt
// @Description Create a new fuel receipt with the provided information
// @Tags fuel-receipts
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token" default(Bearer <token>)
// @Param request body model.FuelReceiptCreateRequest true "Fuel receipt data"
// @Success 201 {object} model.BaseResponse "Successfully created fuel receipt"
// @Failure 400 {object} model.BaseResponse "Bad request"
// @Failure 401 {object} model.BaseResponse "Unauthorized"
// @Router /fuel-receipts [post]
func (c *FuelReceiptController) CreateFuelReceipt(ctx *fiber.Ctx) error {
	 var req model.FuelReceiptCreateRequest
    if err := ctx.BodyParser(&req); err != nil {
        return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
            fiber.StatusBadRequest,
            "Invalid request body format",
        ))
    }
    
    // Validate request - hanya field utama
    if req.ProductName == "" || req.Price <= 0 || req.Volume <= 0 || req.TotalPrice <= 0 || req.TruckID == 0 {
        return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
            fiber.StatusBadRequest,
            "Required fields: product_name, price > 0, volume > 0, total_price > 0, truck_id > 0",
        ))
    }
    
    // Get driver ID from token
    driverID := ctx.Locals("userId").(uint)

	// Create fuel receipt
	receipt, err := c.fuelReceiptService.CreateFuelReceipt(req, driverID)
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			err.Error(),
		))
	}

	// Return success response
	return ctx.Status(fiber.StatusCreated).JSON(model.SuccessResponse(
		"fuel_receipt.create",
		receipt,
	))
}

// UpdateFuelReceipt godoc
// @Summary Update a fuel receipt
// @Description Update an existing fuel receipt with the provided information
// @Tags fuel-receipts
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token" default(Bearer <token>)
// @Param id path int true "Fuel receipt ID"
// @Param request body model.FuelReceiptUpdateRequest true "Updated fuel receipt data"
// @Success 200 {object} model.BaseResponse "Successfully updated fuel receipt"
// @Failure 400 {object} model.BaseResponse "Bad request"
// @Failure 401 {object} model.BaseResponse "Unauthorized"
// @Failure 404 {object} model.BaseResponse "Not found"
// @Router /fuel-receipts/{id} [put]
func (c *FuelReceiptController) UpdateFuelReceipt(ctx *fiber.Ctx) error {
	// Get receipt ID from URL
	id, err := strconv.ParseUint(ctx.Params("id"), 10, 32)
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			"Invalid receipt ID",
		))
	}

	// Parse request body
	var req model.FuelReceiptUpdateRequest
	if err := ctx.BodyParser(&req); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			"Invalid request body",
		))
	}

	// Update fuel receipt
	receipt, err := c.fuelReceiptService.UpdateFuelReceipt(uint(id), req)
	if err != nil {
		if err.Error() == "fuel receipt not found" {
			return ctx.Status(fiber.StatusNotFound).JSON(model.SimpleErrorResponse(
				fiber.StatusNotFound,
				err.Error(),
			))
		}
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			err.Error(),
		))
	}

	// Return success response
	return ctx.Status(fiber.StatusOK).JSON(model.SuccessResponse(
		"fuel_receipt.update",
		receipt,
	))
}

// DeleteFuelReceipt godoc
// @Summary Delete a fuel receipt
// @Description Delete a fuel receipt by ID
// @Tags fuel-receipts
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token" default(Bearer <token>)
// @Param id path int true "Fuel receipt ID"
// @Success 200 {object} model.BaseResponse "Successfully deleted fuel receipt"
// @Failure 400 {object} model.BaseResponse "Bad request"
// @Failure 401 {object} model.BaseResponse "Unauthorized"
// @Failure 404 {object} model.BaseResponse "Not found"
// @Router /fuel-receipts/{id} [delete]
func (c *FuelReceiptController) DeleteFuelReceipt(ctx *fiber.Ctx) error {
	// Get receipt ID from URL
	id, err := strconv.ParseUint(ctx.Params("id"), 10, 32)
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			"Invalid receipt ID",
		))
	}

	// Delete fuel receipt
	if err := c.fuelReceiptService.DeleteFuelReceipt(uint(id)); err != nil {
		if err.Error() == "fuel receipt not found" {
			return ctx.Status(fiber.StatusNotFound).JSON(model.SimpleErrorResponse(
				fiber.StatusNotFound,
				err.Error(),
			))
		}
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			err.Error(),
		))
	}

	// Return success response
	return ctx.Status(fiber.StatusOK).JSON(model.SuccessResponse(
		"fuel_receipt.delete",
		map[string]string{"message": "Fuel receipt deleted successfully"},
	))
}

// GetFuelReceiptByID godoc
// @Summary Get a fuel receipt by ID
// @Description Get detailed information about a specific fuel receipt
// @Tags fuel-receipts
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token" default(Bearer <token>)
// @Param id path int true "Fuel receipt ID"
// @Success 200 {object} model.BaseResponse "Fuel receipt details"
// @Failure 400 {object} model.BaseResponse "Bad request"
// @Failure 401 {object} model.BaseResponse "Unauthorized"
// @Failure 404 {object} model.BaseResponse "Not found"
// @Router /fuel-receipts/{id} [get]
func (c *FuelReceiptController) GetFuelReceiptByID(ctx *fiber.Ctx) error {
	// Get receipt ID from URL
	id, err := strconv.ParseUint(ctx.Params("id"), 10, 32)
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			"Invalid receipt ID",
		))
	}

	// Get fuel receipt
	receipt, err := c.fuelReceiptService.GetFuelReceiptByID(uint(id))
	if err != nil {
		if err.Error() == "fuel receipt not found" {
			return ctx.Status(fiber.StatusNotFound).JSON(model.SimpleErrorResponse(
				fiber.StatusNotFound,
				err.Error(),
			))
		}
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			err.Error(),
		))
	}

	// Return success response
	return ctx.Status(fiber.StatusOK).JSON(model.SuccessResponse(
		"fuel_receipt.get",
		receipt,
	))
}

// GetAllFuelReceipts godoc
// @Summary Get all fuel receipts
// @Description Get a paginated list of all fuel receipts with optional filtering
// @Tags fuel-receipts
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token" default(Bearer <token>)
// @Param driver_id query int false "Filter by driver ID"
// @Param truck_id query int false "Filter by truck ID"
// @Param start_date query string false "Filter by start date (format: 2006-01-02)"
// @Param end_date query string false "Filter by end date (format: 2006-01-02)"
// @Param page query int false "Page number (default: 1)"
// @Param limit query int false "Items per page (default: 10)"
// @Success 200 {object} model.BaseResponse "List of fuel receipts"
// @Failure 400 {object} model.BaseResponse "Bad request"
// @Failure 401 {object} model.BaseResponse "Unauthorized"
// @Router /fuel-receipts [get]
func (c *FuelReceiptController) GetAllFuelReceipts(ctx *fiber.Ctx) error {
	// Parse query parameters
	params := model.FuelReceiptQueryParams{}

	// Parse driver_id if provided
	if driverIDStr := ctx.Query("driver_id"); driverIDStr != "" {
		driverID, err := strconv.ParseUint(driverIDStr, 10, 32)
		if err != nil {
			return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
				fiber.StatusBadRequest,
				"Invalid driver ID",
			))
		}
		driverIDUint := uint(driverID)
		params.DriverID = &driverIDUint
	}

	// Parse truck_id if provided
	if truckIDStr := ctx.Query("truck_id"); truckIDStr != "" {
		truckID, err := strconv.ParseUint(truckIDStr, 10, 32)
		if err != nil {
			return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
				fiber.StatusBadRequest,
				"Invalid truck ID",
			))
		}
		truckIDUint := uint(truckID)
		params.TruckID = &truckIDUint
	}

	// Parse date range if provided
	if startDateStr := ctx.Query("start_date"); startDateStr != "" {
		startDate, err := time.Parse("2006-01-02", startDateStr)
		if err != nil {
			return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
				fiber.StatusBadRequest,
				"Invalid start date format. Use YYYY-MM-DD",
			))
		}
		params.StartDate = &startDate
	}

	if endDateStr := ctx.Query("end_date"); endDateStr != "" {
		endDate, err := time.Parse("2006-01-02", endDateStr)
		if err != nil {
			return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
				fiber.StatusBadRequest,
				"Invalid end date format. Use YYYY-MM-DD",
			))
		}
		// Set end date to end of day
		endDate = endDate.Add(23*time.Hour + 59*time.Minute + 59*time.Second)
		params.EndDate = &endDate
	}

	// Parse pagination parameters
	pageStr := ctx.Query("page", "1")
	limitStr := ctx.Query("limit", "10")

	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}
	params.Page = &page

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 {
		limit = 10
	}
	params.Limit = &limit

	// Get fuel receipts
	receipts, err := c.fuelReceiptService.GetAllFuelReceipts(params)
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			err.Error(),
		))
	}

	// Return success response
	return ctx.Status(fiber.StatusOK).JSON(model.SuccessResponse(
		"fuel_receipt.list",
		receipts,
	))
}

// GetFuelReceiptsByDriverID godoc
// @Summary Get fuel receipts by driver ID
// @Description Get a paginated list of fuel receipts for a specific driver
// @Tags fuel-receipts
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token" default(Bearer <token>)
// @Param driver_id path int true "Driver ID"
// @Param page query int false "Page number (default: 1)"
// @Param limit query int false "Items per page (default: 10)"
// @Success 200 {object} model.BaseResponse "List of fuel receipts"
// @Failure 400 {object} model.BaseResponse "Bad request"
// @Failure 401 {object} model.BaseResponse "Unauthorized"
// @Failure 404 {object} model.BaseResponse "Not found"
// @Router /fuel-receipts/driver/{driver_id} [get]
func (c *FuelReceiptController) GetFuelReceiptsByDriverID(ctx *fiber.Ctx) error {
	// Get driver ID from URL
	driverID, err := strconv.ParseUint(ctx.Params("driver_id"), 10, 32)
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			"Invalid driver ID",
		))
	}

	// Parse pagination parameters
	pageStr := ctx.Query("page", "1")
	limitStr := ctx.Query("limit", "10")

	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 {
		limit = 10
	}

	// Get fuel receipts
	receipts, err := c.fuelReceiptService.GetFuelReceiptsByDriverID(uint(driverID), page, limit)
	if err != nil {
		if err.Error() == "driver not found" {
			return ctx.Status(fiber.StatusNotFound).JSON(model.SimpleErrorResponse(
				fiber.StatusNotFound,
				err.Error(),
			))
		}
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			err.Error(),
		))
	}

	// Return success response
	return ctx.Status(fiber.StatusOK).JSON(model.SuccessResponse(
		"fuel_receipt.list_by_driver",
		receipts,
	))
}

// GetFuelReceiptsByTruckID godoc
// @Summary Get fuel receipts by truck ID
// @Description Get a paginated list of fuel receipts for a specific truck
// @Tags fuel-receipts
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token" default(Bearer <token>)
// @Param truck_id path int true "Truck ID"
// @Param page query int false "Page number (default: 1)"
// @Param limit query int false "Items per page (default: 10)"
// @Success 200 {object} model.BaseResponse "List of fuel receipts"
// @Failure 400 {object} model.BaseResponse "Bad request"
// @Failure 401 {object} model.BaseResponse "Unauthorized"
// @Failure 404 {object} model.BaseResponse "Not found"
// @Router /fuel-receipts/truck/{truck_id} [get]
func (c *FuelReceiptController) GetFuelReceiptsByTruckID(ctx *fiber.Ctx) error {
	// Get truck ID from URL
	truckID, err := strconv.ParseUint(ctx.Params("truck_id"), 10, 32)
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			"Invalid truck ID",
		))
	}

	// Parse pagination parameters
	pageStr := ctx.Query("page", "1")
	limitStr := ctx.Query("limit", "10")

	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 {
		limit = 10
	}

	// Get fuel receipts
	receipts, err := c.fuelReceiptService.GetFuelReceiptsByTruckID(uint(truckID), page, limit)
	if err != nil {
		if err.Error() == "truck not found" {
			return ctx.Status(fiber.StatusNotFound).JSON(model.SimpleErrorResponse(
				fiber.StatusNotFound,
				err.Error(),
			))
		}
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			err.Error(),
		))
	}

	// Return success response
	return ctx.Status(fiber.StatusOK).JSON(model.SuccessResponse(
		"fuel_receipt.list_by_truck",
		receipts,
	))
}

// GetMyFuelReceipts godoc
// @Summary Get fuel receipts for the authenticated driver
// @Description Get a paginated list of fuel receipts for the currently authenticated driver
// @Tags fuel-receipts
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token" default(Bearer <token>)
// @Param page query int false "Page number (default: 1)"
// @Param limit query int false "Items per page (default: 10)"
// @Success 200 {object} model.BaseResponse "List of fuel receipts"
// @Failure 400 {object} model.BaseResponse "Bad request"
// @Failure 401 {object} model.BaseResponse "Unauthorized"
// @Router /fuel-receipts/my-receipts [get]
func (c *FuelReceiptController) GetMyFuelReceipts(ctx *fiber.Ctx) error {
	// Get driver ID from token
	driverID := ctx.Locals("userId").(uint)

	// Parse pagination parameters
	pageStr := ctx.Query("page", "1")
	limitStr := ctx.Query("limit", "10")

	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 {
		limit = 10
	}

	// Get fuel receipts
	receipts, err := c.fuelReceiptService.GetFuelReceiptsByDriverID(driverID, page, limit)
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			err.Error(),
		))
	}

	// Return success response
	return ctx.Status(fiber.StatusOK).JSON(model.SuccessResponse(
		"fuel_receipt.my_receipts",
		receipts,
	))
}
