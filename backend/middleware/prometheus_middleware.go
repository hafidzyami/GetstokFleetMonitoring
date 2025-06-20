package middleware

import (
	"bytes"
	"strconv"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/hafidzyami/GetstokFleetMonitoring/backend/controller"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/common/expfmt"
)

var (
	httpRequestsTotal   *prometheus.CounterVec
	httpRequestDuration *prometheus.HistogramVec
	httpRequestsInFlight prometheus.Gauge
	metricsInitialized  bool
	metricsMutex        sync.Mutex
	registry            *prometheus.Registry
)

// getOrCreateRegistry ensures we always use the same registry instance
func getOrCreateRegistry() *prometheus.Registry {
	if registry == nil {
		registry = controller.GetRegistry()
	}
	return registry
}

// normalizeMethod properly normalizes HTTP methods
func normalizeMethod(method string) string {
	// Handle common corrupted methods and normalize to uppercase
	switch method {
	case "GET", "GETT", "GE", "G":
		return "GET"
	case "POST", "POSTT", "POS", "P":
		return "POST"
	case "PUT", "PUTT", "PU":
		return "PUT"
	case "DELETE", "DELETEE", "DEL", "D":
		return "DELETE"
	case "PATCH", "PATCHH", "PAT":
		return "PATCH"
	case "HEAD", "HEADD", "HE":
		return "HEAD"
	case "OPTIONS", "OPTIONSS", "OPT":
		return "OPTIONS"
	default:
		// For any unrecognized method, return GET as fallback
		if len(method) == 0 {
			return "GET"
		}
		// Clean up the method by taking only the first few characters
		if len(method) > 10 {
			method = method[:10]
		}
		return method
	}
}

// initMetrics initializes the metrics with better error handling
func initMetrics() {
	metricsMutex.Lock()
	defer metricsMutex.Unlock()
	
	if metricsInitialized {
		return
	}
	
	reg := getOrCreateRegistry()
	
	// Create new metrics
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
	
	// Register metrics with better error handling
	if err := reg.Register(httpRequestsTotal); err != nil {
		if are, ok := err.(prometheus.AlreadyRegisteredError); ok {
			// If already registered, unregister first then re-register
			reg.Unregister(are.ExistingCollector)
			reg.Register(httpRequestsTotal)
		}
	}
	
	if err := reg.Register(httpRequestDuration); err != nil {
		if are, ok := err.(prometheus.AlreadyRegisteredError); ok {
			reg.Unregister(are.ExistingCollector)
			reg.Register(httpRequestDuration)
		}
	}
	
	if err := reg.Register(httpRequestsInFlight); err != nil {
		if are, ok := err.(prometheus.AlreadyRegisteredError); ok {
			reg.Unregister(are.ExistingCollector)
			reg.Register(httpRequestsInFlight)
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
	
	reg := getOrCreateRegistry()
	
	// Unregister all metrics
	if httpRequestsTotal != nil {
		reg.Unregister(httpRequestsTotal)
		httpRequestsTotal = nil
	}
	if httpRequestDuration != nil {
		reg.Unregister(httpRequestDuration)
		httpRequestDuration = nil
	}
	if httpRequestsInFlight != nil {
		reg.Unregister(httpRequestsInFlight)
		httpRequestsInFlight = nil
	}
	
	metricsInitialized = false
}

// ResetMetrics forces a complete reset of all metrics
func ResetMetrics() {
	CleanupMetrics()
	initMetrics()
}

// PrometheusMiddleware returns a middleware that collects Prometheus metrics
func PrometheusMiddleware() fiber.Handler {
	// Initialize metrics
	initMetrics()
	
	return func(c *fiber.Ctx) error {
		start := time.Now()
		
		// Increment in-flight requests
		httpRequestsInFlight.Inc()
		
		// Process request
		err := c.Next()
		
		// Decrement in-flight requests
		httpRequestsInFlight.Dec()
		
		// Get normalized method
		method := normalizeMethod(c.Method())
		
		// Get path - use route path if available, otherwise use request path
		var path string
		if c.Route() != nil && c.Route().Path != "" {
			path = c.Route().Path
		} else {
			path = c.Path()
		}
		
		// Sanitize path to prevent label explosion
		if len(path) > 100 {
			path = path[:100]
		}
		if path == "" {
			path = "/"
		}
		
		// Get status code
		status := strconv.Itoa(c.Response().StatusCode())
		
		// Record metrics with error handling
		duration := time.Since(start).Seconds()
		
		// Use defer with recover to prevent panics from breaking the middleware
		defer func() {
			if r := recover(); r != nil {
				// Log the panic but don't crash the application
				// You might want to add proper logging here
			}
		}()
		
		// Record metrics
		if httpRequestDuration != nil {
			httpRequestDuration.WithLabelValues(method, path, status).Observe(duration)
		}
		
		if httpRequestsTotal != nil {
			httpRequestsTotal.WithLabelValues(method, path, status).Inc()
		}
		
		return err
	}
}

// GetMetricsHandler returns a handler for the /metrics endpoint with error handling
func GetMetricsHandler() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Set proper content type
		c.Set("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
		
		// Handle potential metric collection errors
		defer func() {
			if r := recover(); r != nil {
				c.Status(500).SendString("Error collecting metrics")
			}
		}()
		
		// Get the registry and gather metrics
		reg := getOrCreateRegistry()
		gathering, err := reg.Gather()
		if err != nil {
			return c.Status(500).SendString("Error gathering metrics: " + err.Error())
		}
		
		// Create a buffer to write metrics to
		var buf bytes.Buffer
		encoder := expfmt.NewEncoder(&buf, expfmt.FmtText)
		
		// Encode each metric family
		for _, mf := range gathering {
			if err := encoder.Encode(mf); err != nil {
				return c.Status(500).SendString("Error encoding metrics: " + err.Error())
			}
		}
		
		// Send the metrics
		return c.Send(buf.Bytes())
	}
}