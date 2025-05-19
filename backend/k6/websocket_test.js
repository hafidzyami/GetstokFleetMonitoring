import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { BASE_URL, OPTIONS } from './config.js';

// Modify options for WebSocket testing
export const options = {
  stages: [
    { duration: '30s', target: 30 },   // Ramp up to 30 WebSocket connections
    { duration: '1m', target: 30 },    // Stay at 30 connections for 1 minute
    { duration: '30s', target: 0 },    // Ramp down to 0 connections
  ],
  thresholds: {
    'ws_connecting': ['p(95)<1000'],   // 95% of connections should be established in less than 1s
    'ws_msgs_received': ['count>100'], // Should receive at least 100 messages total
    'ws_session_duration': ['p(95)<30000'], // 95% of WebSocket sessions should last less than 30s
  },
};

export default function () {
  // Convert BASE_URL from http to ws
  const wsBaseUrl = BASE_URL.replace('http://', 'ws://').replace('/api/v1', '');
  const wsUrl = `${wsBaseUrl}/ws`;
  
  // Define WebSocket parameters
  const params = {
    headers: {
      'Sec-WebSocket-Extensions': 'permessage-deflate; client_max_window_bits',
    },
  };
  
  // Create WebSocket connection and define handlers
  const res = ws.connect(wsUrl, params, function (socket) {
    // Connection established (onopen)
    socket.on('open', function open() {
      console.log('WebSocket connection established');
      
      // Send test message
      socket.send(JSON.stringify({
        type: 'test_message',
        content: 'Load test message',
        timestamp: Date.now()
      }));
    });
    
    // Message received (onmessage)
    socket.on('message', function message(data) {
      // Parse received message
      try {
        const msg = JSON.parse(data);
        
        // Handle different message types
        if (msg.type === 'ping') {
          // Respond to ping with pong
          socket.send(JSON.stringify({
            type: 'pong',
            timestamp: Date.now()
          }));
        }
      } catch (e) {
        console.log('Error parsing message:', e);
      }
    });
    
    // Connection closed (onclose)
    socket.on('close', function close() {
      console.log('WebSocket connection closed');
    });
    
    // Connection error (onerror)
    socket.on('error', function (e) {
      console.log('WebSocket error: ', e);
    });
    
    // Keep the connection open for 20 seconds
    socket.setTimeout(function () {
      socket.close();
    }, 20000);
  });
  
  // Check connection result
  check(res, {
    'WebSocket connection established': (r) => r && r.status === 101,
  });
  
  // Sleep between iterations
  sleep(1);
}
