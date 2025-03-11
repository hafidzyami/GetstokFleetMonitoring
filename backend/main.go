package main

import (
	"fmt"
	"log"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/gofiber/swagger"
	_ "github.com/hafidzyami/GetstokFleetMonitoring/backend/docs" // Import generated docs

	"github.com/hafidzyami/GetstokFleetMonitoring/backend/repository"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/config"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/controller"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/middleware"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/service"
)


// @host localhost:3000
// @BasePath /api
// @schemes http
func main() {
	// Load environment variables
	config.LoadEnv()

	// Connect to database
	config.ConnectDB()

	// Initialize repositories
	userRepo := repository.NewUserRepository()

	// Initialize services
	authService := service.NewAuthService(userRepo)

	// Initialize controllers
	authController := controller.NewAuthController(authService)

	// Initialize Fiber app
	app := fiber.New(fiber.Config{
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			// Status code defaults to 500
			code := fiber.StatusInternalServerError

			// Check if it's a Fiber error
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}

			// Return JSON error message
			return c.Status(code).JSON(fiber.Map{
				"message": err.Error(),
			})
		},
	})

	// Middleware
	app.Use(logger.New())  // Logger middleware
	app.Use(recover.New()) // Recover middleware
	app.Use(cors.New())    // CORS middleware

	// Swagger route
	app.Get("/swagger/*", swagger.HandlerDefault)

	// Routes
	api := app.Group("/api")

	// Auth routes
	auth := api.Group("/auth")
	auth.Post("/register", authController.Register)
	auth.Post("/login", authController.Login)

	// Protected routes
	api.Get("/profile", middleware.Protected(), authController.GetProfile)

	// Get port from environment variables
	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	// Start server
	log.Fatal(app.Listen(fmt.Sprintf(":%s", port)))
}
