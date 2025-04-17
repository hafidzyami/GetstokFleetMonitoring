package service

import (
	"bytes"
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/google/uuid"
)

type S3Service interface {
	UploadBase64Image(base64Data, folderPath string) (string, string, error)
	GeneratePresignedURL(objectKey string) (string, error)
	DeleteObject(objectKey string) error
}

type s3Service struct {
	client     *s3.Client
	bucketName string
	region     string
	endpoint   string
}

// NewS3Service creates a new S3Service instance
func NewS3Service() (S3Service, error) {
	// Get AWS credentials from environment variables
	accessKeyID := os.Getenv("AWS_ACCESS_KEY_ID")
	secretAccessKey := os.Getenv("AWS_SECRET_ACCESS_KEY")
	bucketName := os.Getenv("S3_BUCKET_NAME")
	region := os.Getenv("AWS_REGION")
	endpoint := os.Getenv("S3_ENDPOINT") // Optional, for using MinIO or other S3-compatible services

	if accessKeyID == "" || secretAccessKey == "" || bucketName == "" || region == "" {
		return nil, errors.New("missing required AWS credentials or configuration")
	}

	// Create AWS config
	cfg, err := config.LoadDefaultConfig(context.TODO(),
		config.WithRegion(region),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
			accessKeyID,
			secretAccessKey,
			"", // Session token, usually empty for regular access keys
		)),
	)

	if err != nil {
		return nil, fmt.Errorf("unable to load AWS config: %w", err)
	}

	// Create S3 client options
	options := s3.Options{
		Region:      region,
		Credentials: cfg.Credentials,
	}

	// If custom endpoint is specified (for MinIO, etc.)
	if endpoint != "" {
		options.EndpointResolver = s3.EndpointResolverFunc(
			func(region string, options s3.EndpointResolverOptions) (aws.Endpoint, error) {
				return aws.Endpoint{
					URL:               endpoint,
					HostnameImmutable: true,
					SigningRegion:     region,
				}, nil
			})
	}

	// Create S3 client
	client := s3.New(options)

	return &s3Service{
		client:     client,
		bucketName: bucketName,
		region:     region,
		endpoint:   endpoint,
	}, nil
}

// UploadBase64Image uploads a base64 encoded image to S3 and returns the object key and URL
func (s *s3Service) UploadBase64Image(base64Data, folderPath string) (string, string, error) {
	// Remove data:image prefix if present
	base64Data = removeBase64Prefix(base64Data)

	// Decode base64 data
	imageData, err := base64.StdEncoding.DecodeString(base64Data)
	if err != nil {
		return "", "", fmt.Errorf("error decoding base64 image: %w", err)
	}

	// Generate a unique filename using UUID
	filename := fmt.Sprintf("%s.jpg", uuid.New().String())

	// Create object key (path in bucket)
	objectKey := filename
	if folderPath != "" {
		objectKey = fmt.Sprintf("%s/%s", folderPath, filename)
	}

	// Determine content type (basic approach, can be improved)
	contentType := "image/jpeg" // Default to JPEG
	if strings.HasPrefix(base64Data, "iVBORw0KGgo") {
		contentType = "image/png"
	}

	// Upload to S3
	_, err = s.client.PutObject(context.TODO(), &s3.PutObjectInput{
		Bucket:      aws.String(s.bucketName),
		Key:         aws.String(objectKey),
		Body:        bytes.NewReader(imageData),
		ContentType: aws.String(contentType),
	})

	if err != nil {
		return "", "", fmt.Errorf("error uploading to S3: %w", err)
	}

	// Generate URL
	url, err := s.GeneratePresignedURL(objectKey)
	if err != nil {
		return objectKey, "", err
	}

	return objectKey, url, nil
}

// GeneratePresignedURL generates a presigned URL for an object
func (s *s3Service) GeneratePresignedURL(objectKey string) (string, error) {
	presignClient := s3.NewPresignClient(s.client)

	presignedURL, err := presignClient.PresignGetObject(context.TODO(), &s3.GetObjectInput{
		Bucket: aws.String(s.bucketName),
		Key:    aws.String(objectKey),
	}, func(opts *s3.PresignOptions) {
		opts.Expires = time.Hour * 24 // URL expires in 24 hours
	})

	if err != nil {
		return "", fmt.Errorf("error generating presigned URL: %w", err)
	}

	return presignedURL.URL, nil
}

// GetPublicURL generates a direct URL for public objects
func (s *s3Service) GetPublicURL(objectKey string) string {
	// If using custom endpoint (like MinIO)
	if s.endpoint != "" {
		return fmt.Sprintf("%s/%s/%s", s.endpoint, s.bucketName, objectKey)
	}
	
	// Standard AWS S3 URL format
	return fmt.Sprintf("https://%s.s3.%s.amazonaws.com/%s", s.bucketName, s.region, objectKey)
}

// DeleteObject deletes an object from S3
func (s *s3Service) DeleteObject(objectKey string) error {
	_, err := s.client.DeleteObject(context.TODO(), &s3.DeleteObjectInput{
		Bucket: aws.String(s.bucketName),
		Key:    aws.String(objectKey),
	})

	if err != nil {
		return fmt.Errorf("error deleting object from S3: %w", err)
	}

	return nil
}

// removeBase64Prefix removes the data URL prefix from base64 string
func removeBase64Prefix(base64String string) string {
	// Find the position of the comma that separates the prefix from the actual data
	commaIndex := strings.Index(base64String, ",")
	if commaIndex != -1 {
		return base64String[commaIndex+1:]
	}
	return base64String
}