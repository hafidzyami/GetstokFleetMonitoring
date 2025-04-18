package controller

import (
	"fmt"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/model"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/service"
)

type DriverLocationController struct {
	locationService service.DriverLocationService
}

func NewDriverLocationController(locationService service.DriverLocationService) *DriverLocationController {
	return &DriverLocationController{
		locationService: locationService,
	}
}

// UpdateDriverLocation godoc
// @Summary Update driver location
// @Description Update the current location of a driver for a specific route
// @Tags driver-locations
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token" default(Bearer <token>)
// @Param id path int true "Route plan ID"
// @Param request body model.DriverLocationRequest true "Location details"
// @Success 200 {object} model.BaseResponse "Successfully updated location"
// @Failure 400 {object} model.BaseResponse "Bad request"
// @Failure 401 {object} model.BaseResponse "Unauthorized"
// @Failure 404 {object} model.BaseResponse "Not found"
// @Router /route-plans/{id}/location [post]
func (c *DriverLocationController) UpdateDriverLocation(ctx *fiber.Ctx) error {
	// Get route plan ID from params
	routePlanIDParam := ctx.Params("id")
	routePlanID, err := strconv.ParseUint(routePlanIDParam, 10, 32)
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			"Invalid route plan ID",
		))
	}

	// Get driver ID from JWT token
	driverID := ctx.Locals("userId").(uint)

	// Parse request body
	var req model.DriverLocationRequest
	if err := ctx.BodyParser(&req); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			"Invalid request body: "+err.Error(),
		))
	}

	// Validate request
	if req.Latitude == 0 || req.Longitude == 0 {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			"Latitude and longitude are required",
		))
	}

	// Update driver location
	location, err := c.locationService.UpdateDriverLocation(uint(routePlanID), driverID, req)
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			err.Error(),
		))
	}

	// Return response
	return ctx.Status(fiber.StatusOK).JSON(model.SuccessResponse(
		"driver-locations.update",
		location,
	))
}

// GetLatestDriverLocation godoc
// @Summary Get latest driver location
// @Description Get the latest location of a driver for a specific route
// @Tags driver-locations
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token" default(Bearer <token>)
// @Param id path int true "Route plan ID"
// @Success 200 {object} model.BaseResponse "Driver location data"
// @Failure 401 {object} model.BaseResponse "Unauthorized"
// @Failure 404 {object} model.BaseResponse "Not found"
// @Router /route-plans/{id}/location/latest [get]
func (c *DriverLocationController) GetLatestDriverLocation(ctx *fiber.Ctx) error {
	// Get route plan ID from params
	routePlanIDParam := ctx.Params("id")
	routePlanID, err := strconv.ParseUint(routePlanIDParam, 10, 32)
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			"Invalid route plan ID",
		))
	}

	// Get latest location
	location, err := c.locationService.GetLatestDriverLocation(uint(routePlanID))
	if err != nil {
		return ctx.Status(fiber.StatusNotFound).JSON(model.SimpleErrorResponse(
			fiber.StatusNotFound,
			err.Error(),
		))
	}

	// Return response
	return ctx.Status(fiber.StatusOK).JSON(model.SuccessResponse(
		"driver-locations.getLatest",
		location,
	))
}

// GetDriverLocationHistory godoc
// @Summary Get driver location history
// @Description Get the location history of a driver for a specific route
// @Tags driver-locations
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token" default(Bearer <token>)
// @Param id path int true "Route plan ID"
// @Success 200 {object} model.BaseResponse "Driver location history data"
// @Failure 401 {object} model.BaseResponse "Unauthorized"
// @Failure 404 {object} model.BaseResponse "Not found"
// @Router /route-plans/{id}/location/history [get]
func (c *DriverLocationController) GetDriverLocationHistory(ctx *fiber.Ctx) error {
	// Get route plan ID from params
	routePlanIDParam := ctx.Params("id")
	routePlanID, err := strconv.ParseUint(routePlanIDParam, 10, 32)
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			"Invalid route plan ID",
		))
	}

	// Get location history
	locations, err := c.locationService.GetDriverLocationHistory(uint(routePlanID))
	if err != nil {
		return ctx.Status(fiber.StatusNotFound).JSON(model.SimpleErrorResponse(
			fiber.StatusNotFound,
			err.Error(),
		))
	}

	// Return response
	return ctx.Status(fiber.StatusOK).JSON(model.SuccessResponse(
		"driver-locations.getHistory",
		locations,
	))
}

// GetActiveRoute godoc
// @Summary Get active route
// @Description Get the active route for a driver with their current location
// @Tags driver-locations
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token" default(Bearer <token>)
// @Success 200 {object} model.BaseResponse "Active route data"
// @Failure 401 {object} model.BaseResponse "Unauthorized"
// @Failure 404 {object} model.BaseResponse "Not found"
// @Router /route-plans/active [get]
func (c *DriverLocationController) GetActiveRoute(ctx *fiber.Ctx) error {
	// Get driver ID from JWT token
	driverID := ctx.Locals("userId").(uint)

	// Tambahkan log untuk debugging
	fmt.Println("GetActiveRoute called, driverID:", driverID)

	// Get active route
	activeRoute, err := c.locationService.GetActiveRoute(driverID)
	if err != nil {
		// Ubah status code jika tidak ditemukan rute aktif
		if err.Error() == "no active route found for this driver" {
			return ctx.Status(fiber.StatusNotFound).JSON(model.SimpleErrorResponse(
				fiber.StatusNotFound,
				"No active route found for this driver",
			))
		}
		
		// Untuk error lainnya
		return ctx.Status(fiber.StatusInternalServerError).JSON(model.SimpleErrorResponse(
			fiber.StatusInternalServerError,
			"Error fetching active route: " + err.Error(),
		))
	}

	// Return response
	return ctx.Status(fiber.StatusOK).JSON(model.SuccessResponse(
		"driver-locations.getActiveRoute",
		activeRoute,
	))
}

// DeleteLocationHistory godoc
// @Summary Delete location history
// @Description Delete all location history for a route
// @Tags driver-locations
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token" default(Bearer <token>)
// @Param id path int true "Route plan ID"
// @Success 200 {object} model.BaseResponse "Success message"
// @Failure 401 {object} model.BaseResponse "Unauthorized"
// @Failure 404 {object} model.BaseResponse "Not found"
// @Router /route-plans/{id}/location/history [delete]
func (c *DriverLocationController) DeleteLocationHistory(ctx *fiber.Ctx) error {
	// Get route plan ID from params
	routePlanIDParam := ctx.Params("id")
	routePlanID, err := strconv.ParseUint(routePlanIDParam, 10, 32)
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			"Invalid route plan ID",
		))
	}

	// Delete location history
	if err := c.locationService.DeleteLocationHistory(uint(routePlanID)); err != nil {
		return ctx.Status(fiber.StatusNotFound).JSON(model.SimpleErrorResponse(
			fiber.StatusNotFound,
			err.Error(),
		))
	}

	// Return response
	return ctx.Status(fiber.StatusOK).JSON(model.SuccessResponse(
		"driver-locations.deleteHistory",
		map[string]string{"message": "Location history deleted successfully"},
	))
}