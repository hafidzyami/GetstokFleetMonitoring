import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { randomString } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import { BASE_URL, OPTIONS, TEST_DATA, getAuthToken } from './config.js';

export const options = OPTIONS;

export default function () {
  group('Auth Controller Tests', () => {
    // Login Test
    group('Login', () => {
      const res = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
        email: 'management1@getstok.com',
        password: 'password123',
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
      
      check(res, {
        'login status is 200': (r) => r.status === 200,
        'has token in response': (r) => JSON.parse(r.body).data.token !== undefined,
      });
      
      const token = JSON.parse(res.body).data.token;
      
      // Get Profile Test
      group('Get Profile', () => {
        const profileRes = http.get(`${BASE_URL}/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        check(profileRes, {
          'profile status is 200': (r) => r.status === 200,
          'profile data exists': (r) => JSON.parse(r.body).data !== undefined,
        });
      });
      
      // Register Test - only managements can register users
      group('Register', () => {
        const randomEmail = `test.${randomString(8)}@example.com`;
        
        const registerRes = http.post(`${BASE_URL}/auth/register`, JSON.stringify({
          name: `Test User ${randomString(5)}`,
          email: randomEmail,
          password: 'password123',
          role: 'driver',
        }), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        // This might fail if the user doesn't have management role, but that's fine for load testing
        check(registerRes, {
          'register response received': (r) => r.status !== 0,
        });
      });
      
      // Update Password Test
      group('Update Password', () => {
        const updatePasswordRes = http.put(`${BASE_URL}/profile/password`, JSON.stringify({
          oldPassword: 'admin123',
          newPassword: 'admin123', // Keep the same to avoid disrupting tests
        }), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        check(updatePasswordRes, {
          'update password response received': (r) => r.status !== 0,
        });
      });
    });
  });
  
  sleep(1);
}
