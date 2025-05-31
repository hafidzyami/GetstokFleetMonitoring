export const BASE_URL = 'http://localhost:8080/api/v1';

// Testing configurations
export const OPTIONS = {
  stages: [
    { duration: '30s', target: 100 },   // Ramp up to 10 users over 15 seconds
    { duration: '60s', target: 100 },    // Stay at 10 users for 30 seconds
    { duration: '30s', target: 0 },    // Ramp down to 0 users over 15 seconds
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests should complete within 5s
  },
};

// Common dummy data for testing
export const TEST_DATA = {
  user: {
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
    role: 'driver',
  },
  truck: {
    name: 'Test Truck',
    model: 'Test Model',
    plateNumber: 'B1234XYZ',
    macID: 'MAC12345',
  },
  routePlan: {
    name: 'Test Route Plan',
    truckID: 1,
    driverID: 1,
    origin: {
      name: 'Origin Place',
      lat: -6.2088,
      lng: 106.8456,
    },
    destination: {
      name: 'Destination Place',
      lat: -6.1751,
      lng: 106.8650,
    },
    waypoints: [],
  },
};

// Authentication helper - with proper error handling
export async function getAuthToken(http) {
  try {
    // First, try with the default credentials
    const loginRes = await http.post(`${BASE_URL}/auth/login`, JSON.stringify({
      email: 'management1@getstok.com',
      password: 'password123',
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (loginRes.status === 200) {
      const body = JSON.parse(loginRes.body);
      if (body.data && body.data.token) {
        return body.data.token;
      }
    }
    
    // If that fails, try with admin credentials
    const adminLoginRes = await http.post(`${BASE_URL}/auth/login`, JSON.stringify({
      email: 'admin@example.com',
      password: 'admin123',
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (adminLoginRes.status === 200) {
      const body = JSON.parse(adminLoginRes.body);
      if (body.data && body.data.token) {
        return body.data.token;
      }
    }
    
    // If all else fails, log the response for debugging
    console.error(`Login failed. Status: ${loginRes.status}, Body: ${loginRes.body}`);
    return null;
  } catch (error) {
    console.error('Error during authentication:', error);
    return null;
  }
}
