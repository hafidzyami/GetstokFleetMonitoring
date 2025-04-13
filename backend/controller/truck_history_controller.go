// controller/truck_history_controller.go
package controller

import (
	"strconv"

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
// @Router /trucks/{truckID}/positions [get]
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
// @Router /trucks/{truckID}/fuel [get]
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