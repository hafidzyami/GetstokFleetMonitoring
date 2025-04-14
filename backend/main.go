package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	ws "github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/gofiber/swagger"
	_ "github.com/hafidzyami/GetstokFleetMonitoring/backend/docs" // Import generated docs
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/model"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/seed"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/utils"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/websocket"

	"github.com/hafidzyami/GetstokFleetMonitoring/backend/config"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/controller"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/middleware"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/repository"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/service"

	"github.com/hafidzyami/GetstokFleetMonitoring/backend/mqtt"
)

// @host localhost:8080
// @BasePath /api/v1
// @schemes http
func main() {
	// Load environment variables
	config.LoadEnv()

	// Connect to database
	config.ConnectDB()

	// Seed
	seed.SeedUsers(config.DB)

	// Initialize repositories
	userRepo := repository.NewUserRepository()
	truckRepo := repository.NewTruckRepository()
	truckHistoryRepo := repository.NewTruckHistoryRepository()

	// Set user repository in utils and mqtt package
	utils.SetUserRepository(userRepo)
	mqtt.SetTruckRepository(truckRepo)
	mqtt.SetTruckHistoryRepository(truckHistoryRepo)

	// Websocket
	websocket.InitHub()

	// Initialize services
	authService := service.NewAuthService(userRepo)
	truckService := service.NewTruckService(truckRepo)
	truckHistoryService := service.NewTruckHistoryService(truckHistoryRepo)
	routingSerivce := service.NewRoutingService()

	// Initialize controllers
	authController := controller.NewAuthController(authService)
	truckController := controller.NewTruckController(truckService)
	truckHistoryController := controller.NewTruckHistoryController(truckHistoryService)
	routingController := controller.NewRoutingController(routingSerivce)

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

	// Websocket Middleware
	app.Use("/ws", func(c *fiber.Ctx) error {
		// IsWebSocketUpgrade returns true if the client requested upgrade to the WebSocket protocol
		if ws.IsWebSocketUpgrade(c) {
			c.Locals("allowed", true)
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	})

	// WebSocket endpoint
	app.Get("/ws", ws.New(func(c *ws.Conn) {
		log.Println("New WebSocket client connected")

		// Register client
		client := &websocket.Client{Conn: c}
		hub := websocket.GetHub()
		hub.Register(client)

		// Create a done channel to signal when the connection is closed
		done := make(chan struct{})

		// Send connection confirmation message
		testMsg := map[string]interface{}{
			"type":    "connection_established",
			"message": "WebSocket connection successfully established",
		}
		testJSON, _ := json.Marshal(testMsg)
		if err := c.WriteMessage(ws.TextMessage, testJSON); err != nil {
			log.Printf("Error sending confirmation message: %v", err)
			close(done)
			return
		}

		// Start a goroutine to keep the connection alive with pings
		go func() {
			ticker := time.NewTicker(15 * time.Second)
			defer ticker.Stop()

			for {
				select {
				case <-ticker.C:
					pingMsg := map[string]interface{}{
						"type":      "ping",
						"timestamp": time.Now().Unix(),
					}
					pingJSON, _ := json.Marshal(pingMsg)

					if err := c.WriteMessage(ws.TextMessage, pingJSON); err != nil {
						log.Printf("Error sending ping: %v", err)
						close(done)
						return
					}
				case <-done:
					return
				}
			}
		}()

		// Message handling loop
		for {
			_, message, err := c.ReadMessage()
			if err != nil {
				log.Printf("Read error: %v", err)
				break
			}

			// Process incoming messages
			log.Printf("Received message: %s", message)
		}

		// When we exit the loop, close the done channel to signal goroutines to stop
		close(done)

		// Unregister client when function returns
		hub.Unregister(client)
	}))

	// Routes
	api := app.Group("/api/v1")

	// Auth routes
	auth := api.Group("/auth")
	auth.Post("/register", middleware.RoleAuthorization("management"), authController.Register)
	auth.Post("/login", authController.Login)

	// Add truck routes
	trucks := api.Group("/trucks")
	trucks.Use(middleware.Protected())
	trucks.Get("/", truckController.GetAllTrucks)
	trucks.Get("/:macID", truckController.GetTruckByMacID)
	trucks.Put("/:macID", truckController.UpdateTruckInfo)
	// Add truck history routes
	trucks.Get("/:truckID/positions", truckHistoryController.GetPositionHistory)
	trucks.Get("/:truckID/fuel", truckHistoryController.GetFuelHistory)

	// Routing routes
	routing := api.Group("/routing")
	routing.Post("/directions", routingController.GetDirections)

	// Protected routes
	api.Get("/profile", middleware.Protected(), authController.GetProfile)
	api.Put("/profile/password", middleware.Protected(), authController.UpdatePassword)

	// Get port from environment variables
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Mulai MQTT client
	mqttClient := mqtt.StartMQTTClient()
	if mqttClient != nil {
		log.Println("MQTT client started successfully")

		// Setup graceful shutdown
		go func() {
			quit := make(chan os.Signal, 1)
			signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
			<-quit
			log.Println("Shutting down MQTT client...")
			mqttClient.Disconnect()
		}()
	} else {
		log.Println("Failed to start MQTT client")
	}

	// Start server HTTP
	log.Fatal(app.Listen(fmt.Sprintf(":%s", port)))

	// Start server HTTPS
	// log.Fatal(app.ListenTLS(fmt.Sprintf(":%s", port), "./cert/cert.pem", "./cert/key.pem"))
}
