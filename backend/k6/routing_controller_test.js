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
  
  group('Routing Controller Tests', () => {
    // Get Directions
    group('Get Directions', () => {
      const res = http.post(`${BASE_URL}/routing/directions`, JSON.stringify({
        origin: {
          lat: -6.2088,
          lng: 106.8456,
        },
        destination: {
          lat: -6.1751,
          lng: 106.8650,
        },
        waypoints: [],
      }), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      check(res, {
        'get directions response received': (r) => r.status !== 0,
      });
    });
  });
  
  sleep(1);
}
