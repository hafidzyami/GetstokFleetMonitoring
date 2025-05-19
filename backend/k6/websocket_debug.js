import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { BASE_URL } from './config.js';

// Simplified options for debugging
export const options = {
  vus: 1, // Just one virtual user
  iterations: 1, // Just one iteration
  thresholds: {
    'ws_connecting': ['p(95)<1000'],
    'ws_msgs_received': ['count>0'], // Lower threshold - just need any message
    'ws_session_duration': ['p(95)<30000'],
  },
};

export default function () {
  // Log the BASE_URL for debugging
  console.log(`BASE_URL: ${BASE_URL}`);
  
  // Convert BASE_URL from http to ws
  const wsBaseUrl = BASE_URL.replace('http://', 'ws://').replace('/api/v1', '');
  console.log(`wsBaseUrl: ${wsBaseUrl}`);
  
  const wsUrl = `${wsBaseUrl}/ws`;
  console.log(`Attempting to connect to WebSocket at: ${wsUrl}`);
  
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
      console.log('WebSocket connection established successfully');
      
      // Send test message
      const message = {
        type: 'test_message',
        content: 'Load test message',
        timestamp: Date.now()
      };
      console.log(`Sending message: ${JSON.stringify(message)}`);
      socket.send(JSON.stringify(message));
    });
    
    // Message received (onmessage)
    socket.on('message', function message(data) {
      console.log(`Received message: ${data}`);
      
      // Parse received message
      try {
        const msg = JSON.parse(data);
        console.log(`Parsed message type: ${msg.type}`);
        
        // Handle different message types
        if (msg.type === 'ping') {
          console.log('Received ping, sending pong');
          // Respond to ping with pong
          socket.send(JSON.stringify({
            type: 'pong',
            timestamp: Date.now()
          }));
        }
      } catch (e) {
        console.log(`Error parsing message: ${e.message}`);
      }
    });
    
    // Connection closed (onclose)
    socket.on('close', function close(code, reason) {
      console.log(`WebSocket connection closed with code ${code}. Reason: ${reason}`);
    });
    
    // Connection error (onerror)
    socket.on('error', function (e) {
      console.log(`WebSocket error: ${e.message}`);
    });
    
    // Keep the connection open for 10 seconds
    socket.setTimeout(function () {
      console.log('Timeout reached, closing connection');
      socket.close();
    }, 10000);
  });
  
  // Check connection result with more detailed output
  const connectionSuccess = res && res.status === 101;
  console.log(`Connection result: ${JSON.stringify(res)}`);
  console.log(`Connection status: ${res ? res.status : 'No response'}`);
  console.log(`Connection established: ${connectionSuccess ? 'Yes' : 'No'}`);
  
  check(res, {
    'WebSocket connection established': (r) => connectionSuccess,
  });
  
  // Sleep to give time for logs to appear
  sleep(15);
}
