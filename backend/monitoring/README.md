# Monitoring Setup for Fleet Monitoring Backend - Updated with InfluxDB

This directory contains the configuration for monitoring the backend application using Prometheus, InfluxDB, and Grafana. This setup helps visualize load test results from k6 and monitor real-time performance metrics from the backend.

## Components

- **Prometheus**: Time-series database for storing backend metrics
- **InfluxDB**: Time-series database optimized for k6 test results
- **Grafana**: Dashboard for visualizing metrics
- **K6**: Load testing tool with InfluxDB output

## Installation

Make sure you have Docker and Docker Compose installed.

## Starting the Monitoring Stack

1. Start the monitoring stack:

```bash
cd monitoring
docker-compose up -d
```

2. Access the Grafana dashboard:
   - URL: http://localhost:8083
   - Username: admin
   - Password: admin

## Running Load Tests with InfluxDB Integration

To run load tests and send metrics to InfluxDB:

```bash
cd ../k6
.\run_tests_with_influxdb.bat   # Windows
# or
sh run_tests_with_influxdb.sh   # Linux/Mac
```

## Available Dashboards

1. **K6 Load Testing Dashboard (InfluxDB)**
   - Shows metrics from k6 load tests using InfluxDB as the data source
   - Includes virtual users, requests per second, response times, error rates, and more

2. **Go Fiber Backend Dashboard**
   - Shows metrics from the Go Fiber backend application using Prometheus
   - Includes request rates, active requests, response times by endpoint, status codes, etc.

## Integrating with Your Application

The backend application needs to be updated to expose Prometheus metrics. The following files have been added or modified:

1. **middleware/prometheus_middleware.go**: Middleware to collect metrics
2. **controller/metrics_controller.go**: Controller to expose metrics endpoint
3. **main.go**: Modified to use Prometheus middleware and expose metrics endpoint

To apply these changes, follow these steps:

1. Add the new files to your backend application
2. Apply the changes to main.go as shown in the main.go.patch file:
   ```bash
   patch -p0 < main.go.patch
   # or manually apply the changes
   ```

## Dependencies

Make sure to add the Prometheus client library to your Go modules:

```bash
go get github.com/prometheus/client_golang/prometheus
go get github.com/prometheus/client_golang/prometheus/promauto
go get github.com/prometheus/client_golang/prometheus/promhttp
```

## Troubleshooting

- If metrics aren't appearing in Grafana, check the connections:
  - For backend metrics: Verify Prometheus is scraping your application's `/metrics` endpoint
  - For k6 metrics: Verify InfluxDB is receiving data from k6
- Make sure Docker containers are running: `docker-compose ps`
- Check container logs: `docker-compose logs influxdb`
