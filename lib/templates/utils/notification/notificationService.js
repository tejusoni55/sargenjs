const admin = require('firebase-admin');
const fs = require('fs');

class NotificationService {
  constructor() {
    this.app = null;
    this.initializeFirebase();
  }

  /**
   * Initialize Firebase Admin SDK
   */
  initializeFirebase() {
    try {
      // Check if Firebase is already initialized
      if (admin.apps.length > 0) {
        this.app = admin.app();
        console.log('Firebase Admin SDK already initialized');
        return;
      }

      // Get service account file path from environment
      const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
      
      if (!serviceAccountPath) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_PATH environment variable is required');
      }

      // Read and parse the service account JSON file
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

      // Initialize Firebase Admin SDK with service account JSON content
      this.app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
      });

      console.log('Firebase Admin SDK initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Firebase Admin SDK:', error);
    }
  }

  /**
   * Send push notification to a single device
   * @param {string} token - FCM registration token
   * @param {Object} notification - Notification payload
   * @param {Object} data - Additional data payload
   * @returns {Promise<Object>} - Send result
   */
  async sendToDevice(token, notification, data = {}) {
    try {
      if (!this.app) {
        throw new Error('Firebase Admin SDK not initialized');
      }

      const message = {
        token: token,
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: data,
      };

      const response = await admin.messaging().send(message);
      console.log('Successfully sent message:', response);
      
      return {
        success: true,
        messageId: response,
        message: 'Notification sent successfully',
      };
    } catch (error) {
      console.error('Error sending notification:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to send notification',
      };
    }
  }

  /**
   * Send push notification to multiple devices
   * @param {Array} tokens - Array of FCM registration tokens
   * @param {Object} notification - Notification payload
   * @param {Object} data - Additional data payload
   * @returns {Promise<Object>} - Send result
   */
  async sendToMultipleDevices(tokens, notification, data = {}) {
    try {
      if (!this.app) {
        throw new Error('Firebase Admin SDK not initialized');
      }

      const message = {
        tokens: tokens,
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: data,
      };

      const response = await admin.messaging().sendMulticast(message);
      console.log('Successfully sent multicast message:', response);
      
      return {
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount,
        responses: response.responses,
        message: `Sent to ${response.successCount} devices successfully`,
      };
    } catch (error) {
      console.error('Error sending multicast notification:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to send multicast notification',
      };
    }
  }

  /**
   * Send push notification to a topic
   * @param {string} topic - FCM topic name
   * @param {Object} notification - Notification payload
   * @param {Object} data - Additional data payload
   * @returns {Promise<Object>} - Send result
   */
  async sendToTopic(topic, notification, data = {}) {
    try {
      if (!this.app) {
        throw new Error('Firebase Admin SDK not initialized');
      }

      const message = {
        topic: topic,
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: data,
      };

      const response = await admin.messaging().send(message);
      console.log('Successfully sent topic message:', response);
      
      return {
        success: true,
        messageId: response,
        message: 'Topic notification sent successfully',
      };
    } catch (error) {
      console.error('Error sending topic notification:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to send topic notification',
      };
    }
  }

  /**
   * Subscribe device tokens to a topic
   * @param {Array} tokens - Array of FCM registration tokens
   * @param {string} topic - Topic name to subscribe to
   * @returns {Promise<Object>} - Subscription result
   */
  async subscribeToTopic(tokens, topic) {
    try {
      if (!this.app) {
        throw new Error('Firebase Admin SDK not initialized');
      }

      const response = await admin.messaging().subscribeToTopic(tokens, topic);
      console.log('Successfully subscribed to topic:', response);
      
      return {
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount,
        errors: response.errors,
        message: `Subscribed ${response.successCount} tokens to topic: ${topic}`,
      };
    } catch (error) {
      console.error('Error subscribing to topic:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to subscribe to topic',
      };
    }
  }

  /**
   * Unsubscribe device tokens from a topic
   * @param {Array} tokens - Array of FCM registration tokens
   * @param {string} topic - Topic name to unsubscribe from
   * @returns {Promise<Object>} - Unsubscription result
   */
  async unsubscribeFromTopic(tokens, topic) {
    try {
      if (!this.app) {
        throw new Error('Firebase Admin SDK not initialized');
      }

      const response = await admin.messaging().unsubscribeFromTopic(tokens, topic);
      console.log('Successfully unsubscribed from topic:', response);
      
      return {
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount,
        errors: response.errors,
        message: `Unsubscribed ${response.successCount} tokens from topic: ${topic}`,
      };
    } catch (error) {
      console.error('Error unsubscribing from topic:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to unsubscribe from topic',
      };
    }
  }
}

module.exports = new NotificationService();
