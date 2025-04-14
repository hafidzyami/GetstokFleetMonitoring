package service

import (
	"bytes"
	"errors"
	"io/ioutil"
	"net/http"
	"os"
)

type RoutingService interface {
	GetDirections(requestBody []byte) ([]byte, error)
}

type routingService struct{}

func NewRoutingService() RoutingService {
	return &routingService{}
}

// GetDirections mengambil rute dari OpenRouteService API
func (s *routingService) GetDirections(requestBody []byte) ([]byte, error) {
	// Dapatkan API key dari env
	apiKey := os.Getenv("ORS_API_KEY")
	if apiKey == "" {
		return nil, errors.New("API key tidak dikonfigurasi")
	}

	// Buat HTTP client
	client := &http.Client{}
	
	// Buat request
	req, err := http.NewRequest(
		"POST",
		"https://api.openrouteservice.org/v2/directions/driving-hgv/json",
		bytes.NewReader(requestBody),
	)
	if err != nil {
		return nil, errors.New("Gagal membuat request: " + err.Error())
	}

	// Set headers
	req.Header.Set("Authorization", apiKey)
	req.Header.Set("Content-Type", "application/json")

	// Kirim request
	resp, err := client.Do(req)
	if err != nil {
		return nil, errors.New("Gagal mengirim request: " + err.Error())
	}
	defer resp.Body.Close()

	// Baca response body
	responseBody, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, errors.New("Gagal membaca response: " + err.Error())
	}

	// Periksa status code
	if resp.StatusCode != http.StatusOK {
		return responseBody, errors.New("OpenRouteService API returned error")
	}

	return responseBody, nil
}