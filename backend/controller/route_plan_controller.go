package controller

import (
	"strconv"
	"strings"

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

// GetRoutePlansByDriverID godoc
// @Summary Get route plans by driver ID
// @Description Get all route plans created for a specific driver
// @Tags route-plans
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token" default(Bearer <token>)
// @Param driverID path int true "Driver ID"
// @Success 200 {object} model.BaseResponse "Route plans data"
// @Failure 401 {object} model.BaseResponse "Unauthorized"
// @Failure 404 {object} model.BaseResponse "Not found"
// @Router /route-plans/driver/{driverID} [get]
func (c *RoutePlanController) GetRoutePlansByDriverID(ctx *fiber.Ctx) error {
    // Get driver ID from params
    driverIDParam := ctx.Params("driverID")
    driverID, err := strconv.ParseUint(driverIDParam, 10, 32)
    if err != nil {
        return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
            fiber.StatusBadRequest,
            "Invalid driver ID",
        ))
    }

    // Get route plans for driver
    routePlans, err := c.routePlanService.GetRoutePlansByDriverID(uint(driverID))
    if err != nil {
        return ctx.Status(fiber.StatusInternalServerError).JSON(model.SimpleErrorResponse(
            fiber.StatusInternalServerError,
            "Failed to get route plans data",
        ))
    }

    // If no route plans found, return empty array instead of 404
    if len(routePlans) == 0 {
        return ctx.Status(fiber.StatusOK).JSON(model.SuccessResponse(
            "route-plans.getByDriverID",
            []interface{}{},
        ))
    }

    // Return response
    return ctx.Status(fiber.StatusOK).JSON(model.SuccessResponse(
        "route-plans.getByDriverID",
        routePlans,
    ))
}

// AddAvoidanceArea godoc
// @Summary Add avoidance area to a route plan
// @Description Add new avoidance area with points to an existing route plan
// @Tags route-plans
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token" default(Bearer <token>)
// @Param id path int true "Route plan ID"
// @Param request body model.AvoidanceAreaRequest true "Avoidance area details"
// @Success 200 {object} model.BaseResponse "Successfully added avoidance area"
// @Failure 400 {object} model.BaseResponse "Bad request"
// @Failure 401 {object} model.BaseResponse "Unauthorized"
// @Failure 404 {object} model.BaseResponse "Not found"
// @Router /route-plans/{id}/avoidance [post]
func (c *RoutePlanController) AddAvoidanceArea(ctx *fiber.Ctx) error {
    // Parse route plan ID
    idParam := ctx.Params("id")
    id, err := strconv.ParseUint(idParam, 10, 32)
    if err != nil {
        return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
            fiber.StatusBadRequest,
            "Invalid route plan ID",
        ))
    }
    
    // Parse request
    var req struct {
        AvoidanceAreas []model.AvoidanceAreaRequest `json:"avoidance_areas"`
    }
    if err := ctx.BodyParser(&req); err != nil {
        return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
            fiber.StatusBadRequest,
            "Invalid request body: " + err.Error(),
        ))
    }
    
    // Validasi request
    if len(req.AvoidanceAreas) == 0 {
        return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
            fiber.StatusBadRequest,
            "At least one avoidance area is required",
        ))
    }
    
    // Panggil service
    result, err := c.routePlanService.AddAvoidanceAreaToRoutePlan(uint(id), req.AvoidanceAreas)
    if err != nil {
        // Handle error tergantung tipe errornya
        if strings.Contains(err.Error(), "not found") {
            return ctx.Status(fiber.StatusNotFound).JSON(model.SimpleErrorResponse(
                fiber.StatusNotFound,
                err.Error(),
            ))
        }
        return ctx.Status(fiber.StatusInternalServerError).JSON(model.SimpleErrorResponse(
            fiber.StatusInternalServerError,
            err.Error(),
        ))
    }
    
    // Return response
    return ctx.Status(fiber.StatusOK).JSON(model.SuccessResponse(
        "route-plans.addAvoidanceArea",
        result,
    ))
}

// UpdateAvoidanceAreaStatus godoc
// @Summary Update avoidance area status
// @Description Update the status of an avoidance area
// @Tags route-plans
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token" default(Bearer <token>)
// @Param id path int true "Avoidance area ID"
// @Param request body map[string]string true "Status update"
// @Success 200 {object} model.BaseResponse "Success message"
// @Failure 400 {object} model.BaseResponse "Bad request"
// @Failure 401 {object} model.BaseResponse "Unauthorized"
// @Failure 404 {object} model.BaseResponse "Not found"
// @Router /route-plans/avoidance/{id}/status [put]
func (c *RoutePlanController) UpdateAvoidanceAreaStatus(ctx *fiber.Ctx) error {
    // Get ID from params
    idParam := ctx.Params("id")
    id, err := strconv.ParseUint(idParam, 10, 32)
    if err != nil {
        return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
            fiber.StatusBadRequest,
            "Invalid avoidance area ID",
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
    if err := c.routePlanService.UpdateAvoidanceAreaStatus(uint(id), status); err != nil {
        if strings.Contains(err.Error(), "not found") {
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

    // Return response
    return ctx.Status(fiber.StatusOK).JSON(model.SuccessResponse(
        "route-plans.updateAvoidanceAreaStatus",
        map[string]string{"message": "Avoidance area status updated successfully"},
    ))
}

// DeleteAvoidanceArea godoc
// @Summary Delete an avoidance area
// @Description Delete an avoidance area and all its points
// @Tags route-plans
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token" default(Bearer <token>)
// @Param id path int true "Avoidance area ID"
// @Success 200 {object} model.BaseResponse "Success message"
// @Failure 400 {object} model.BaseResponse "Bad request"
// @Failure 401 {object} model.BaseResponse "Unauthorized"
// @Failure 404 {object} model.BaseResponse "Not found"
// @Router /route-plans/avoidance/{id} [delete]
func (c *RoutePlanController) DeleteAvoidanceArea(ctx *fiber.Ctx) error {
    // Get ID from params
    idParam := ctx.Params("id")
    id, err := strconv.ParseUint(idParam, 10, 32)
    if err != nil {
        return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
            fiber.StatusBadRequest,
            "Invalid avoidance area ID",
        ))
    }

    // Delete avoidance area
    if err := c.routePlanService.DeleteAvoidanceArea(uint(id)); err != nil {
        if strings.Contains(err.Error(), "not found") {
            return ctx.Status(fiber.StatusNotFound).JSON(model.SimpleErrorResponse(
                fiber.StatusNotFound,
                err.Error(),
            ))
        }
        return ctx.Status(fiber.StatusInternalServerError).JSON(model.SimpleErrorResponse(
            fiber.StatusInternalServerError,
            "Failed to delete avoidance area: " + err.Error(),
        ))
    }

    // Return response
    return ctx.Status(fiber.StatusOK).JSON(model.SuccessResponse(
        "route-plans.deleteAvoidanceArea",
        map[string]string{"message": "Avoidance area deleted successfully"},
    ))
}

// GetPermanentAvoidanceAreas godoc
// @Summary Get all permanent avoidance areas
// @Description Get a list of all permanent avoidance areas
// @Tags route-plans
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token" default(Bearer <token>)
// @Success 200 {object} model.BaseResponse "Permanent avoidance areas data"
// @Failure 401 {object} model.BaseResponse "Unauthorized"
// @Router /route-plans/avoidance/permanent [get]
func (c *RoutePlanController) GetPermanentAvoidanceAreas(ctx *fiber.Ctx) error {
    // Get all permanent avoidance areas
    avoidanceAreas, err := c.routePlanService.GetAvoidanceAreasByPermanentStatus(true)
    if err != nil {
        return ctx.Status(fiber.StatusInternalServerError).JSON(model.SimpleErrorResponse(
            fiber.StatusInternalServerError,
            "Failed to get permanent avoidance areas: " + err.Error(),
        ))
    }

    // Return response
    return ctx.Status(fiber.StatusOK).JSON(model.SuccessResponse(
        "route-plans.getPermanentAvoidanceAreas",
        avoidanceAreas,
    ))
}

// GetNonPermanentAvoidanceAreas godoc
// @Summary Get all non-permanent avoidance areas
// @Description Get a list of all non-permanent avoidance areas
// @Tags route-plans
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token" default(Bearer <token>)
// @Success 200 {object} model.BaseResponse "Non-permanent avoidance areas data"
// @Failure 401 {object} model.BaseResponse "Unauthorized"
// @Router /route-plans/avoidance/non-permanent [get]
func (c *RoutePlanController) GetNonPermanentAvoidanceAreas(ctx *fiber.Ctx) error {
    // Get all non-permanent avoidance areas
    avoidanceAreas, err := c.routePlanService.GetAvoidanceAreasByPermanentStatus(false)
    if err != nil {
        return ctx.Status(fiber.StatusInternalServerError).JSON(model.SimpleErrorResponse(
            fiber.StatusInternalServerError,
            "Failed to get non-permanent avoidance areas: " + err.Error(),
        ))
    }

    // Return response
    return ctx.Status(fiber.StatusOK).JSON(model.SuccessResponse(
        "route-plans.getNonPermanentAvoidanceAreas",
        avoidanceAreas,
    ))
}