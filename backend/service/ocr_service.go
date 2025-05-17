// service/ocr_service.go
package service

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math"
	"mime/multipart"
	"net/http"
	"os"
	"strconv"
	"strings"

	"github.com/hafidzyami/GetstokFleetMonitoring/backend/model"
)

type OCRService interface {
	ProcessImage(request model.OCRRequest) (*model.OCRResponse, error)
}

type ocrService struct {}

func NewOCRService() OCRService {
	return &ocrService{}
}

func (s *ocrService) ProcessImage(request model.OCRRequest) (*model.OCRResponse, error) {
	// Get API key from environment variable
	apiKey := os.Getenv("OCR_API_KEY")
	if apiKey == "" {
		// Gunakan API key default jika tidak diatur di environment
		// Anda bisa mendapatkan free API key dari OCR.space
		apiKey = "K81842182488957" // Ganti dengan API key Anda
	}

	// OCR.space API URL
	url := "https://api.ocr.space/parse/image"

	// Prepare form data
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	// Add base64Image field dengan format yang benar
	// Pastikan format base64 sesuai dengan yang diharapkan: data:image/jpeg;base64,DATA
	base64Data := request.ImageBase64
	// Cek apakah base64 sudah memiliki prefix format yang benar
	if !strings.HasPrefix(base64Data, "data:image/") && !strings.HasPrefix(base64Data, "data:application/") {
		// Tambahkan prefix jika belum ada
		base64Data = "data:image/jpeg;base64," + base64Data
	}

	if err := writer.WriteField("base64Image", base64Data); err != nil {
		return nil, fmt.Errorf("error writing base64Image: %v", err)
	}

	// Set language - gunakan auto detection dengan Engine 2
	if err := writer.WriteField("language", "auto"); err != nil {
		return nil, fmt.Errorf("error writing language: %v", err)
	}

	// OCR Engine - use engine 2 for better results with receipts
	if err := writer.WriteField("OCREngine", "2"); err != nil {
		return nil, fmt.Errorf("error writing OCREngine: %v", err)
	}

	// Tambahkan parameter filetype untuk membantu API mendeteksi format file
	if err := writer.WriteField("filetype", "JPG"); err != nil {
		return nil, fmt.Errorf("error writing filetype: %v", err)
	}

	// Enable overlay to get word positions
	if err := writer.WriteField("isOverlayRequired", "true"); err != nil {
		return nil, fmt.Errorf("error writing isOverlayRequired: %v", err)
	}

	// Enable table detection (good for receipts)
	if err := writer.WriteField("isTable", "true"); err != nil {
		return nil, fmt.Errorf("error writing isTable: %v", err)
	}

	// Enable scale (can improve results for low-res images)
	if err := writer.WriteField("scale", "true"); err != nil {
		return nil, fmt.Errorf("error writing scale: %v", err)
	}

	// Close multipart writer
	if err := writer.Close(); err != nil {
		return nil, fmt.Errorf("error closing writer: %v", err)
	}

	// Create request
	req, err := http.NewRequest("POST", url, body)
	if err != nil {
		return nil, fmt.Errorf("error creating request: %v", err)
	}

	// Set headers
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.Header.Set("apikey", apiKey)

	// Send the request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error sending request: %v", err)
	}
	defer resp.Body.Close()

	// Read the response
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("error reading response: %v", err)
	}

	// Log response for debugging
	fmt.Printf("OCR.space API Response: %s\n", string(respBody))

	// Parse the response
	var ocrResponse map[string]interface{}
	err = json.Unmarshal(respBody, &ocrResponse)
	if err != nil {
		return nil, fmt.Errorf("error parsing response: %v", err)
	}

	// Check for errors in the response
	if isErrored, ok := ocrResponse["IsErroredOnProcessing"].(bool); ok && isErrored {
		errMsg := "OCR processing failed"
		if msg, ok := ocrResponse["ErrorMessage"].(string); ok && msg != "" {
			errMsg = msg
		}
		return nil, errors.New(errMsg)
	}

	// Extract raw text from response
	var parsedText string
	if parsedResults, ok := ocrResponse["ParsedResults"].([]interface{}); ok && len(parsedResults) > 0 {
		if firstResult, ok := parsedResults[0].(map[string]interface{}); ok {
			if text, ok := firstResult["ParsedText"].(string); ok {
				parsedText = text
			}
		}
	}

	if parsedText == "" {
		return nil, errors.New("no text was recognized in the image")
	}

	// Process raw text to extract structured data
	extractedData, err := extractFromText(parsedText)
	if err != nil {
		return nil, fmt.Errorf("error extracting data: %v", err)
	}

	// Return OCR results
	return &model.OCRResponse{
		ExtractedData: extractedData,
		RawText:       parsedText,
	}, nil
}

// extractFromText attempts to extract structured data from OCR text
func extractFromText(text string) (model.OCRExtractedData, error) {
	data := model.OCRExtractedData{}
	
	// Split text into lines for processing
	lines := strings.Split(text, "\n")
	
	// Log raw text for debugging
	fmt.Printf("Raw OCR text:\n%s\n", text)
	
	// Pertama, kumpulkan semua nilai numerik untuk analisis urutan
	var numericValues []string
	for _, line := range lines {
		num := extractNumeric(line)
		if num != "" {
			numericValues = append(numericValues, num)
		}
	}
	
	var hargaSet, volumeSet, totalSet bool
	
	for _, line := range lines {
		lowerLine := strings.ToLower(line)
		fmt.Printf("Processing line: %s\n", line)
		
		// Extract date/time - more patterns
		if strings.Contains(lowerLine, "waktu") || strings.Contains(lowerLine, "tanggal") || 
		   strings.Contains(lowerLine, "date") || strings.Contains(lowerLine, "time") {
			parts := strings.SplitN(line, ":", 2)
			if len(parts) == 2 {
				data.Waktu = strings.TrimSpace(parts[1])
			}
		}
		
		// Extract product name - more patterns
		if strings.Contains(lowerLine, "produk") || strings.Contains(lowerLine, "product") ||
		   strings.Contains(lowerLine, "jenis") || strings.Contains(lowerLine, "type") ||
		   strings.Contains(lowerLine, "bbm") {
			parts := strings.SplitN(line, ":", 2)
			if len(parts) == 2 {
				data.NamaProduk = strings.TrimSpace(parts[1])
			} else if len(parts) == 1 {
				// Coba cari produk BBM di dalam baris
				fuelTypes := []string{"PERTAMAX", "PERTALITE", "SOLAR", "DEX", "DEXLITE", "PREMIUM"}
				for _, fuel := range fuelTypes {
					if strings.Contains(strings.ToUpper(line), fuel) {
						data.NamaProduk = fuel
						break
					}
				}
			}
		}
		
		// Extract price per liter - more patterns with exact matches
		if (strings.Contains(lowerLine, "harga") && strings.Contains(lowerLine, "liter")) ||
		   (strings.Contains(lowerLine, "price") && strings.Contains(lowerLine, "liter")) ||
		   strings.Contains(lowerLine, "/liter") || strings.Contains(lowerLine, "/l") {
			parts := strings.SplitN(line, ":", 2)
			if len(parts) == 2 {
				data.HargaPerLiter = extractNumeric(parts[1])
				hargaSet = true
			} else {
				// Ekstrak angka dari baris tersebut jika tidak ada pemisah ':'
				numeric := extractNumeric(line)
				if numeric != "" && !hargaSet {
					data.HargaPerLiter = numeric
					hargaSet = true
				}
			}
		}
		
		// Extract volume - more precise patterns
		if strings.Contains(lowerLine, "volume") {
			parts := strings.SplitN(line, ":", 2)
			if len(parts) == 2 {
				data.Volume = extractNumeric(parts[1])
				volumeSet = true
			} else if len(parts) == 1 && strings.Contains(lowerLine, "volume") && strings.Contains(lowerLine, "l") {
				// Format "Volume (L) 2.801"
				wordsInLine := strings.Fields(line)
				for i, word := range wordsInLine {
					if i > 0 && (strings.Contains(strings.ToLower(wordsInLine[i-1]), "volume") || 
					   strings.Contains(strings.ToLower(word), "l")) {
						num := extractNumeric(word)
						if num != "" {
							data.Volume = num
							volumeSet = true
							break
						}
					}
				}
				// Jika masih tidak ada, coba cari angka saja
				if !volumeSet {
					for _, word := range wordsInLine {
						num := extractNumeric(word)
						if num != "" {
							data.Volume = num
							volumeSet = true
							break
						}
					}
				}
			}
		}
		
		// Extract total price - more patterns
		if (strings.Contains(lowerLine, "total") && strings.Contains(lowerLine, "harga")) ||
		   (strings.Contains(lowerLine, "total") && strings.Contains(lowerLine, "price")) ||
		   strings.Contains(lowerLine, "jumlah bayar") || strings.Contains(lowerLine, "payment") {
			parts := strings.SplitN(line, ":", 2)
			if len(parts) == 2 {
				data.TotalHarga = extractNumeric(parts[1])
				totalSet = true
			} else {
				// Ekstrak angka dari baris tersebut
				numeric := extractNumeric(line)
				if numeric != "" && !totalSet {
					data.TotalHarga = numeric
					totalSet = true
				}
			}
		}
	}
	
	// Coba deteksi jumlah dan tanggal dengan pengecekan lebih spesifik
	for _, line := range lines {
		// Khusus untuk format tanggal/waktu yang umum di kuitansi SPBU
		if strings.Contains(line, "/") && (strings.Contains(strings.ToLower(line), "wak") || strings.Contains(strings.ToLower(line), "date")) {
			// Format seperti "Wak tu: 31/03/2025 09:19:45"
			parts := strings.SplitN(line, ":", 2)
			if len(parts) == 2 {
				data.Waktu = strings.TrimSpace(parts[1])
			}
		}
		
		// Khusus untuk "Volume (L) 2.801" tanpa ":" 
		if strings.Contains(strings.ToLower(line), "volume") && strings.Contains(strings.ToLower(line), "l") {
			// Cari angka di baris ini
			words := strings.Fields(line)
			for _, word := range words {
				if num := extractNumeric(word); num != "" && !volumeSet {
					// Cek apakah masuk akal sebagai volume (biasanya <100)
					if numVal, err := strconv.ParseFloat(strings.ReplaceAll(num, ",", "."), 64); err == nil {
						if numVal > 0 && numVal < 100 {
							data.Volume = num
							volumeSet = true
							break
						}
					}
				}
			}
		}
	}
	
	// Detect fuel type if not found by label
	if data.NamaProduk == "" {
		upperText := strings.ToUpper(text)
		fuelTypes := []string{"PERTAMAX", "PERTALITE", "SOLAR", "DEX", "DEXLITE", "PREMIUM", "TURBO", "PERTAMINA"}
		for _, fuel := range fuelTypes {
			if strings.Contains(upperText, fuel) {
				data.NamaProduk = fuel
				break
			}
		}
	}
	
	// Untuk kasus khusus, coba gunakan analisis hubungan
	// Pada SPBU, biasanya format: Harga/Liter, Volume, Total
	// Dan biasanya Total = Harga/Liter * Volume
	if len(numericValues) >= 3 {
		// Coba cari pola ini di semua nilai
		for i := 0; i < len(numericValues)-2; i++ {
			// Bersihkan nilai (ganti , dengan .)
			val1Str := strings.ReplaceAll(numericValues[i], ",", ".")
			val2Str := strings.ReplaceAll(numericValues[i+1], ",", ".")
			val3Str := strings.ReplaceAll(numericValues[i+2], ",", ".")
			
			val1, err1 := strconv.ParseFloat(val1Str, 64)
			val2, err2 := strconv.ParseFloat(val2Str, 64)
			val3, err3 := strconv.ParseFloat(val3Str, 64)
			
			if err1 == nil && err2 == nil && err3 == nil {
				// Buat lebih toleran dengan selisih 5%
				expectedTotal := val1 * val2
				diff := math.Abs(expectedTotal - val3) / val3
				
				if diff < 0.05 { // 5% perbedaan
					// Kemungkinan ini adalah harga per liter, volume, dan total
					if !hargaSet {
						data.HargaPerLiter = numericValues[i]
					}
					if !volumeSet {
						data.Volume = numericValues[i+1]
					}
					if !totalSet {
						data.TotalHarga = numericValues[i+2]
					}
					break
				}
			}
		}
	}
	
	// Fallback ke PERTAMINA jika tidak ada jenis BBM spesifik
	if data.NamaProduk == "" && strings.Contains(strings.ToUpper(text), "PERTAMINA") {
		data.NamaProduk = "PERTAMINA"
	}
	
	// Log extracted data for debugging
	fmt.Printf("Extracted data: %+v\n", data)
	
	return data, nil
}

// extractNumeric extracts only numeric characters, dots and commas from a string
// and normalizes the format (removes leading dots, replaces commas with periods for decimals)
func extractNumeric(input string) string {
	input = strings.TrimSpace(input)
	var result strings.Builder
	
	// Flag to track if we've seen any numeric character
	seenNumeric := false
	
	for i, char := range input {
		if (char >= '0' && char <= '9') {
			result.WriteRune(char)
			seenNumeric = true
		} else if (char == '.' || char == ',') {
			// If it's the first character and a dot, skip it
			if i == 0 && char == '.' {
				continue
			}
			
			// Only add dot/comma if we've seen numeric characters
			if seenNumeric {
				// Standardize to dot for decimal point
				result.WriteRune('.')
			}
		}
	}
	
	resultStr := result.String()
	
	// Ensure we only have one decimal point (period)
	parts := strings.Split(resultStr, ".")
	if len(parts) > 2 {
		resultStr = parts[0] + "." + strings.Join(parts[1:], "")
	}
	
	return resultStr
}