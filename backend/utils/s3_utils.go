// package utils/s3_utils.go
package utils

import (
	"fmt"
	"net/url"
	"path/filepath"
	"regexp"
	"strings"
	"os"
)

// SanitizeFileName removes unsafe characters from filenames
func SanitizeFileName(fileName string) string {
	// Replace unsafe characters
	reg := regexp.MustCompile(`[^a-zA-Z0-9_.-]`)
	fileName = reg.ReplaceAllString(fileName, "_")
	
	// Limit filename length to a reasonable value
	if len(fileName) > 100 {
		ext := filepath.Ext(fileName)
		baseName := strings.TrimSuffix(fileName, ext)
		if len(baseName) > 95 {
			baseName = baseName[:95]
		}
		fileName = baseName + ext
	}
	
	return fileName
}

// ExtractObjectKeyFromURL extracts the object key from an S3 URL
func ExtractObjectKeyFromURL(fileURL string) (string, error) {
	parsedURL, err := url.Parse(fileURL)
	if err != nil {
		return "", fmt.Errorf("invalid URL format: %v", err)
	}
	
	// Handle different URL formats
	path := parsedURL.Path
	
	// Remove leading slash if it exists
	if strings.HasPrefix(path, "/") {
		path = path[1:]
	}
	
	// Handle URLs with bucket in path (e.g., custom endpoints)
	if strings.Contains(parsedURL.Host, ".s3.") {
		// Extract bucket from S3 URLs in format: bucket-name.s3.region.amazonaws.com/key
		parts := strings.Split(parsedURL.Host, ".")
		if len(parts) > 0 {
			bucketName := parts[0]
			// Check if path starts with bucketName
			if strings.HasPrefix(path, bucketName+"/") {
				path = path[len(bucketName)+1:]
			}
		}
	}
	
	// Handle paths that still might have bucket name as the first segment
	// This is common in custom S3 endpoints
	bucketName := os.Getenv("S3_BUCKET_NAME")
	if bucketName != "" && strings.HasPrefix(path, bucketName+"/") {
		path = path[len(bucketName)+1:]
	}
	
	if path == "" {
		return "", fmt.Errorf("could not extract object key from URL: %s", fileURL)
	}
	
	return path, nil
}