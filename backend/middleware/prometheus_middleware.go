package middleware

import (
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/controller"
	"github.com/prometheus/client_golang/prometheus"
)

var (
	httpRequestsTotal  *prometheus.CounterVec
	httpRequestDuration *prometheus.HistogramVec
	httpRequestsInFlight prometheus.Gauge
	metricsInitialized bool
)

// initMetrics initializes the metrics
func initMetrics() {
	if metricsInitialized {
		return
	}
	
	registry := controller.GetRegistry()
	
	httpRequestsTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "http_requests_total",
			Help: "Total number of HTTP requests",
		},
		[]string{"status", "method", "path"},
	)
	registry.MustRegister(httpRequestsTotal)

	httpRequestDuration = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_request_duration_seconds",
			Help:    "Duration of HTTP requests in seconds",
			Buckets: []float64{0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10},
		},
		[]string{"status", "method", "path"},
	)
	registry.MustRegister(httpRequestDuration)

	httpRequestsInFlight = prometheus.NewGauge(
		prometheus.GaugeOpts{
			Name: "http_requests_in_flight",
			Help: "Current number of HTTP requests in flight",
		},
	)
	registry.MustRegister(httpRequestsInFlight)
	
	metricsInitialized = true
}

// PrometheusMiddleware returns a middleware that collects Prometheus metrics
func PrometheusMiddleware() fiber.Handler {
	// Initialize metrics
	initMetrics()
	
	return func(c *fiber.Ctx) error {
		start := time.Now()
		
		// Increment in-flight requests
		httpRequestsInFlight.Inc()
		
		// Next middlewares
		err := c.Next()
		
		// Decrement in-flight requests
		httpRequestsInFlight.Dec()
		
		// Get path - use route path if available, otherwise use request path
		var path string
		if c.Route() != nil && c.Route().Path != "" {
			path = c.Route().Path
		} else {
			path = c.Path()
		}
		
		// Record metrics after response
		status := strconv.Itoa(c.Response().StatusCode())
		method := c.Method()
		
		// Observe request duration
		duration := time.Since(start).Seconds()
		httpRequestDuration.WithLabelValues(status, method, path).Observe(duration)
		
		// Count total requests
		httpRequestsTotal.WithLabelValues(status, method, path).Inc()
		
		return err
	}
}
