package controller

import (
	"encoding/base64"
	"io"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/model"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/service"
)

type UploadController struct {
	s3Service service.S3Service
}

func NewUploadController(s3Service service.S3Service) *UploadController {
	return &UploadController{
		s3Service: s3Service,
	}
}

// UploadPhoto godoc
// @Summary Upload a photo to S3
// @Description Upload a photo and get back the S3 URL
// @Tags uploads
// @Accept multipart/form-data
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token" default(Bearer <token>)
// @Param photo formData file true "Photo file to upload"
// @Success 200 {object} model.BaseResponse "Successfully uploaded photo"
// @Failure 400 {object} model.BaseResponse "Bad request"
// @Failure 401 {object} model.BaseResponse "Unauthorized"
// @Router /uploads/photo [post]
func (c *UploadController) UploadPhoto(ctx *fiber.Ctx) error {
	// Get file from form
	file, err := ctx.FormFile("photo")
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			"Photo file is required",
		))
	}

	// Open file
	fileHandle, err := file.Open()
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(model.SimpleErrorResponse(
			fiber.StatusInternalServerError,
			"Failed to open uploaded file",
		))
	}
	defer fileHandle.Close()

	// Read file content
	fileBytes, err := io.ReadAll(fileHandle)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(model.SimpleErrorResponse(
			fiber.StatusInternalServerError,
			"Failed to read file content",
		))
	}

	// Convert to base64
	base64Data := base64.StdEncoding.EncodeToString(fileBytes)

	// Upload to S3
	objectKey, photoURL, err := c.s3Service.UploadBase64Image(base64Data, "avoidance-areas")
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(model.SimpleErrorResponse(
			fiber.StatusInternalServerError,
			"Failed to upload to S3: "+err.Error(),
		))
	}

	// Return response with URL and key
	return ctx.Status(fiber.StatusOK).JSON(model.SuccessResponse(
		"uploads.photo",
		fiber.Map{
			"url": photoURL,
			"key": objectKey,
		},
	))
}

// UploadBase64Photo godoc
// @Summary Upload a base64 encoded photo to S3
// @Description Upload a base64 encoded photo and get back the S3 URL
// @Tags uploads
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token" default(Bearer <token>)
// @Param request body map[string]string true "Photo data"
// @Success 200 {object} model.BaseResponse "Successfully uploaded photo"
// @Failure 400 {object} model.BaseResponse "Bad request"
// @Failure 401 {object} model.BaseResponse "Unauthorized"
// @Router /uploads/photo/base64 [post]
func (c *UploadController) UploadBase64Photo(ctx *fiber.Ctx) error {
	// Parse request body
	var req map[string]string
	if err := ctx.BodyParser(&req); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			"Invalid request body",
		))
	}

	// Get photo data
	photoData, ok := req["photo"]
	if !ok || photoData == "" {
		return ctx.Status(fiber.StatusBadRequest).JSON(model.SimpleErrorResponse(
			fiber.StatusBadRequest,
			"Photo data is required",
		))
	}

	// Remove data:image prefix if present
	if strings.Contains(photoData, ",") {
		parts := strings.SplitN(photoData, ",", 2)
		if len(parts) == 2 {
			photoData = parts[1]
		}
	}

	// Upload to S3
	objectKey, photoURL, err := c.s3Service.UploadBase64Image(photoData, "avoidance-areas")
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(model.SimpleErrorResponse(
			fiber.StatusInternalServerError,
			"Failed to upload to S3: "+err.Error(),
		))
	}

	// Return response with URL and key
	return ctx.Status(fiber.StatusOK).JSON(model.SuccessResponse(
		"uploads.photoBase64",
		fiber.Map{
			"url": photoURL,
			"key": objectKey,
		},
	))
}