package controller

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/model"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/service"
)

type TruckIdleController struct {
	idleService service.TruckIdleService
}

func NewTruckIdleController(idleService service.TruckIdleService) *TruckIdleController {
	return &TruckIdleController{
		idleService: idleService,
	}
}

// GetAllIdleDetections godoc
// @Summary Get all idle detections
// @Description Get all truck idle detections
// @Tags idle-detections
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token" default(Bearer <token>)
// @Success 200 {object} model.BaseResponse "Idle detection data"
// @Failure 401 {object} model.BaseResponse "Unauthorized"
// @Router /idle-detections [get]
func (c *TruckIdleController) GetAllIdleDetections(ctx *fiber.Ctx) error {
	// Get idle detections
	detections, err := c.idleService.GetAllIdleDetections()
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(model.SimpleErrorResponse(
			fiber.StatusInternalServerError,
			"Error fetching idle detections: "+err.Error(),
		))
	}

	// Return response
	return ctx.Status(fiber.StatusOK).JSON(model.SuccessResponse(
		"idle-detections.getAll",
		detections,
	))
}

// GetIdleDetectionsByTruckID godoc
// @Summary Get idle detections by truck ID
// @Description Get idle detections for a specific truck
// @Tags idle-detections
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token" default(Bearer <token>)
// @Param id path int true "Truck ID"
// @Success 200 {object} model.BaseResponse "Idle detection data"
// @Failure 401 {object} model.BaseResponse "Unauthorized"
// @Failure 404 {object} model.BaseResponse "Not found"
// @Router /trucks/{id}/idle-detections [get]
func (c *TruckIdleController) GetIdleDetectionsByTruckID(ctx *fiber.Ctx) error {
	// Get truck ID from params
	truckIDParam := ctx.Params("id")
	truckID, err := strconv.ParseUint(truckIDParam, 10, 32)
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			"Invalid truck ID",
		))
	}

	// Get idle detections
	detections, err := c.idleService.GetIdleDetectionsByTruckID(uint(truckID))
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(model.SimpleErrorResponse(
			fiber.StatusInternalServerError,
			"Error fetching idle detections: "+err.Error(),
		))
	}

	// Return response
	return ctx.Status(fiber.StatusOK).JSON(model.SuccessResponse(
		"idle-detections.getByTruckID",
		detections,
	))
}

// GetIdleDetectionsByMacID godoc
// @Summary Get idle detections by MAC ID
// @Description Get idle detections for a specific MAC ID
// @Tags idle-detections
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token" default(Bearer <token>)
// @Param macID path string true "MAC ID"
// @Success 200 {object} model.BaseResponse "Idle detection data"
// @Failure 401 {object} model.BaseResponse "Unauthorized"
// @Failure 404 {object} model.BaseResponse "Not found"
// @Router /trucks/mac/{macID}/idle-detections [get]
func (c *TruckIdleController) GetIdleDetectionsByMacID(ctx *fiber.Ctx) error {
	// Get MAC ID from params
	macID := ctx.Params("macID")

	// Get idle detections
	detections, err := c.idleService.GetIdleDetectionsByMacID(macID)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(model.SimpleErrorResponse(
			fiber.StatusInternalServerError,
			"Error fetching idle detections: "+err.Error(),
		))
	}

	// Return response
	return ctx.Status(fiber.StatusOK).JSON(model.SuccessResponse(
		"idle-detections.getByMacID",
		detections,
	))
}

// GetActiveIdleDetections godoc
// @Summary Get active idle detections
// @Description Get all active (unresolved) idle detections
// @Tags idle-detections
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token" default(Bearer <token>)
// @Success 200 {object} model.BaseResponse "Active idle detection data"
// @Failure 401 {object} model.BaseResponse "Unauthorized"
// @Router /idle-detections/active [get]
func (c *TruckIdleController) GetActiveIdleDetections(ctx *fiber.Ctx) error {
	// Get active idle detections
	detections, err := c.idleService.GetActiveIdleDetections()
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(model.SimpleErrorResponse(
			fiber.StatusInternalServerError,
			"Error fetching active idle detections: "+err.Error(),
		))
	}

	// Return response
	return ctx.Status(fiber.StatusOK).JSON(model.SuccessResponse(
		"idle-detections.getActive",
		detections,
	))
}

// ResolveIdleDetection godoc
// @Summary Resolve idle detection
// @Description Mark an idle detection as resolved
// @Tags idle-detections
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token" default(Bearer <token>)
// @Param id path int true "Idle detection ID"
// @Success 200 {object} model.BaseResponse "Success message"
// @Failure 401 {object} model.BaseResponse "Unauthorized"
// @Failure 404 {object} model.BaseResponse "Not found"
// @Router /idle-detections/{id}/resolve [put]
func (c *TruckIdleController) ResolveIdleDetection(ctx *fiber.Ctx) error {
	// Get idle detection ID from params
	idleIDParam := ctx.Params("id")
	idleID, err := strconv.ParseUint(idleIDParam, 10, 32)
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			"Invalid idle detection ID",
		))
	}

	// Resolve idle detection
	if err := c.idleService.ResolveIdleDetection(uint(idleID)); err != nil {
		return ctx.Status(fiber.StatusNotFound).JSON(model.SimpleErrorResponse(
			fiber.StatusNotFound,
			err.Error(),
		))
	}

	// Return response
	return ctx.Status(fiber.StatusOK).JSON(model.SuccessResponse(
		"idle-detections.resolve",
		map[string]string{"message": "Idle detection resolved successfully"},
	))
}
