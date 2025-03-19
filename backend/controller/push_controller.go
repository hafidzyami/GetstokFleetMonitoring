package controller

import (
	"github.com/gofiber/fiber/v2"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/model"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/service"
)

type PushController struct {
	pushService service.PushService
}

func NewPushController(pushService service.PushService) *PushController {
	return &PushController{
		pushService: pushService,
	}
}

// GetVapidKey godoc
// @Summary Get VAPID public key
// @Description Get VAPID public key for push notification subscription
// @Tags push
// @Accept json
// @Produce json
// @Success 200 {object} model.BaseResponse "Success with public key"
// @Failure 500 {object} model.BaseResponse "Server error"
// @Router /push/vapid-key [get]
func (c *PushController) GetVapidKey(ctx *fiber.Ctx) error {
	publicKey := c.pushService.GetVAPIDPublicKey()

	return ctx.JSON(model.SuccessResponse(
		"push.getVapidKey",
		map[string]string{
			"publicKey": publicKey,
		},
	))
}

// Subscribe godoc
// @Summary Subscribe to push notifications
// @Description Register a new push notification subscription
// @Tags push
// @Accept json
// @Produce json
// @Param request body model.SubscriptionRequest true "Subscription info"
// @Success 200 {object} model.BaseResponse "Success response"
// @Failure 400 {object} model.BaseResponse "Bad request"
// @Failure 401 {object} model.BaseResponse "Unauthorized"
// @Failure 403 {object} model.BaseResponse "Forbidden - role not authorized"
// @Failure 500 {object} model.BaseResponse "Server error"
// @Router /push/subscribe [post]
func (c *PushController) Subscribe(ctx *fiber.Ctx) error {
	// Get user ID and role from context (set by auth middleware)
	userID := ctx.Locals("userId").(uint)
	role := ctx.Locals("role").(string)

	// Check if role is allowed
	// if role != "management" && role != "driver" {
	// 	return ctx.Status(fiber.StatusForbidden).JSON(model.SimpleErrorResponse(
	// 		fiber.StatusForbidden,
	// 		"Role not authorized for notifications",
	// 	))
	// }

	// Parse request
	var req model.SubscriptionRequest
	if err := ctx.BodyParser(&req); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			"Invalid request body",
		))
	}

	// Save subscription
	err := c.pushService.SaveSubscription(userID, req.Endpoint, req.P256dh, req.Auth, role)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(model.SimpleErrorResponse(
			fiber.StatusInternalServerError,
			"Failed to save subscription",
		))
	}

	return ctx.JSON(model.SuccessResponse(
		"push.subscribe",
		map[string]bool{"success": true},
	))
}

// Unsubscribe godoc
// @Summary Unsubscribe from push notifications
// @Description Remove a push notification subscription
// @Tags push
// @Accept json
// @Produce json
// @Param request body model.UnsubscribeRequest true "Unsubscribe request with endpoint"
// @Success 200 {object} model.BaseResponse "Success response"
// @Failure 400 {object} model.BaseResponse "Bad request"
// @Failure 401 {object} model.BaseResponse "Unauthorized"
// @Failure 500 {object} model.BaseResponse "Server error"
// @Router /push/unsubscribe [post]
func (c *PushController) Unsubscribe(ctx *fiber.Ctx) error {
	// Parse request
	var req model.UnsubscribeRequest
	if err := ctx.BodyParser(&req); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			"Invalid request body",
		))
	}

	// Delete subscription
	err := c.pushService.DeleteSubscription(req.Endpoint)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(model.SimpleErrorResponse(
			fiber.StatusInternalServerError,
			"Failed to delete subscription",
		))
	}

	return ctx.JSON(model.SuccessResponse(
		"push.unsubscribe",
		map[string]bool{"success": true},
	))
}

// Send godoc
// @Summary Send push notifications
// @Description Send notifications to specified roles and/or users
// @Tags push
// @Accept json
// @Produce json
// @Param request body model.NotificationRequest true "Notification request with title, message, optional URL, target roles, and target user IDs"
// @Success 200 {object} model.BaseResponse "Success response with count of sent notifications"
// @Failure 400 {object} model.BaseResponse "Bad request"
// @Failure 401 {object} model.BaseResponse "Unauthorized"
// @Failure 403 {object} model.BaseResponse "Forbidden - only management can send notifications"
// @Failure 500 {object} model.BaseResponse "Server error"
// @Router /push/send [post]
func (c *PushController) Send(ctx *fiber.Ctx) error {
	// Only management can send notifications
	// role := ctx.Locals("role").(string)
	// if role != "management" {
	// 	return ctx.Status(fiber.StatusForbidden).JSON(model.SimpleErrorResponse(
	// 		fiber.StatusForbidden,
	// 		"Only management can send notifications",
	// 	))
	// }

	// Parse request
	var req model.NotificationRequest
	if err := ctx.BodyParser(&req); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			"Invalid request body",
		))
	}

	// Validate request
	if req.Title == "" || req.Message == "" {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			"Title and message are required",
		))
	}

	// Validate target, minimal harus ada satu target
	if len(req.TargetRoles) == 0 && len(req.TargetUserIDs) == 0 {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			"At least one target (role or userID) must be specified",
		))
	}

	// Send notifications
	sentCount, err := c.pushService.SendNotification(req.Title, req.Message, req.URL, req.TargetRoles, req.TargetUserIDs)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(model.SimpleErrorResponse(
			fiber.StatusInternalServerError,
			"Failed to send notifications",
		))
	}

	return ctx.JSON(model.SuccessResponse(
		"push.send",
		map[string]interface{}{
			"success": true,
			"sent":    sentCount,
		},
	))
}

