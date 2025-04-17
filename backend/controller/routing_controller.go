package controller

import (
	"github.com/gofiber/fiber/v2"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/model"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/service"
)

type RoutingController struct {
	routingService service.RoutingService
}

func NewRoutingController(routingService service.RoutingService) *RoutingController {
	return &RoutingController{
		routingService: routingService,
	}
}

// GetDirections godoc
// @Summary Get directions from external routing service (OpenRouteService)
// @Description Proxy API call to routing service to get directions
// @Tags routing
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token" default(Bearer <token>)
// @Param request body model.RoutingRequest true "Routing request parameters"
// @Success 200 {object} interface{} "Directions data"
// @Failure 400 {object} model.BaseResponse "Bad request"
// @Failure 500 {object} model.BaseResponse "Internal server error"
// @Router /routing/directions [post]
func (c *RoutingController) GetDirections(ctx *fiber.Ctx) error {
	// Get request body
	requestBody := ctx.Body()
	
	// Validate JSON
	var req model.RoutingRequest
	if err := ctx.BodyParser(&req); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			"Invalid request body: " + err.Error(),
		))
	}
	
	// Check if there are enough coordinates
	if len(req.Coordinates) < 2 {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			"Minimum 2 coordinates are required",
		))
	}
	
	// Call service to get directions
	responseBody, err := c.routingService.GetDirections(requestBody)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(model.SimpleErrorResponse(
			fiber.StatusInternalServerError,
			err.Error(),
		))
	}
	
	// Send response to client
	ctx.Set("Content-Type", "application/json")
	return ctx.Send(responseBody)
}