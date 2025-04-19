package controller

import (
	"github.com/gofiber/fiber/v2"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/model"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/service"
	"strconv"
	"time"
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

// UpdateTruckInfoByID godoc
// @Summary Update truck information by ID
// @Description Update truck plate number, type, and MAC ID by truck ID
// @Tags trucks
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token" default(Bearer <token>)
// @Param id path string true "ID of the truck"
// @Param request body model.TruckUpdateFullRequest true "Truck update information"
// @Success 200 {object} model.BaseResponse "Success message"
// @Failure 400 {object} model.BaseResponse "Bad request"
// @Failure 401 {object} model.BaseResponse "Unauthorized"
// @Failure 404 {object} model.BaseResponse "Not found"
// @Router /trucks/id/{id} [put]
func (c *TruckController) UpdateTruckInfoByID(ctx *fiber.Ctx) error {
	// Get id from params
	id := ctx.Params("id")
	
	// Parse request body
	var req model.TruckUpdateFullRequest
	if err := ctx.BodyParser(&req); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			"Invalid request body",
		))
	}
	
	// Validate request
	if req.PlateNumber == "" && req.Type == "" && req.MacID == "" {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			"At least one of plate_number, type, or mac_id must be provided",
		))
	}
	
	// Convert id string to uint
	idUint, err := strconv.ParseUint(id, 10, 64)
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			"Invalid ID format",
		))
	}
	
	// Update truck info
	err = c.truckService.UpdateTruckInfoByID(uint(idUint), req.MacID, req.PlateNumber, req.Type)
	if err != nil {
		return ctx.Status(fiber.StatusNotFound).JSON(model.SimpleErrorResponse(
			fiber.StatusNotFound,
			"Truck not found or error updating: " + err.Error(),
		))
	}
	
	// Return success response
	return ctx.Status(fiber.StatusOK).JSON(model.SuccessResponse(
		"trucks.updateInfoByID",
		map[string]string{"message": "Truck information updated successfully"},
	))
}

// CreateTruck godoc
// @Summary Create a new truck
// @Description Create a new truck with mac_id, type, and plate_number
// @Tags trucks
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token" default(Bearer <token>)
// @Param request body model.TruckCreateRequest true "Truck creation information"
// @Success 201 {object} model.BaseResponse "Success message"
// @Failure 400 {object} model.BaseResponse "Bad request"
// @Failure 401 {object} model.BaseResponse "Unauthorized"
// @Router /trucks [post]
func (c *TruckController) CreateTruck(ctx *fiber.Ctx) error {
	// Parse request body
	var req model.TruckCreateRequest
	if err := ctx.BodyParser(&req); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			"Invalid request body",
		))
	}
	
	// Validate request
	if req.MacID == "" {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			"MAC ID is required",
		))
	}
	
	if req.PlateNumber == "" {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			"Plate number is required",
		))
	}
	
	if req.Type == "" {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			"Truck type is required",
		))
	}
	
	// Create truck
	now := time.Now()
	newTruck := model.Truck{
		MacID: req.MacID,
		Type: req.Type,
		PlateNumber: req.PlateNumber,
		Latitude: 0,
		Longitude: 0,
		Fuel: 0,
		LastPosition: now,
		LastFuel: now,
		CreatedAt: now,
		UpdatedAt: now,
	}
	
	// Call service to create the truck
	if err := c.truckService.CreateTruck(&newTruck); err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(model.SimpleErrorResponse(
			fiber.StatusInternalServerError,
			"Failed to create truck: " + err.Error(),
		))
	}
	
	// Return success response
	return ctx.Status(fiber.StatusCreated).JSON(model.SuccessResponse(
		"trucks.create",
		newTruck.ToTruckResponse(),
	))
}