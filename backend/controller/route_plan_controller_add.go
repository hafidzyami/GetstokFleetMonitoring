package controller

import (
	"github.com/gofiber/fiber/v2"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/model"
)

// GetAllActiveRoutePlans godoc
// @Summary Get all active route plans
// @Description Get a list of all route plans with status "active"
// @Tags route-plans
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token" default(Bearer <token>)
// @Success 200 {object} model.BaseResponse "Active route plans data"
// @Failure 401 {object} model.BaseResponse "Unauthorized"
// @Router /route-plans/active/all [get]
func (c *RoutePlanController) GetAllActiveRoutePlans(ctx *fiber.Ctx) error {
	// Get all active route plans
	routePlans, err := c.routePlanService.GetAllActiveRoutePlans()
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(model.SimpleErrorResponse(
			fiber.StatusInternalServerError,
			"Failed to get active route plans data",
		))
	}

	// Return response
	return ctx.Status(fiber.StatusOK).JSON(model.SuccessResponse(
		"route-plans.getAllActive",
		routePlans,
	))
}
