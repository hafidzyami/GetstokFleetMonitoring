package controller

import (
	"github.com/gofiber/fiber/v2"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/collectors"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/valyala/fasthttp/fasthttpadaptor"
)

// Gunakan registry khusus untuk middleware kita
var registry = prometheus.NewRegistry()

// MetricsController handles Prometheus metrics
type MetricsController struct{}

// NewMetricsController creates a new MetricsController
func NewMetricsController() *MetricsController {
	// Register default Go metrics using the new collectors package
	registry.MustRegister(collectors.NewGoCollector())
	registry.MustRegister(collectors.NewProcessCollector(collectors.ProcessCollectorOpts{}))
	
	return &MetricsController{}
}

// GetMetrics godoc
// @Summary Get Prometheus metrics
// @Description Retrieve Prometheus metrics for monitoring
// @Tags metrics
// @Produce text/plain
// @Success 200 {string} string "Prometheus metrics"
// @Router /metrics [get]
func (c *MetricsController) GetMetrics(ctx *fiber.Ctx) error {
	// Set Content-Type header
	ctx.Set("Content-Type", "text/plain; charset=utf-8")
	
	// Create an adapter for the Prometheus handler with our custom registry
	handler := fasthttpadaptor.NewFastHTTPHandler(
		promhttp.HandlerFor(registry, promhttp.HandlerOpts{}),
	)
	
	// Use the adapter with the Fiber context
	handler(ctx.Context())
	
	return nil
}

// GetRegistry returns the Prometheus registry
func GetRegistry() *prometheus.Registry {
	return registry
}