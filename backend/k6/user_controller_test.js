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
  
  group('User Controller Tests', () => {
    // Get All Users
    group('Get All Users', () => {
      const res = http.get(`${BASE_URL}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      check(res, {
        'get all users response received': (r) => r.status !== 0,
      });
      
      if (res.status === 200) {
        const users = JSON.parse(res.body).data;
        if (users && users.length > 0) {
          const userId = users[0].id;
          
          // Get User by ID
          group('Get User by ID', () => {
            const getUserRes = http.get(`${BASE_URL}/users/${userId}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            });
            
            check(getUserRes, {
              'get user by ID response received': (r) => r.status !== 0,
            });
          });
          
          // Get User Role by ID
          group('Get User Role by ID', () => {
            const getRoleRes = http.get(`${BASE_URL}/users/${userId}/role`, {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            });
            
            check(getRoleRes, {
              'get user role by ID response received': (r) => r.status !== 0,
            });
          });
        }
      }
    });
    
    // Reset Password
    group('Reset Password', () => {
      const res = http.post(`${BASE_URL}/users/reset-password`, JSON.stringify({
        userID: 1, // Assuming user ID 1 exists
        newPassword: 'newpassword123',
      }), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      check(res, {
        'reset password response received': (r) => r.status !== 0,
      });
    });
  });
  
  sleep(1);
}
