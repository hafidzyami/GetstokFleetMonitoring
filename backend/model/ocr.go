package model

// OCRRequest represents the request payload for OCR processing
type OCRRequest struct {
	ImageBase64 string `json:"image_base64" validate:"required"`
	Lang        string `json:"lang"` // Optional language, default is "ind" (Indonesian)
}

// OCRExtractedData represents the extracted data from the fuel receipt
type OCRExtractedData struct {
	Waktu         string `json:"waktu"`
	NamaProduk    string `json:"nama_produk"`
	HargaPerLiter string `json:"harga_per_liter"`
	Volume        string `json:"volume"`
	TotalHarga    string `json:"total_harga"`
}

// OCRResponse represents the response payload for OCR processing
type OCRResponse struct {
	ExtractedData OCRExtractedData `json:"extracted_data"`
	RawText       string           `json:"raw_text"`
}
