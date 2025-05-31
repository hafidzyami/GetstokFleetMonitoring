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
  
  group('Route Deviation Controller Tests', () => {
    // Get Route Deviations
    group('Get Route Deviations', () => {
      const res = http.get(`${BASE_URL}/route-deviations`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      check(res, {
        'get route deviations response received': (r) => r.status !== 0,
      });
    });
  });
  
  sleep(1);
}
