// package model/file.go
package model

// DeleteFileRequest is a request to delete a file
type DeleteFileRequest struct {
	FileURL string `json:"file_url" validate:"required"`
}

// FileUploadResponse is the response for a file upload
type FileUploadResponse struct {
	FileURL  string `json:"file_url"`
	Filename string `json:"filename"`
	Size     string `json:"size"`
}