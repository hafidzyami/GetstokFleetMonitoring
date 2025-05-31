import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { BASE_URL, OPTIONS, getAuthToken } from './config.js';

export const options = OPTIONS;

// Base64 encoded 1x1 transparent PNG for testing
const dummyBase64Image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

export default function () {
  const token = getAuthToken(http);
  if (!token) {
    console.error('Failed to get auth token');
    return;
  }
  
  group('OCR Controller Tests', () => {
    // Process OCR
    group('Process OCR', () => {
      const res = http.post(`${BASE_URL}/ocr/process`, JSON.stringify({
        image: dummyBase64Image,
        type: 'fuel_receipt', // Assuming this is a valid type
      }), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      check(res, {
        'process OCR response received': (r) => r.status !== 0,
      });
    });
  });
  
  sleep(1);
}
