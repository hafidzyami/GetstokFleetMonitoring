package controller

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/model"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/service"
)

type RoutePlanController struct {
	routePlanService service.RoutePlanService
}

func NewRoutePlanController(routePlanService service.RoutePlanService) *RoutePlanController {
	return &RoutePlanController{
		routePlanService: routePlanService,
	}
}

// CreateRoutePlan godoc
// @Summary Create a new route plan
// @Description Create a new route plan with waypoints and avoidance areas
// @Tags route-plans
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token" default(Bearer <token>)
// @Param request body model.RoutePlanCreateRequest true "Route plan details"
// @Success 201 {object} model.BaseResponse "Successfully created route plan"
// @Failure 400 {object} model.BaseResponse "Bad request"
// @Failure 401 {object} model.BaseResponse "Unauthorized"
// @Router /route-plans [post]
func (c *RoutePlanController) CreateRoutePlan(ctx *fiber.Ctx) error {
	// Parse request body
	var req model.RoutePlanCreateRequest
	if err := ctx.BodyParser(&req); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			"Invalid request body: " + err.Error(),
		))
	}

	// Validate request
	if req.DriverName == "" || req.VehiclePlate == "" {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			"Driver name and vehicle plate are required",
		))
	}

	if len(req.Waypoints) < 2 {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			"At least two waypoints are required",
		))
	}

	// Get planner ID from locals (current authenticated user)
	plannerId := ctx.Locals("userId").(uint)

	// Create route plan
	result, err := c.routePlanService.CreateRoutePlan(req, plannerId)
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			err.Error(),
		))
	}

	// Return response
	return ctx.Status(fiber.StatusCreated).JSON(model.SuccessResponse(
		"route-plans.create",
		result,
	))
}

// GetRoutePlanByID godoc
// @Summary Get route plan by ID
// @Description Get detailed information about a specific route plan
// @Tags route-plans
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token" default(Bearer <token>)
// @Param id path int true "Route plan ID"
// @Success 200 {object} model.BaseResponse "Route plan data"
// @Failure 401 {object} model.BaseResponse "Unauthorized"
// @Failure 404 {object} model.BaseResponse "Not found"
// @Router /route-plans/{id} [get]
func (c *RoutePlanController) GetRoutePlanByID(ctx *fiber.Ctx) error {
	// Get ID from params
	idParam := ctx.Params("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			"Invalid route plan ID",
		))
	}

	// Get route plan
	routePlan, err := c.routePlanService.GetRoutePlanByID(uint(id))
	if err != nil {
		return ctx.Status(fiber.StatusNotFound).JSON(model.SimpleErrorResponse(
			fiber.StatusNotFound,
			"Route plan not found",
		))
	}

	// Return response
	return ctx.Status(fiber.StatusOK).JSON(model.SuccessResponse(
		"route-plans.getById",
		routePlan,
	))
}

// GetAllRoutePlans godoc
// @Summary Get all route plans
// @Description Get a list of all route plans
// @Tags route-plans
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token" default(Bearer <token>)
// @Success 200 {object} model.BaseResponse "Route plans data"
// @Failure 401 {object} model.BaseResponse "Unauthorized"
// @Router /route-plans [get]
func (c *RoutePlanController) GetAllRoutePlans(ctx *fiber.Ctx) error {
	// Get all route plans
	routePlans, err := c.routePlanService.GetAllRoutePlans()
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(model.SimpleErrorResponse(
			fiber.StatusInternalServerError,
			"Failed to get route plans data",
		))
	}

	// Return response
	return ctx.Status(fiber.StatusOK).JSON(model.SuccessResponse(
		"route-plans.getAll",
		routePlans,
	))
}

// UpdateRoutePlanStatus godoc
// @Summary Update route plan status
// @Description Update the status of a route plan
// @Tags route-plans
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token" default(Bearer <token>)
// @Param id path int true "Route plan ID"
// @Param request body map[string]string true "Status update"
// @Success 200 {object} model.BaseResponse "Success message"
// @Failure 400 {object} model.BaseResponse "Bad request"
// @Failure 401 {object} model.BaseResponse "Unauthorized"
// @Failure 404 {object} model.BaseResponse "Not found"
// @Router /route-plans/{id}/status [put]
func (c *RoutePlanController) UpdateRoutePlanStatus(ctx *fiber.Ctx) error {
	// Get ID from params
	idParam := ctx.Params("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			"Invalid route plan ID",
		))
	}

	// Parse request body
	var req map[string]string
	if err := ctx.BodyParser(&req); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			"Invalid request body",
		))
	}

	// Check if status is provided
	status, ok := req["status"]
	if !ok || status == "" {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			"Status is required",
		))
	}

	// Update status
	if err := c.routePlanService.UpdateRoutePlanStatus(uint(id), status); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			err.Error(),
		))
	}

	// Return response
	return ctx.Status(fiber.StatusOK).JSON(model.SuccessResponse(
		"route-plans.updateStatus",
		map[string]string{"message": "Route plan status updated successfully"},
	))
}

// DeleteRoutePlan godoc
// @Summary Delete a route plan
// @Description Delete a route plan and all associated data
// @Tags route-plans
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token" default(Bearer <token>)
// @Param id path int true "Route plan ID"
// @Success 200 {object} model.BaseResponse "Success message"
// @Failure 400 {object} model.BaseResponse "Bad request"
// @Failure 401 {object} model.BaseResponse "Unauthorized"
// @Failure 404 {object} model.BaseResponse "Not found"
// @Router /route-plans/{id} [delete]
func (c *RoutePlanController) DeleteRoutePlan(ctx *fiber.Ctx) error {
	// Get ID from params
	idParam := ctx.Params("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			"Invalid route plan ID",
		))
	}

	// Delete route plan
	if err := c.routePlanService.DeleteRoutePlan(uint(id)); err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(model.SimpleErrorResponse(
			fiber.StatusInternalServerError,
			"Failed to delete route plan",
		))
	}

	// Return response
	return ctx.Status(fiber.StatusOK).JSON(model.SuccessResponse(
		"route-plans.delete",
		map[string]string{"message": "Route plan deleted successfully"},
	))
}