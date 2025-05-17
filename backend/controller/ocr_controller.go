package controller

import (
	"github.com/gofiber/fiber/v2"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/model"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/service"
	"strings"
)

type OCRController struct {
	ocrService service.OCRService
}

func NewOCRController(ocrService service.OCRService) *OCRController {
	return &OCRController{
		ocrService: ocrService,
	}
}

// ProcessOCR godoc
// @Summary Process image with OCR
// @Description Process an uploaded image with OCR to extract receipt data
// @Tags ocr
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token" default(Bearer <token>)
// @Param request body model.OCRRequest true "OCR request with base64 encoded image"
// @Success 200 {object} model.BaseResponse "Successfully processed image"
// @Failure 400 {object} model.BaseResponse "Bad request"
// @Failure 500 {object} model.BaseResponse "Internal server error"
// @Router /ocr/process [post]
func (c *OCRController) ProcessOCR(ctx *fiber.Ctx) error {
	// Parse request body
	var req model.OCRRequest
	if err := ctx.BodyParser(&req); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			"Invalid request body",
		))
	}

	// Validate request
	if req.ImageBase64 == "" {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			"Image data is required",
		))
	}

	// Sanitize request data
	// Remove any data URL prefix if present
	if strings.HasPrefix(req.ImageBase64, "data:image/") || strings.HasPrefix(req.ImageBase64, "data:application/") {
		parts := strings.Split(req.ImageBase64, ",")
		if len(parts) > 1 {
			req.ImageBase64 = parts[1]
		}
	}

	// Ensure language is set properly
	if req.Lang == "" {
		req.Lang = "auto" // Set to auto-detect as default
	}

	// Process image with OCR
	response, err := c.ocrService.ProcessImage(req)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(model.SimpleErrorResponse(
			fiber.StatusInternalServerError,
			err.Error(),
		))
	}

	// Return response
	return ctx.Status(fiber.StatusOK).JSON(model.SuccessResponse(
		"ocr.process",
		response,
	))
}
