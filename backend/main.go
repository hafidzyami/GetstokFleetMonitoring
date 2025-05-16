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
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/migration"
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

	// Run migrations
	if err := migration.CreateDriverLocationsTable(); err != nil {
		log.Printf("Error creating driver_locations table: %v", err)
	}

	// Run fuel receipt migration
	if err := migration.CreateFuelReceiptsTable(); err != nil {
		log.Printf("Error creating fuel_receipts table: %v", err)
	}

	// Seed
	seed.SeedUsers(config.DB)

	// Initialize repositories
	userRepo := repository.NewUserRepository()
	truckRepo := repository.NewTruckRepository()
	truckHistoryRepo := repository.NewTruckHistoryRepository()
	routePlanRepo := repository.NewRoutePlanRepository()
	deviationRepo := repository.NewRouteDeviationRepository()
	fuelReceiptRepo := repository.NewFuelReceiptRepository()

	// Initialize services
	authService := service.NewAuthService(userRepo)
	truckService := service.NewTruckService(truckRepo)
	truckHistoryService := service.NewTruckHistoryService(truckHistoryRepo)
	routingSerivce := service.NewRoutingService()
	userService := service.NewUserService(userRepo)
	routingPlanService := service.NewRoutePlanService(routePlanRepo, truckRepo, userRepo)
	deviationService := service.NewRouteDeviationService(
		truckRepo,
		routePlanRepo,
		deviationRepo,
		userRepo, // Add userRepo here so we can get driver names
	)
	// Initialize OCR service
	ocrService := service.NewOCRService()

	// Initialize driver location repository and service
	driverLocationRepo := repository.NewDriverLocationRepository()
	driverLocationService := service.NewDriverLocationService(
		driverLocationRepo,
		routePlanRepo,
		userRepo,
		routingPlanService,
	)

	// Set repositories and services for MQTT handlers
	utils.SetUserRepository(userRepo)
	mqtt.SetTruckRepository(truckRepo)
	mqtt.SetTruckHistoryRepository(truckHistoryRepo)
	mqtt.SetRouteDeviationService(deviationService)

	// Websocket
	websocket.InitHub()

	// S3
	s3Service, _ := service.NewS3Service()
	uploadController := controller.NewUploadController(s3Service)

	// Initialize fuel receipt service
	fuelReceiptService := service.NewFuelReceiptService(
		fuelReceiptRepo,
		truckRepo,
		userRepo,
		s3Service,
	)

	// Initialize controllers
	authController := controller.NewAuthController(authService)
	truckController := controller.NewTruckController(truckService)
	truckHistoryController := controller.NewTruckHistoryController(truckHistoryService)
	routingController := controller.NewRoutingController(routingSerivce)
	userController := controller.NewUserController(userService)
	routePlanController := controller.NewRoutePlanController(routingPlanService)
	driverLocationController := controller.NewDriverLocationController(driverLocationService)
	fuelReceiptController := controller.NewFuelReceiptController(fuelReceiptService)
	ocrController := controller.NewOCRController(ocrService)

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
		// Register client
		client := &websocket.Client{Conn: c, LastPing: time.Now()}
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
				break
			}

			// Update the client's LastPing time when we receive any message
			client.LastPing = time.Now()

			// Add special handling for pong messages
			var msg map[string]interface{}
			if err := json.Unmarshal(message, &msg); err == nil {
				if msgType, ok := msg["type"].(string); ok && msgType == "pong" {
					// Explicitly update LastPing in the hub
					hub.UpdateClientPing(client)
				}
			}
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

	// User routes
	users := api.Group("/users")
	users.Use(middleware.RoleAuthorization("management", "planner", "driver"))
	users.Get("/", userController.GetAllUsers)
	users.Get("/:id", userController.GetUserByID)
	users.Get("/:id/role", userController.GetUserRoleByID)
	users.Post("/reset-password", userController.ResetPassword)

	// Add truck routes
	trucks := api.Group("/trucks")
	trucks.Use(middleware.Protected())
	trucks.Get("/", truckController.GetAllTrucks)
	trucks.Get("/:macID", truckController.GetTruckByMacID)
	trucks.Put("/:macID", truckController.UpdateTruckInfo)
	trucks.Put("/id/:id", truckController.UpdateTruckInfoByID)
	trucks.Post("/", truckController.CreateTruck)
	// Add truck history routes
	trucks.Get("/:truckID/positions", truckHistoryController.GetPositionHistoryLast30Days)
	trucks.Get("/:truckID/fuel", truckHistoryController.GetFuelHistoryLast30Days)
	trucks.Get("/:truckID/positions/limited", truckHistoryController.GetPositionHistory)
	trucks.Get("/:truckID/fuel/limited", truckHistoryController.GetFuelHistory)

	// Routing routes
	routing := api.Group("/routing")
	routing.Post("/directions", routingController.GetDirections)

	// Route plans routes
	routePlans := api.Group("/route-plans")
	routePlans.Use(middleware.Protected())
	routePlans.Post("/", routePlanController.CreateRoutePlan)
	routePlans.Get("/", routePlanController.GetAllRoutePlans)
	// Endpoint untuk rute aktif - HARUS sebelum /:id agar tidak bentrok
	routePlans.Get("/active", driverLocationController.GetActiveRoute)
	routePlans.Get("/active/all", routePlanController.GetAllActiveRoutePlans)
	routePlans.Get("/:id", routePlanController.GetRoutePlanByID)
	routePlans.Put("/:id", routePlanController.UpdateRoutePlan)
	// Route untuk tracking lokasi driver
	routePlans.Post("/:id/location", driverLocationController.UpdateDriverLocation)
	routePlans.Get("/:id/location/latest", driverLocationController.GetLatestDriverLocation)
	routePlans.Get("/:id/location/history", driverLocationController.GetDriverLocationHistory)
	routePlans.Delete("/:id/location/history", driverLocationController.DeleteLocationHistory)
	routePlans.Put("/:id/status", routePlanController.UpdateRoutePlanStatus)
	routePlans.Delete("/:id", routePlanController.DeleteRoutePlan)
	routePlans.Get("/driver/:driverID", routePlanController.GetRoutePlansByDriverID)
	routePlans.Get("/avoidance/permanent", routePlanController.GetPermanentAvoidanceAreas)
	routePlans.Get("/avoidance/non-permanent", routePlanController.GetNonPermanentAvoidanceAreas)
	routePlans.Post("/:id/avoidance", routePlanController.AddAvoidanceArea)
	routePlans.Put("/avoidance/:id/status", routePlanController.UpdateAvoidanceAreaStatus)
	routePlans.Delete("/avoidance/:id", routePlanController.DeleteAvoidanceArea)
	routePlans.Put("/:id", routePlanController.UpdateRoutePlan)

	// Fuel Receipt routes
	fuelReceipts := api.Group("/fuel-receipts")
	fuelReceipts.Use(middleware.Protected())
	fuelReceipts.Post("/", fuelReceiptController.CreateFuelReceipt)
	fuelReceipts.Get("/", fuelReceiptController.GetAllFuelReceipts)
	fuelReceipts.Get("/my-receipts", fuelReceiptController.GetMyFuelReceipts)
	fuelReceipts.Get("/driver/:driver_id", fuelReceiptController.GetFuelReceiptsByDriverID)
	fuelReceipts.Get("/truck/:truck_id", fuelReceiptController.GetFuelReceiptsByTruckID)
	fuelReceipts.Get("/:id", fuelReceiptController.GetFuelReceiptByID)
	fuelReceipts.Put("/:id", fuelReceiptController.UpdateFuelReceipt)
	fuelReceipts.Delete("/:id", fuelReceiptController.DeleteFuelReceipt)

	// Upload
	uploads := api.Group("/uploads")
	uploads.Use(middleware.Protected())
	uploads.Post("/photo", uploadController.UploadPhoto)
	uploads.Post("/photo/base64", uploadController.UploadBase64Photo)

	// OCR routes
	ocr := api.Group("/ocr")
	ocr.Use(middleware.Protected())
	ocr.Post("/process", ocrController.ProcessOCR)

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
