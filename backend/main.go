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
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/model"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/utils"

	"github.com/hafidzyami/GetstokFleetMonitoring/backend/config"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/controller"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/middleware"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/repository"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/service"
)

// @host localhost:8080
// @BasePath /api/v1
// @schemes http
func main() {
	// Load environment variables
	config.LoadEnv()

	// Connect to database
	config.ConnectDB()

	// Initialize repositories
	userRepo := repository.NewUserRepository()
	pushRepo := repository.NewPushRepository()

	// Set user repository in utils package
	utils.SetUserRepository(userRepo)

	// Initialize services
	authService := service.NewAuthService(userRepo)
	pushService := service.NewPushService(pushRepo)

	// Initialize controllers
	authController := controller.NewAuthController(authService)
	pushController := controller.NewPushController(pushService)

	// Initialize Fiber app
	app := fiber.New(fiber.Config{
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			// Status code defaults to 500
			code := fiber.StatusInternalServerError

			// Check if it's a Fiber error
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}

			// Return JSON error message menggunakan format standar
			return c.Status(code).JSON(model.SimpleErrorResponse(
				code,
				err.Error(),
			))
		},
	})

	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowMethods: "GET,POST,PUT,DELETE,OPTIONS",
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
	}))

	// Middleware
	app.Use(logger.New())  // Logger middleware
	app.Use(recover.New()) // Recover middleware
	app.Use(cors.New())    // CORS middleware

	// Swagger route
	app.Get("/swagger/*", swagger.HandlerDefault)

	// Routes
	api := app.Group("/api/v1")

	// Auth routes
	auth := api.Group("/auth")
	auth.Post("/register", middleware.RoleAuthorization("management"),authController.Register)
	auth.Post("/login", authController.Login)

	// Protected routes
	api.Get("/profile", middleware.Protected(), authController.GetProfile)
	api.Put("/profile/password", middleware.Protected(), authController.UpdatePassword)

	// Push notification routes
	push := api.Group("/push")
	push.Get("/vapid-key", pushController.GetVapidKey)
	push.Post("/subscribe", middleware.Protected(), pushController.Subscribe)
	push.Post("/unsubscribe", middleware.Protected(), pushController.Unsubscribe)
	push.Post("/send", middleware.Protected(), pushController.Send)

	// Get port from environment variables
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Start server HTTP
	log.Fatal(app.Listen(fmt.Sprintf(":%s", port)))

	// Start server HTTPS
	// log.Fatal(app.ListenTLS(fmt.Sprintf(":%s", port), "./cert/cert.pem", "./cert/key.pem"))
}
