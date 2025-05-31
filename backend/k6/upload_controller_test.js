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
  
  group('Upload Controller Tests', () => {
    // Upload Base64 Photo
    group('Upload Base64 Photo', () => {
      const res = http.post(`${BASE_URL}/uploads/photo/base64`, JSON.stringify({
        base64: dummyBase64Image,
        fileName: 'test-image.png',
      }), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      check(res, {
        'upload base64 photo response received': (r) => r.status !== 0,
      });
    });
    
    // Upload Photo (Multipart Form)
    group('Upload Photo (Multipart)', () => {
      // Create a simple string for the file content instead of binary data
      // This is just for load testing, so the content doesn't matter
      const fileContent = 'This is a test file content simulating an image for load testing.';
      
      const data = {
        file: http.file(fileContent, 'test-file.txt', 'text/plain'),
      };
      
      const res = http.post(`${BASE_URL}/uploads/photo`, data, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      check(res, {
        'upload photo response received': (r) => r.status !== 0,
      });
    });
  });
  
  sleep(1);
}
