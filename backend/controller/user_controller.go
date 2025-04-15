package controller

import (
	"github.com/gofiber/fiber/v2"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/model"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/service"
)

type UserController struct {
	userService service.UserService
}

func NewUserController(userService service.UserService) *UserController {
	return &UserController{
		userService: userService,
	}
}

// GetAllUsers godoc
// @Summary Get all users
// @Description Get all users with optional role filter
// @Tags users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token" default(Bearer <token>)
// @Param role query string false "Filter users by role (optional)"
// @Success 200 {object} model.BaseResponse "Users data"
// @Failure 401 {object} model.BaseResponse "Unauthorized"
// @Failure 403 {object} model.BaseResponse "Forbidden"
// @Router /users [get]
func (c *UserController) GetAllUsers(ctx *fiber.Ctx) error {
	// Get role from query param if exists
	role := ctx.Query("role")
	
	// Get users based on role filter
	users, err := c.userService.GetAllUsers(role)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(model.SimpleErrorResponse(
			fiber.StatusInternalServerError,
			"Failed to get users data",
		))
	}
	
	// Return response
	return ctx.Status(fiber.StatusOK).JSON(model.SuccessResponse(
		"users.getAll",
		users,
	))
}

// ResetPassword godoc
// @Summary Reset user password
// @Description Reset user password to default value
// @Tags users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token" default(Bearer <token>)
// @Param request body model.ResetPasswordRequest true "Reset password request"
// @Success 200 {object} model.BaseResponse "Success message"
// @Failure 400 {object} model.BaseResponse "Bad request"
// @Failure 401 {object} model.BaseResponse "Unauthorized"
// @Failure 403 {object} model.BaseResponse "Forbidden"
// @Failure 404 {object} model.BaseResponse "Not found"
// @Router /users/reset-password [post]
func (c *UserController) ResetPassword(ctx *fiber.Ctx) error {
	// Parse request body
	var req model.ResetPasswordRequest
	if err := ctx.BodyParser(&req); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			"Invalid request body",
		))
	}
	
	// Validate request
	if req.UserID == 0 {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			"User ID is required",
		))
	}
	
	// Reset password
	if err := c.userService.ResetPassword(req.UserID); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			err.Error(),
		))
	}
	
	// Return success response
	return ctx.Status(fiber.StatusOK).JSON(model.SuccessResponse(
		"users.resetPassword",
		map[string]string{"message": "Password reset successfully"},
	))
}