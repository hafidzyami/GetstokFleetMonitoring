package controller

import (
	"github.com/gofiber/fiber/v2"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/model"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/service"
)

type TruckController struct {
	truckService service.TruckService
}

func NewTruckController(truckService service.TruckService) *TruckController {
	return &TruckController{
		truckService: truckService,
	}
}

// GetAllTrucks godoc
// @Summary Get all trucks
// @Description Get all truck data with latest position and fuel
// @Tags trucks
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token" default(Bearer <token>)
// @Success 200 {object} model.BaseResponse "Trucks data"
// @Failure 401 {object} model.BaseResponse "Unauthorized"
// @Router /trucks [get]
func (c *TruckController) GetAllTrucks(ctx *fiber.Ctx) error {
	// Get all trucks
	trucks, err := c.truckService.GetAllTrucks()
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(model.SimpleErrorResponse(
			fiber.StatusInternalServerError,
			"Failed to get trucks data",
		))
	}
	
	// Return response
	return ctx.Status(fiber.StatusOK).JSON(model.SuccessResponse(
		"trucks.getAll",
		trucks,
	))
}

// GetTruckByMacID godoc
// @Summary Get truck by MacID
// @Description Get truck data by MAC ID
// @Tags trucks
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token" default(Bearer <token>)
// @Param macID path string true "MAC ID of the truck"
// @Success 200 {object} model.BaseResponse "Truck data"
// @Failure 401 {object} model.BaseResponse "Unauthorized"
// @Failure 404 {object} model.BaseResponse "Not found"
// @Router /trucks/{macID} [get]
func (c *TruckController) GetTruckByMacID(ctx *fiber.Ctx) error {
	// Get macID from params
	macID := ctx.Params("macID")
	
	// Get truck by macID
	truck, err := c.truckService.GetTruckByMacID(macID)
	if err != nil {
		return ctx.Status(fiber.StatusNotFound).JSON(model.SimpleErrorResponse(
			fiber.StatusNotFound,
			"Truck not found",
		))
	}
	
	// Return response
	return ctx.Status(fiber.StatusOK).JSON(model.SuccessResponse(
		"trucks.getByMacID",
		truck,
	))
}

// UpdateTruckInfo godoc
// @Summary Update truck information
// @Description Update truck plate number and type
// @Tags trucks
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token" default(Bearer <token>)
// @Param macID path string true "MAC ID of the truck"
// @Param request body model.TruckUpdateRequest true "Truck update information"
// @Success 200 {object} model.BaseResponse "Success message"
// @Failure 400 {object} model.BaseResponse "Bad request"
// @Failure 401 {object} model.BaseResponse "Unauthorized"
// @Failure 404 {object} model.BaseResponse "Not found"
// @Router /trucks/{macID} [put]
func (c *TruckController) UpdateTruckInfo(ctx *fiber.Ctx) error {
	// Get macID from params
	macID := ctx.Params("macID")
	
	// Parse request body
	var req model.TruckUpdateRequest
	if err := ctx.BodyParser(&req); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			"Invalid request body",
		))
	}
	
	// Validate request
	if req.PlateNumber == "" && req.Type == "" {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			"At least one of plate_number or type must be provided",
		))
	}
	
	// Update truck info
	err := c.truckService.UpdateTruckInfo(macID, req.PlateNumber, req.Type)
	if err != nil {
		return ctx.Status(fiber.StatusNotFound).JSON(model.SimpleErrorResponse(
			fiber.StatusNotFound,
			"Truck not found",
		))
	}
	
	// Return success response
	return ctx.Status(fiber.StatusOK).JSON(model.SuccessResponse(
		"trucks.updateInfo",
		map[string]string{"message": "Truck information updated successfully"},
	))
}