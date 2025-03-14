package controller

import (
	"github.com/gofiber/fiber/v2"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/model"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/service"
)

type AuthController struct {
	authService service.AuthService
}

func NewAuthController(authService service.AuthService) *AuthController {
	return &AuthController{
		authService: authService,
	}
}

// Register godoc
// @Summary Register a new user
// @Description Register a new user with the provided information
// @Tags auth
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token" default(Bearer <token>)
// @Param request body model.RegisterRequest true "Register request"
// @Success 201 {object} model.BaseResponse "Successfully registered user"
// @Failure 400 {object} model.BaseResponse "Bad request"
// @Router /auth/register [post]
func (c *AuthController) Register(ctx *fiber.Ctx) error {
	// Parse request body
	var req model.RegisterRequest
	if err := ctx.BodyParser(&req); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			"Invalid request body",
		))
	}
	
	// Validate request
	if req.Name == "" || req.Email == "" || req.Role == "" {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			"Name, email, and role are required",
		))
	}
	
	// Register user
	res, err := c.authService.Register(req)
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			err.Error(),
		))
	}
	
	// Return response
	return ctx.Status(fiber.StatusCreated).JSON(model.SuccessResponse(
		"auth.register",
		res,
	))
}

// Login godoc
// @Summary Login a user
// @Description Authenticate a user and return a token
// @Tags auth
// @Accept json
// @Produce json
// @Param request body model.LoginRequest true "Login request"
// @Success 200 {object} model.BaseResponse "Successfully authenticated"
// @Failure 400 {object} model.BaseResponse "Bad request"
// @Failure 401 {object} model.BaseResponse "Unauthorized"
// @Router /auth/login [post]
func (c *AuthController) Login(ctx *fiber.Ctx) error {
	// Parse request body
	var req model.LoginRequest
	if err := ctx.BodyParser(&req); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			"Invalid request body",
		))
	}
	
	// Validate request
	if req.Email == "" || req.Password == "" {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			"Email and password are required",
		))
	}
	
	// Login user
	res, err := c.authService.Login(req)
	if err != nil {
		return ctx.Status(fiber.StatusUnauthorized).JSON(model.SimpleErrorResponse(
			fiber.StatusUnauthorized,
			err.Error(),
		))
	}
	
	// Return response
	return ctx.Status(fiber.StatusOK).JSON(model.SuccessResponse(
		"auth.login",
		res,
	))
}

// GetProfile godoc
// @Summary Get user profile
// @Description Get the profile of the authenticated user
// @Tags profile
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token" default(Bearer <token>)
// @Success 200 {object} model.BaseResponse "User profile"
// @Failure 401 {object} model.BaseResponse "Unauthorized"
// @Failure 404 {object} model.BaseResponse "Not found"
// @Router /profile [get]
func (c *AuthController) GetProfile(ctx *fiber.Ctx) error {
	// Get user ID from locals
	userId := ctx.Locals("userId").(uint)
	
	// Get user profile
	user, err := c.authService.GetUserByID(userId)
	if err != nil {
		return ctx.Status(fiber.StatusNotFound).JSON(model.SimpleErrorResponse(
			fiber.StatusNotFound,
			"User not found",
		))
	}
	
	// Return response
	return ctx.Status(fiber.StatusOK).JSON(model.SuccessResponse(
		"profile.get",
		user,
	))
}

// UpdatePassword godoc
// @Summary Update user password
// @Description Update the password of the authenticated user
// @Tags profile
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token" default(Bearer <token>)
// @Param request body model.UpdatePasswordRequest true "Update password request"
// @Success 200 {object} model.BaseResponse "Success message"
// @Failure 400 {object} model.BaseResponse "Bad request"
// @Failure 401 {object} model.BaseResponse "Unauthorized"
// @Router /profile/password [put]
func (c *AuthController) UpdatePassword(ctx *fiber.Ctx) error {
	// Get user ID from locals
	userId := ctx.Locals("userId").(uint)
	
	// Parse request body
	var req model.UpdatePasswordRequest
	if err := ctx.BodyParser(&req); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			"Invalid request body",
		))
	}
	
	// Validate request
	if req.OldPassword == "" || req.NewPassword == "" {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			"Old password and new password are required",
		))
	}
	
	// Update password
	if err := c.authService.UpdatePassword(userId, req); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			err.Error(),
		))
	}
	
	// Return success response
	return ctx.Status(fiber.StatusOK).JSON(model.SuccessResponse(
		"profile.updatePassword",
		map[string]string{"message": "Password updated successfully"},
	))
}