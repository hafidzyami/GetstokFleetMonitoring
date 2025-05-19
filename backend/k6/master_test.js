import { group, sleep } from 'k6';
import { OPTIONS } from './config.js';

import authTest from './auth_controller_test.js';
import truckTest from './truck_controller_test.js';
import routePlanTest from './route_plan_controller_test.js';
import userTest from './user_controller_test.js';
import fuelReceiptTest from './fuel_receipt_controller_test.js';
import uploadTest from './upload_controller_test.js';
import ocrTest from './ocr_controller_test.js';
import routingTest from './routing_controller_test.js';
import routeDeviationTest from './route_deviation_controller_test.js';
import truckIdleTest from './truck_idle_controller_test.js';
import driverLocationTest from './driver_location_controller_test.js';
// WebSocket test is imported but not included in the default execution
// because it requires a separate execution model
import wsTest from './websocket_test.js';

export const options = {
  // Use the same options as in the config
  stages: OPTIONS.stages,
  thresholds: OPTIONS.thresholds,
};

export default function () {
  // Run all controller tests with weight distribution
  // This distributes the load across different controller endpoints based on expected usage
  
  // Login & Authentication (high priority)
  group('Auth Tests', () => {
    if (Math.random() < 0.9) { // 90% of VUs will run auth tests
      authTest();
    }
  });
  
  sleep(1);
  
  // User Management (medium priority)
  group('User Management Tests', () => {
    if (Math.random() < 0.7) { // 70% of VUs will run user tests
      userTest();
    }
  });
  
  sleep(1);
  
  // Truck Management (high priority)
  group('Truck Management Tests', () => {
    if (Math.random() < 0.8) { // 80% of VUs will run truck tests
      truckTest();
    }
  });
  
  sleep(1);
  
  // Route Planning (highest priority)
  group('Route Planning Tests', () => {
    if (Math.random() < 0.9) { // 90% of VUs will run route plan tests
      routePlanTest();
    }
  });
  
  sleep(1);
  
  // Fuel Receipts (medium priority)
  group('Fuel Receipt Tests', () => {
    if (Math.random() < 0.6) { // 60% of VUs will run fuel receipt tests
      fuelReceiptTest();
    }
  });
  
  sleep(1);
  
  // Uploads (lower priority)
  group('Upload Tests', () => {
    if (Math.random() < 0.4) { // 40% of VUs will run upload tests
      uploadTest();
    }
  });
  
  sleep(1);
  
  // OCR (lower priority)
  group('OCR Tests', () => {
    if (Math.random() < 0.3) { // 30% of VUs will run OCR tests
      ocrTest();
    }
  });
  
  sleep(1);
  
  // Routing (high priority)
  group('Routing Tests', () => {
    if (Math.random() < 0.8) { // 80% of VUs will run routing tests
      routingTest();
    }
  });
  
  sleep(1);
  
  // Route Deviations (medium priority)
  group('Route Deviation Tests', () => {
    if (Math.random() < 0.5) { // 50% of VUs will run route deviation tests
      routeDeviationTest();
    }
  });
  
  sleep(1);
  
  // Truck Idle (medium priority)
  group('Truck Idle Tests', () => {
    if (Math.random() < 0.6) { // 60% of VUs will run truck idle tests
      truckIdleTest();
    }
  });
  
  sleep(1);
  
  // Driver Location (high priority)
  group('Driver Location Tests', () => {
    if (Math.random() < 0.8) { // 80% of VUs will run driver location tests
      driverLocationTest();
    }
  });
  
  sleep(1);
  
  // Note: WebSocket test is not included here because it uses different
  // execution model and should be run separately with:
  // k6 run websocket_test.js
}
