"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../utils/api';

// Tipe untuk subscription yang kita gunakan dalam context
interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// Tipe untuk context
interface NotificationContextType {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  subscription: PushSubscription | null; // Gunakan tipe PushSubscription dari browser API
  error: string | null;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
  sendNotification: (title: string, message: string, url: string, targetRoles: string[], targetUserIDs: number[]) => Promise<void>;
}

// Nilai default
const defaultContextValue: NotificationContextType = {
  isSupported: false,
  isSubscribed: false,
  isLoading: true,
  subscription: null,
  error: null,
  subscribe: async () => {},
  unsubscribe: async () => {},
  sendNotification: async () => {},
};

// Buat context
const NotificationContext = createContext<NotificationContextType>(defaultContextValue);

// Hook untuk menggunakan context
export const useNotification = () => useContext(NotificationContext);

// Provider component
export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [vapidPublicKey, setVapidPublicKey] = useState<string>('');

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = async () => {
      setIsLoading(true);
      
      // Check if service workers and push notifications are supported
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
          // Register service worker
          const registration = await navigator.serviceWorker.register('/sw.js');
          setSwRegistration(registration);
          setIsSupported(true);
          
          // Fetch VAPID public key
          try {
            const response = await api.get('/push/vapid-key');
            setVapidPublicKey(response.data.publicKey);
          } catch (error) {
            console.error('Error fetching VAPID key:', error);
            setError('Failed to fetch notification keys');
          }
          
          // Check if already subscribed
          const existingSubscription = await registration.pushManager.getSubscription();
          if (existingSubscription) {
            setSubscription(existingSubscription);
            setIsSubscribed(true);
          }
        } catch (error) {
          console.error('Error registering service worker:', error);
          setError('Failed to register service worker');
        }
      } else {
        setError('Push notifications not supported in this browser');
      }
      
      setIsLoading(false);
    };

    checkSupport();
  }, []);

  // Function to convert base64 to Uint8Array
  const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  // Subscribe to push notifications
  const subscribe = async () => {
    if (!isSupported || !swRegistration || !vapidPublicKey) {
      setError('Push notifications not supported or not initialized');
      return;
    }

    try {
      setIsLoading(true);
      
      // Subscribe to push service
      const pushSubscription = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      // Ekstrak informasi yang diperlukan dari subscription
      const subscriptionJSON = JSON.parse(JSON.stringify(pushSubscription));
      
      // Send subscription to server
      await api.post('/push/subscribe', {
        endpoint: subscriptionJSON.endpoint,
        p256dh: subscriptionJSON.keys.p256dh,
        auth: subscriptionJSON.keys.auth
      });

      setSubscription(pushSubscription);
      setIsSubscribed(true);
      setError(null);
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      setError('Failed to subscribe to notifications');
    } finally {
      setIsLoading(false);
    }
  };

  // Unsubscribe from push notifications
  const unsubscribe = async () => {
    if (!subscription) {
      return;
    }

    try {
      setIsLoading(true);
      
      // Unsubscribe from push service
      await subscription.unsubscribe();
      
      // Send unsubscribe request to server
      await api.post('/push/unsubscribe', {
        endpoint: subscription.endpoint
      });

      setSubscription(null);
      setIsSubscribed(false);
      setError(null);
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      setError('Failed to unsubscribe from notifications');
    } finally {
      setIsLoading(false);
    }
  };

  // Send notification
  const sendNotification = async (
    title: string, 
    message: string, 
    url: string = '', 
    targetRoles: string[] = [], 
    targetUserIDs: number[] = []
  ) => {
    try {
      setIsLoading(true);
      
      await api.post('/push/send', {
        title,
        message,
        url,
        targetRoles,
        targetUserIDs
      });
      
      setError(null);
    } catch (error) {
      console.error('Error sending notification:', error);
      setError('Failed to send notification');
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    isSupported,
    isSubscribed,
    isLoading,
    subscription,
    error,
    subscribe,
    unsubscribe,
    sendNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};