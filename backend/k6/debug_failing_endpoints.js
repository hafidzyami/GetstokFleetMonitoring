import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, getAuthToken } from './config.js';

export const options = {
  vus: 1,
  iterations: 1,
};

export default function () {
  const token = getAuthToken(http);
  if (!token) {
    console.error('Failed to get auth token');
    return;
  }
  
  console.log('Token obtained successfully:', token.substring(0, 10) + '...');
  
  // Test Get All Trucks
  const trucksRes = http.get(`${BASE_URL}/trucks`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  console.log('Get All Trucks Response:');
  console.log('Status:', trucksRes.status);
  console.log('Body (first 200 chars):', trucksRes.body.substring(0, 200));
  
  try {
    const trucksBody = JSON.parse(trucksRes.body);
    console.log('Parsed JSON successfully');
    console.log('Has data property:', trucksBody.data !== undefined);
    console.log('Data type:', typeof trucksBody.data);
    if (trucksBody.data) {
      console.log('Is data array:', Array.isArray(trucksBody.data));
      console.log('Data length:', Array.isArray(trucksBody.data) ? trucksBody.data.length : 'N/A');
    }
  } catch (e) {
    console.log('Error parsing JSON:', e.message);
  }
  
  const isOk = check(trucksRes, {
    'get all trucks status is 200': (r) => r.status === 200,
    'trucks body is not empty': (r) => r.body.length > 0,
    'trucks body is valid JSON': (r) => {
      try {
        JSON.parse(r.body);
        return true;
      } catch (e) {
        return false;
      }
    },
    'trucks response has data property': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data !== undefined;
      } catch (e) {
        return false;
      }
    },
  });
  
  console.log('All checks passed?', isOk);
  
  // Test Get All Route Plans
  const routePlansRes = http.get(`${BASE_URL}/route-plans`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  console.log('\nGet All Route Plans Response:');
  console.log('Status:', routePlansRes.status);
  console.log('Body (first 200 chars):', routePlansRes.body.substring(0, 200));
  
  try {
    const routePlansBody = JSON.parse(routePlansRes.body);
    console.log('Parsed JSON successfully');
    console.log('Has data property:', routePlansBody.data !== undefined);
    console.log('Data type:', typeof routePlansBody.data);
    if (routePlansBody.data) {
      console.log('Is data array:', Array.isArray(routePlansBody.data));
      console.log('Data length:', Array.isArray(routePlansBody.data) ? routePlansBody.data.length : 'N/A');
    }
  } catch (e) {
    console.log('Error parsing JSON:', e.message);
  }
  
  check(routePlansRes, {
    'get all route plans status is 200': (r) => r.status === 200,
    'route plans body is not empty': (r) => r.body.length > 0,
    'route plans body is valid JSON': (r) => {
      try {
        JSON.parse(r.body);
        return true;
      } catch (e) {
        return false;
      }
    },
    'route plans response has data property': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data !== undefined;
      } catch (e) {
        return false;
      }
    },
  });
  
  sleep(1);
}
