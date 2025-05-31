import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { BASE_URL, OPTIONS, getAuthToken } from './config.js';

export const options = OPTIONS;

export default function () {
  const token = getAuthToken(http);
  if (!token) {
    console.error('Failed to get auth token');
    return;
  }
  
  group('Truck Idle Controller Tests', () => {
    // Get All Idle Detections
    group('Get All Idle Detections', () => {
      const res = http.get(`${BASE_URL}/idle-detections`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      check(res, {
        'get all idle detections response received': (r) => r.status !== 0,
      });
    });
    
    // Get Active Idle Detections
    group('Get Active Idle Detections', () => {
      const res = http.get(`${BASE_URL}/idle-detections/active`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      check(res, {
        'get active idle detections response received': (r) => r.status !== 0,
      });
    });
    
    // Resolve Idle Detection (assuming ID 1 exists)
    group('Resolve Idle Detection', () => {
      const res = http.put(`${BASE_URL}/idle-detections/1/resolve`, JSON.stringify({
        resolution: "Test resolution",
      }), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      check(res, {
        'resolve idle detection response received': (r) => r.status !== 0,
      });
    });
  });
  
  sleep(1);
}
