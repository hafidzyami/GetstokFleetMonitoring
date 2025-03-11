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
// @Param request body model.RegisterRequest true "Register request"
// @Success 201 {object} model.AuthResponse "Successfully registered user"
// @Failure 400 {object} map[string]string "Bad request"
// @Router /auth/register [post]
func (c *AuthController) Register(ctx *fiber.Ctx) error {
	// Parse request body
	var req model.RegisterRequest
	if err := ctx.BodyParser(&req); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Invalid request body",
		})
	}
	
	// Validate request
	if req.Name == "" || req.Email == "" || req.Password == "" {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Name, email, and password are required",
		})
	}
	
	// Register user
	res, err := c.authService.Register(req)
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": err.Error(),
		})
	}
	
	// Return response
	return ctx.Status(fiber.StatusCreated).JSON(res)
}

// Login godoc
// @Summary Login a user
// @Description Authenticate a user and return a token
// @Tags auth
// @Accept json
// @Produce json
// @Param request body model.LoginRequest true "Login request"
// @Success 200 {object} model.AuthResponse "Successfully authenticated"
// @Failure 400 {object} map[string]string "Bad request"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Router /auth/login [post]
func (c *AuthController) Login(ctx *fiber.Ctx) error {
	// Parse request body
	var req model.LoginRequest
	if err := ctx.BodyParser(&req); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Invalid request body",
		})
	}
	
	// Validate request
	if req.Email == "" || req.Password == "" {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Email and password are required",
		})
	}
	
	// Login user
	res, err := c.authService.Login(req)
	if err != nil {
		return ctx.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"message": err.Error(),
		})
	}
	
	// Return response
	return ctx.Status(fiber.StatusOK).JSON(res)
}

// GetProfile godoc
// @Summary Get user profile
// @Description Get the profile of the authenticated user
// @Tags profile
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token" default(Bearer <token>)
// @Success 200 {object} model.UserResponse "User profile"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 404 {object} map[string]string "Not found"
// @Router /profile [get]
func (c *AuthController) GetProfile(ctx *fiber.Ctx) error {
	// Get user ID from locals
	userId := ctx.Locals("userId").(uint)
	
	// Get user profile
	user, err := c.authService.GetUserByID(userId)
	if err != nil {
		return ctx.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"message": "User not found",
		})
	}
	
	// Return response
	return ctx.Status(fiber.StatusOK).JSON(user)
}