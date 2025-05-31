package controller

import (
	"strconv"
	"time"
	"github.com/gofiber/fiber/v2"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/model"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/service"
)

type RouteDeviationController struct {
	deviationService service.RouteDeviationService
}

func NewRouteDeviationController(deviationService service.RouteDeviationService) *RouteDeviationController {
	return &RouteDeviationController{
		deviationService: deviationService,
	}
}

// GetRouteDeviations godoc
// @Summary Get route deviations by date range and truck ID
// @Description Get route deviations within a specific date range for a specific truck
// @Tags route-deviations
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token" default(Bearer <token>)
// @Param truck_id query int true "Truck ID"
// @Param start_date query string true "Start date (format: 2006-01-02)"
// @Param end_date query string true "End date (format: 2006-01-02)"
// @Success 200 {object} model.BaseResponse "Route deviation data"
// @Failure 400 {object} model.BaseResponse "Bad request"
// @Failure 401 {object} model.BaseResponse "Unauthorized"
// @Router /route-deviations [get]
func (c *RouteDeviationController) GetRouteDeviations(ctx *fiber.Ctx) error {
	// Get truck ID from query
	truckIDStr := ctx.Query("truck_id")
	if truckIDStr == "" {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			"Truck ID is required",
		))
	}
	
	truckID, err := strconv.ParseUint(truckIDStr, 10, 32)
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			"Invalid truck ID",
		))
	}
	
	// Get date range from query
	startDateStr := ctx.Query("start_date")
	endDateStr := ctx.Query("end_date")
	
	if startDateStr == "" || endDateStr == "" {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			"Both start_date and end_date are required",
		))
	}
	
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
	
	// Get route deviations
	deviations, err := c.deviationService.GetRouteDeviationsByTruckIDAndDateRange(uint(truckID), startDate, endDate)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(model.SimpleErrorResponse(
			fiber.StatusInternalServerError,
			"Failed to get route deviations: " + err.Error(),
		))
	}
	
	// Return response
	return ctx.Status(fiber.StatusOK).JSON(model.SuccessResponse(
		"route-deviations.getByTruckIDAndDateRange",
		deviations,
	))
}
