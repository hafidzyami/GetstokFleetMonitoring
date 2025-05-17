// controller/truck_history_controller.go
package controller

import (
	"strconv"
	"time"
	"github.com/gofiber/fiber/v2"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/model"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/service"
)

type TruckHistoryController struct {
	truckHistoryService service.TruckHistoryService
}

func NewTruckHistoryController(truckHistoryService service.TruckHistoryService) *TruckHistoryController {
	return &TruckHistoryController{
		truckHistoryService: truckHistoryService,
	}
}

// GetPositionHistory godoc
// @Summary Get truck position history
// @Description Get historical position data for a truck
// @Tags trucks
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token" default(Bearer <token>)
// @Param truckID path int true "Truck ID"
// @Param limit query int false "Limit results (default 100)"
// @Success 200 {object} model.BaseResponse "Position history"
// @Failure 400 {object} model.BaseResponse "Bad request"
// @Failure 401 {object} model.BaseResponse "Unauthorized"
// @Router /trucks/{truckID}/positions/limited [get]
func (c *TruckHistoryController) GetPositionHistory(ctx *fiber.Ctx) error {
	// Get truck ID from path
	truckIDStr := ctx.Params("truckID")
	truckID, err := strconv.ParseUint(truckIDStr, 10, 32)
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			"Invalid truck ID",
		))
	}
	
	// Get limit from query
	limitStr := ctx.Query("limit", "100")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 {
		limit = 100
	}
	
	// Get position history
	positions, err := c.truckHistoryService.GetPositionHistory(uint(truckID), limit)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(model.SimpleErrorResponse(
			fiber.StatusInternalServerError,
			"Failed to get position history",
		))
	}
	
	// Return response
	return ctx.Status(fiber.StatusOK).JSON(model.SuccessResponse(
		"trucks.getPositionHistory",
		positions,
	))
}

// GetPositionHistoryLast30Days godoc
// @Summary Get truck position history for last 30 days
// @Description Get historical position data for a truck from the last 30 days, grouped by date
// @Tags trucks
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token" default(Bearer <token>)
// @Param truckID path int true "Truck ID"
// @Success 200 {object} model.BaseResponse "Position history grouped by date"
// @Failure 400 {object} model.BaseResponse "Bad request"
// @Failure 401 {object} model.BaseResponse "Unauthorized"
// @Router /trucks/{truckID}/positions [get]
func (c *TruckHistoryController) GetPositionHistoryLast30Days(ctx *fiber.Ctx) error {
	// Get truck ID from path
	truckIDStr := ctx.Params("truckID")
	truckID, err := strconv.ParseUint(truckIDStr, 10, 32)
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			"Invalid truck ID",
		))
	}
	
	// Get position history for last 30 days
	positionData, err := c.truckHistoryService.GetPositionHistoryLast30Days(uint(truckID))
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(model.SimpleErrorResponse(
			fiber.StatusInternalServerError,
			"Failed to get position history",
		))
	}
	
	// Return response
	return ctx.Status(fiber.StatusOK).JSON(model.SuccessResponse(
		"trucks.getPositionHistoryLast30Days",
		positionData,
	))
}

// GetFuelHistory godoc
// @Summary Get truck fuel history
// @Description Get historical fuel data for a truck
// @Tags trucks
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token" default(Bearer <token>)
// @Param truckID path int true "Truck ID"
// @Param limit query int false "Limit results (default 100)"
// @Success 200 {object} model.BaseResponse "Fuel history"
// @Failure 400 {object} model.BaseResponse "Bad request"
// @Failure 401 {object} model.BaseResponse "Unauthorized"
// @Router /trucks/{truckID}/fuel/limited [get]
func (c *TruckHistoryController) GetFuelHistory(ctx *fiber.Ctx) error {
	// Get truck ID from path
	truckIDStr := ctx.Params("truckID")
	truckID, err := strconv.ParseUint(truckIDStr, 10, 32)
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			"Invalid truck ID",
		))
	}
	
	// Get limit from query
	limitStr := ctx.Query("limit", "100")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 {
		limit = 100
	}
	
	// Get fuel history
	fuelData, err := c.truckHistoryService.GetFuelHistory(uint(truckID), limit)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(model.SimpleErrorResponse(
			fiber.StatusInternalServerError,
			"Failed to get fuel history",
		))
	}
	
	// Return response
	return ctx.Status(fiber.StatusOK).JSON(model.SuccessResponse(
		"trucks.getFuelHistory",
		fuelData,
	))
}

// GetFuelHistoryLast30Days godoc
// @Summary Get truck fuel history for last 30 days or by date range
// @Description Get historical fuel data for a truck from the last 30 days, grouped by date, or within a specific date range
// @Tags trucks
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token" default(Bearer <token>)
// @Param truckID path int true "Truck ID"
// @Param start_date query string false "Start date (format: 2006-01-02)"
// @Param end_date query string false "End date (format: 2006-01-02)"
// @Success 200 {object} model.BaseResponse "Fuel history data"
// @Failure 400 {object} model.BaseResponse "Bad request"
// @Failure 401 {object} model.BaseResponse "Unauthorized"
// @Router /trucks/{truckID}/fuel [get]
func (c *TruckHistoryController) GetFuelHistoryLast30Days(ctx *fiber.Ctx) error {
	// Get truck ID from path
	truckIDStr := ctx.Params("truckID")
	truckID, err := strconv.ParseUint(truckIDStr, 10, 32)
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			"Invalid truck ID",
		))
	}
	
	// Check if start_date and end_date are provided
	startDateStr := ctx.Query("start_date")
	endDateStr := ctx.Query("end_date")
	
	// If both start_date and end_date are provided, use custom date range
	if startDateStr != "" && endDateStr != "" {
		// Parse start date
		startDate, err := time.Parse("2006-01-02", startDateStr)
		if err != nil {
			return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
				fiber.StatusBadRequest,
				"Invalid start date format. Use YYYY-MM-DD",
			))
		}
		
		// Parse end date and set to end of day
		endDate, err := time.Parse("2006-01-02", endDateStr)
		if err != nil {
			return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
				fiber.StatusBadRequest,
				"Invalid end date format. Use YYYY-MM-DD",
			))
		}
		// Set end date to end of day for inclusive filtering
		endDate = endDate.Add(23*time.Hour + 59*time.Minute + 59*time.Second)
		
		// Get fuel history by date range
		fuelData, err := c.truckHistoryService.GetFuelHistoryByDateRange(uint(truckID), startDate, endDate)
		if err != nil {
			return ctx.Status(fiber.StatusInternalServerError).JSON(model.SimpleErrorResponse(
				fiber.StatusInternalServerError,
				"Failed to get fuel history",
			))
		}
		
		// Return response
		return ctx.Status(fiber.StatusOK).JSON(model.SuccessResponse(
			"trucks.getFuelHistoryByDateRange",
			fuelData,
		))
	}
	
	// Otherwise, use default 30 days history
	fuelData, err := c.truckHistoryService.GetFuelHistoryLast30Days(uint(truckID))
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(model.SimpleErrorResponse(
			fiber.StatusInternalServerError,
			"Failed to get fuel history",
		))
	}
	
	// Return response
	return ctx.Status(fiber.StatusOK).JSON(model.SuccessResponse(
		"trucks.getFuelHistoryLast30Days",
		fuelData,
	))
}