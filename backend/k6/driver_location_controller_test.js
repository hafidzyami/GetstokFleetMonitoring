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
  
  group('Driver Location Controller Tests', () => {
    // Get Active Route
    group('Get Active Route', () => {
      const res = http.get(`${BASE_URL}/route-plans/active`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      check(res, {
        'get active route response received': (r) => r.status !== 0,
      });
    });
    
    // For the other endpoints, we need a valid route plan ID
    // First, get all route plans
    const routePlansRes = http.get(`${BASE_URL}/route-plans`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (routePlansRes.status === 200) {
      const routePlans = JSON.parse(routePlansRes.body).data;
      
      if (routePlans && routePlans.length > 0) {
        const routePlanId = routePlans[0].id;
        
        // Update Driver Location
        group('Update Driver Location', () => {
          const res = http.post(`${BASE_URL}/route-plans/${routePlanId}/location`, JSON.stringify({
            lat: -6.18 + (Math.random() * 0.1),
            lng: 106.80 + (Math.random() * 0.1),
          }), {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          
          check(res, {
            'update driver location response received': (r) => r.status !== 0,
          });
        });
        
        // Get Latest Driver Location
        group('Get Latest Driver Location', () => {
          const res = http.get(`${BASE_URL}/route-plans/${routePlanId}/location/latest`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          
          check(res, {
            'get latest driver location response received': (r) => r.status !== 0,
          });
        });
        
        // Get Driver Location History
        group('Get Driver Location History', () => {
          const res = http.get(`${BASE_URL}/route-plans/${routePlanId}/location/history`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          
          check(res, {
            'get driver location history response received': (r) => r.status !== 0,
          });
        });
      }
    }
  });
  
  sleep(1);
}
