// notification-service.js
const express = require('express');
const webpush = require('web-push');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');
const dotenv = require('dotenv');
const { protected, roleAuthorization } = require('./middleware/auth');
const setupSwagger = require('./swagger');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT_NOTIFICATION_SERVICE;

// Configure VAPID keys
webpush.setVapidDetails(
  process.env.VAPID_SUBSCRIBER,
  process.env.VAPID_PUBLIC_KEY, 
  process.env.VAPID_PRIVATE_KEY, 
);

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Setup Swagger
setupSwagger(app);

// Error response helper
const errorResponse = (code, message) => ({
  apiVersion: '1.0',
  error: {
    code,
    message
  }
});

// Success response helper
const successResponse = (method, data) => ({
  apiVersion: '1.0',
  method,
  data
});

/**
 * @swagger
 * /push/vapid-key:
 *   get:
 *     summary: Get VAPID public key
 *     description: Get VAPID public key for push notification subscription
 *     tags: [Push]
 *     responses:
 *       200:
 *         description: Success with public key
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 apiVersion:
 *                   type: string
 *                 method:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     publicKey:
 *                       type: string
 *       500:
 *         description: Server error
 */
app.get('/api/v1/push/vapid-key', (req, res) => {
  res.json(successResponse('push.getVapidKey', {
    publicKey: process.env.VAPID_PUBLIC_KEY
  }));
});

/**
 * @swagger
 * /push/subscribe:
 *   post:
 *     summary: Subscribe to push notifications
 *     description: Register a new push notification subscription
 *     tags: [Push]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - endpoint
 *               - p256dh
 *               - auth
 *             properties:
 *               endpoint:
 *                 type: string
 *                 description: Push subscription endpoint
 *               p256dh:
 *                 type: string
 *                 description: P256DH key
 *               auth:
 *                 type: string
 *                 description: Auth secret
 *     responses:
 *       200:
 *         description: Success response
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
app.post('/api/v1/push/subscribe', protected, async (req, res) => {
  try {
    // Validate request
    const { endpoint, p256dh, auth } = req.body;
    if (!endpoint || !p256dh || !auth) {
      return res.status(400).json(errorResponse(400, 'Endpoint, p256dh, and auth are required'));
    }

    // Get user ID and role from auth middleware
    const userId = req.userId; // This would be set by your authentication middleware
    const role = req.role;     // This would be set by your authentication middleware

    // Insert or update subscription in database
    const result = await pool.query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, role)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (endpoint) 
       DO UPDATE SET user_id = $1, p256dh = $3, auth = $4, role = $5`,
      [userId, endpoint, p256dh, auth, role]
    );

    res.json(successResponse('push.subscribe', { success: true }));
  } catch (error) {
    console.error('Subscription error:', error);
    res.status(500).json(errorResponse(500, 'Failed to save subscription'));
  }
});

/**
 * @swagger
 * /push/unsubscribe:
 *   post:
 *     summary: Unsubscribe from push notifications
 *     description: Remove a push notification subscription
 *     tags: [Push]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - endpoint
 *             properties:
 *               endpoint:
 *                 type: string
 *                 description: Push subscription endpoint
 *     responses:
 *       200:
 *         description: Success response
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
app.post('/api/v1/push/unsubscribe', protected, async (req, res) => {
  try {
    // Validate request
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json(errorResponse(400, 'Endpoint is required'));
    }

    // Delete subscription from database
    await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint]);

    res.json(successResponse('push.unsubscribe', { success: true }));
  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).json(errorResponse(500, 'Failed to delete subscription'));
  }
});

/**
 * @swagger
 * /push/send:
 *   post:
 *     summary: Send push notifications
 *     description: Send notifications to specified roles and/or users
 *     tags: [Push]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - message
 *             properties:
 *               title:
 *                 type: string
 *                 description: Notification title
 *               message:
 *                 type: string
 *                 description: Notification message
 *               url:
 *                 type: string
 *                 description: Optional URL to open when notification is clicked
 *               targetRoles:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of role names to send notification to
 *               targetUserIDs:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Array of user IDs to send notification to
 *     responses:
 *       200:
 *         description: Success response with count of sent notifications
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - only management can send notifications
 *       500:
 *         description: Server error
 */
app.post('/api/v1/push/send', protected, roleAuthorization(['management']), async (req, res) => {
  try {
    // Validate request
    const { title, message, url, targetRoles, targetUserIDs } = req.body;
    
    if (!title || !message) {
      return res.status(400).json(errorResponse(400, 'Title and message are required'));
    }
    
    if ((!targetRoles || targetRoles.length === 0) && (!targetUserIDs || targetUserIDs.length === 0)) {
      return res.status(400).json(errorResponse(400, 'At least one target (role or userID) must be specified'));
    }

    // Get subscriptions from database
    let subscriptions = [];
    
    if (targetRoles && targetRoles.length > 0) {
      const roleResult = await pool.query(
        'SELECT * FROM push_subscriptions WHERE role = ANY($1::text[])',
        [targetRoles]
      );
      subscriptions = subscriptions.concat(roleResult.rows);
    }
    
    if (targetUserIDs && targetUserIDs.length > 0) {
      const userResult = await pool.query(
        'SELECT * FROM push_subscriptions WHERE user_id = ANY($1::int[])',
        [targetUserIDs]
      );
      subscriptions = subscriptions.concat(userResult.rows);
    }

    // Remove duplicates by endpoint
    const uniqueSubscriptions = [...new Map(subscriptions.map(sub => [sub.endpoint, sub])).values()];
    
    // Prepare notification payload
    const notificationPayload = {
      title: title,
      body: message,
      tag: `notification-${Date.now()}`,
      timestamp: Date.now()
    };
    
    if (url) {
      notificationPayload.url = url;
    }
    
    // Send notifications
    const sendPromises = uniqueSubscriptions.map(async (subscription) => {
      const pushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth
        }
      };
      
      try {
        await webpush.sendNotification(pushSubscription, JSON.stringify(notificationPayload));
        return true;
      } catch (error) {
        console.error(`Failed to send notification to ${subscription.endpoint}:`, error);
        // If subscription is invalid (gone), remove it
        if (error.statusCode === 410) {
          await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [subscription.endpoint]);
        }
        return false;
      }
    });
    
    const results = await Promise.allSettled(sendPromises);
    const sentCount = results.filter(result => result.status === 'fulfilled' && result.value === true).length;
    
    res.json(successResponse('push.send', {
      success: true,
      sent: sentCount
    }));
  } catch (error) {
    console.error('Push notification error:', error);
    res.status(500).json(errorResponse(500, 'Failed to send notifications'));
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Push notification service running on port ${PORT}`);
  console.log(`Swagger docs available at http://localhost:${PORT}/api-docs`);
});

module.exports = app;