# K6 Load Testing for Fleet Monitoring Backend

This directory contains K6 load testing scripts for all the controllers in the fleet monitoring backend application.

## Requirements

- [k6](https://k6.io/docs/getting-started/installation/) - Load testing tool
- Running backend server

## Test Configuration

The load testing configuration is defined in `config.js`:

- Stages:
  - Ramp up to 50 virtual users over 30 seconds
  - Stay at 50 virtual users for 1 minute
  - Ramp down to 0 users over 30 seconds

- Thresholds:
  - 95% of requests should complete within 2 seconds
  - Less than 10% of requests should fail

## Individual Controller Tests

You can run tests for specific controllers:

```
k6 run auth_controller_test.js
k6 run truck_controller_test.js
k6 run route_plan_controller_test.js
k6 run user_controller_test.js
k6 run fuel_receipt_controller_test.js
k6 run upload_controller_test.js
k6 run ocr_controller_test.js
k6 run routing_controller_test.js
k6 run route_deviation_controller_test.js
k6 run truck_idle_controller_test.js
k6 run driver_location_controller_test.js
```

## WebSocket Testing

A separate test script is provided for WebSocket performance testing:

```
k6 run websocket_test.js
```

This test simulates multiple WebSocket connections, sending and receiving messages to test the real-time capabilities of the system. The WebSocket test has its own configuration optimized for testing persistent connections:

- Ramps up to 30 WebSocket connections over 30 seconds
- Maintains these connections for 1 minute
- Ramps down over 30 seconds
- Tests connection times, message exchange, and connection stability

## Running a Full Load Test

To run a comprehensive load test against all REST API controllers:

```
k6 run master_test.js
```

The master test script distributes load across all controllers based on expected usage patterns, with different controllers being tested at different frequencies.

**Note**: WebSocket tests are not included in the master test due to their different execution model and should be run separately.

## Test Reports

K6 provides detailed reports after each test run, including:

- HTTP Request metrics (requests/sec, latency, etc.)
- WebSocket connection metrics (when running WebSocket tests)
- Virtual user metrics
- Threshold pass/fail results

## Custom Testing

You can customize the tests by modifying the following:

1. `config.js` - Adjust the load stages and thresholds
2. Individual controller test files - Add/modify specific endpoint tests
3. `websocket_test.js` - Adjust WebSocket-specific parameters
4. `master_test.js` - Adjust the probability of each test being run

## Note

These load tests focus on performance and do not validate the correctness of API responses. They're designed to test how well the system handles load, not whether it returns the correct data.
