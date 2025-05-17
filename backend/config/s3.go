// package config/s3.go
package config

import (
	"context"
	"log"
	"os"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

var S3Client *s3.Client

// InitS3Client initializes the S3 client
func InitS3Client() {
	// Get S3 credentials from environment variables
	accessKey := os.Getenv("AWS_ACCESS_KEY_ID")
	secretKey := os.Getenv("AWS_SECRET_ACCESS_KEY")
	region := os.Getenv("AWS_REGION")
	endpoint := os.Getenv("S3_ENDPOINT") // For custom S3-compatible services like MinIO

	if accessKey == "" || secretKey == "" {
		log.Println("Warning: S3 credentials not found in environment variables")
		return
	}

	// Default to us-east-1 if not provided
	if region == "" {
		region = "us-east-1"
	}

	// Create credential provider
	credProvider := credentials.NewStaticCredentialsProvider(accessKey, secretKey, "")

	// Configure AWS SDK
	cfg, err := config.LoadDefaultConfig(context.TODO(),
		config.WithRegion(region),
		config.WithCredentialsProvider(credProvider),
	)
	if err != nil {
		log.Printf("Error loading AWS config: %v", err)
		return
	}

	// Create S3 client with options
	options := s3.Options{
		Region:      region,
		Credentials: credProvider,
	}

	// If using a custom endpoint (e.g., MinIO)
	if endpoint != "" {
		options.BaseEndpoint = aws.String(endpoint)
	}

	// Create the S3 client
	S3Client = s3.NewFromConfig(cfg, func(o *s3.Options) {
		*o = options
	})

	log.Println("S3 client initialized successfully")
}