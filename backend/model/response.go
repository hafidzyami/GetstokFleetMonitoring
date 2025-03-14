package model

// BaseResponse adalah struktur dasar untuk semua respons API
// Mengikuti Google JSON Style Guide: https://google.github.io/styleguide/jsoncstyleguide.xml
type BaseResponse struct {
	APIVersion string      `json:"apiVersion"`
	Context    string      `json:"context,omitempty"`
	ID         string      `json:"id,omitempty"`
	Method     string      `json:"method,omitempty"`
	Params     interface{} `json:"params,omitempty"`
	Data       interface{} `json:"data,omitempty"`
	Error      *ErrorData  `json:"error,omitempty"`
}

// ErrorData merepresentasikan struktur error sesuai Google JSON Style Guide
type ErrorData struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Errors  []ErrorInfo `json:"errors,omitempty"`
}

// ErrorInfo merepresentasikan informasi detail error
type ErrorInfo struct {
	Domain       string `json:"domain,omitempty"`
	Reason       string `json:"reason,omitempty"`
	Message      string `json:"message,omitempty"`
	Location     string `json:"location,omitempty"`
	LocationType string `json:"locationType,omitempty"`
	ExtendedHelp string `json:"extendedHelp,omitempty"`
	SendReport   string `json:"sendReport,omitempty"`
}

// SuccessResponse membuat respons sukses dengan data
func SuccessResponse(method string, data interface{}) BaseResponse {
	return BaseResponse{
		APIVersion: "1.0",
		Method:     method,
		Data:       data,
	}
}

// ErrorResponse membuat respons error
func ErrorResponse(code int, message string, errors []ErrorInfo) BaseResponse {
	return BaseResponse{
		APIVersion: "1.0",
		Error: &ErrorData{
			Code:    code,
			Message: message,
			Errors:  errors,
		},
	}
}

// SimpleErrorResponse membuat respons error sederhana dengan pesan tunggal
func SimpleErrorResponse(code int, message string) BaseResponse {
	return BaseResponse{
		APIVersion: "1.0",
		Error: &ErrorData{
			Code:    code,
			Message: message,
		},
	}
}