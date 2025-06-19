package middleware

import (
	"strconv"
	"sync"
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
	metricsMutex       sync.Mutex
)

// initMetrics initializes the metrics
func initMetrics() {
	// Use mutex to ensure thread-safe initialization
	metricsMutex.Lock()
	defer metricsMutex.Unlock()
	
	if metricsInitialized {
		return
	}
	
	registry := controller.GetRegistry()
	
	// First, try to unregister existing metrics if they exist
	if httpRequestsTotal != nil {
		registry.Unregister(httpRequestsTotal)
	}
	if httpRequestDuration != nil {
		registry.Unregister(httpRequestDuration)
	}
	if httpRequestsInFlight != nil {
		registry.Unregister(httpRequestsInFlight)
	}
	
	// Create metrics with consistent label order: method, path, status
	httpRequestsTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "http_requests_total",
			Help: "Total number of HTTP requests",
		},
		[]string{"method", "path", "status"},
	)
	
	httpRequestDuration = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_request_duration_seconds",
			Help:    "Duration of HTTP requests in seconds",
			Buckets: []float64{0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10},
		},
		[]string{"method", "path", "status"},
	)
	
	httpRequestsInFlight = prometheus.NewGauge(
		prometheus.GaugeOpts{
			Name: "http_requests_in_flight",
			Help: "Current number of HTTP requests in flight",
		},
	)
	
	// Register metrics, handling potential re-registration errors
	if err := registry.Register(httpRequestsTotal); err != nil {
		// If already registered, get the existing collector
		if are, ok := err.(prometheus.AlreadyRegisteredError); ok {
			httpRequestsTotal = are.ExistingCollector.(*prometheus.CounterVec)
		}
	}
	
	if err := registry.Register(httpRequestDuration); err != nil {
		if are, ok := err.(prometheus.AlreadyRegisteredError); ok {
			httpRequestDuration = are.ExistingCollector.(*prometheus.HistogramVec)
		}
	}
	
	if err := registry.Register(httpRequestsInFlight); err != nil {
		if are, ok := err.(prometheus.AlreadyRegisteredError); ok {
			httpRequestsInFlight = are.ExistingCollector.(prometheus.Gauge)
		}
	}
	
	metricsInitialized = true
}

// CleanupMetrics unregisters all metrics and resets initialization
func CleanupMetrics() {
	metricsMutex.Lock()
	defer metricsMutex.Unlock()
	
	if !metricsInitialized {
		return
	}
	
	registry := controller.GetRegistry()
	
	// Unregister all metrics
	if httpRequestsTotal != nil {
		registry.Unregister(httpRequestsTotal)
		httpRequestsTotal = nil
	}
	if httpRequestDuration != nil {
		registry.Unregister(httpRequestDuration)
		httpRequestDuration = nil
	}
	if httpRequestsInFlight != nil {
		registry.Unregister(httpRequestsInFlight)
		httpRequestsInFlight = nil
	}
	
	metricsInitialized = false
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
		
		// Normalize method to prevent duplicates (e.g., "GETT" -> "GET")
		if len(method) > 0 {
			switch method {
			case "GETT":
				method = "GET"
			case "POSTT":
				method = "POST"
			case "PUTT":
				method = "PUT"
			case "DELETEE":
				method = "DELETE"
			case "PATCHH":
				method = "PATCH"
			}
		}
		
		// Observe request duration with consistent label order: method, path, status
		duration := time.Since(start).Seconds()
		httpRequestDuration.WithLabelValues(method, path, status).Observe(duration)
		
		// Count total requests with consistent label order: method, path, status
		httpRequestsTotal.WithLabelValues(method, path, status).Inc()
		
		return err
	}
}
