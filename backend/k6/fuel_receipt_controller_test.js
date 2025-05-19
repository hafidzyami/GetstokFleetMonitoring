import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { randomString } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import { BASE_URL, OPTIONS, TEST_DATA, getAuthToken } from './config.js';

export const options = OPTIONS;

export default function () {
  const token = getAuthToken(http);
  if (!token) {
    console.error('Failed to get auth token');
    return;
  }
  
  group('Fuel Receipt Controller Tests', () => {
    // Get All Fuel Receipts
    group('Get All Fuel Receipts', () => {
      const res = http.get(`${BASE_URL}/fuel-receipts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      check(res, {
        'get all fuel receipts response received': (r) => r.status !== 0,
      });
    });
    
    // Get My Fuel Receipts
    group('Get My Fuel Receipts', () => {
      const res = http.get(`${BASE_URL}/fuel-receipts/my-receipts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      check(res, {
        'get my fuel receipts response received': (r) => r.status !== 0,
      });
    });
    
    // Create Fuel Receipt
    group('Create Fuel Receipt', () => {
      const res = http.post(`${BASE_URL}/fuel-receipts`, JSON.stringify({
        truckID: 1,
        refuelingDate: new Date().toISOString(),
        liters: Math.floor(Math.random() * 50) + 10,
        pricePerLiter: Math.floor(Math.random() * 10000) + 5000,
        totalPrice: Math.floor(Math.random() * 500000) + 100000,
        notes: `Test note ${randomString(10)}`,
        receiptImage: "https://example.com/dummy-image.jpg", // Dummy image URL for testing
      }), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      check(res, {
        'create fuel receipt response received': (r) => r.status !== 0,
      });
      
      // If the fuel receipt was created successfully, test the get by ID endpoint
      if (res.status === 201 || res.status === 200) {
        const receiptId = JSON.parse(res.body).data.id;
        
        // Get Fuel Receipt by ID
        group('Get Fuel Receipt by ID', () => {
          const getRes = http.get(`${BASE_URL}/fuel-receipts/${receiptId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          
          check(getRes, {
            'get fuel receipt by ID response received': (r) => r.status !== 0,
          });
        });
        
        // Update Fuel Receipt
        group('Update Fuel Receipt', () => {
          const updateRes = http.put(`${BASE_URL}/fuel-receipts/${receiptId}`, JSON.stringify({
            truckID: 1,
            refuelingDate: new Date().toISOString(),
            liters: Math.floor(Math.random() * 50) + 10,
            pricePerLiter: Math.floor(Math.random() * 10000) + 5000,
            totalPrice: Math.floor(Math.random() * 500000) + 100000,
            notes: `Updated note ${randomString(10)}`,
            receiptImage: "https://example.com/dummy-image.jpg",
          }), {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          
          check(updateRes, {
            'update fuel receipt response received': (r) => r.status !== 0,
          });
        });
      }
    });
    
    // Get Fuel Receipts by Driver ID
    group('Get Fuel Receipts by Driver ID', () => {
      const res = http.get(`${BASE_URL}/fuel-receipts/driver/1`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      check(res, {
        'get fuel receipts by driver ID response received': (r) => r.status !== 0,
      });
    });
    
    // Get Fuel Receipts by Truck ID
    group('Get Fuel Receipts by Truck ID', () => {
      const res = http.get(`${BASE_URL}/fuel-receipts/truck/1`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      check(res, {
        'get fuel receipts by truck ID response received': (r) => r.status !== 0,
      });
    });
  });
  
  sleep(1);
}
