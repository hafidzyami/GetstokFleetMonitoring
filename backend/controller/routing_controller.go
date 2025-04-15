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
// @Summary Get directions from OpenRouteService
// @Description Proxy API call to OpenRouteService to get directions
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
	// Ambil body request
	requestBody := ctx.Body()
	
	// Validasi JSON
	var req model.RoutingRequest
	if err := ctx.BodyParser(&req); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			"Invalid request body: " + err.Error(),
		))
	}
	
	// Periksa apakah ada koordinat
	if len(req.Coordinates) < 2 {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			"Minimum 2 coordinates are required",
		))
	}
	
	// Panggil service untuk mendapatkan directions
	responseBody, err := c.routingService.GetDirections(requestBody)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(model.SimpleErrorResponse(
			fiber.StatusInternalServerError,
			err.Error(),
		))
	}
	
	// Kirim response ke client
	ctx.Set("Content-Type", "application/json")
	return ctx.Send(responseBody)
}