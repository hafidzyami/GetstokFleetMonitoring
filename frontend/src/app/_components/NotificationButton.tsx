"use client";

import React from 'react';
import { useNotification } from '../contexts/NotificationContext';

interface NotificationButtonProps {
  className?: string;
}

const NotificationButton: React.FC<NotificationButtonProps> = ({ className = '' }) => {
  const { 
    isSupported, 
    isSubscribed, 
    isLoading, 
    error, 
    subscribe, 
    unsubscribe 
  } = useNotification();

  const handleToggleSubscription = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  if (!isSupported) {
    return (
      <button 
        className={`px-4 py-2 bg-gray-300 text-gray-700 rounded-md cursor-not-allowed ${className}`}
        disabled
        title="Push notifications are not supported in this browser"
      >
        Notifications Not Supported
      </button>
    );
  }

  return (
    <div>
      <button
        onClick={handleToggleSubscription}
        disabled={isLoading}
        className={`px-4 py-2 rounded-md ${
          isLoading 
            ? 'bg-gray-300 cursor-wait' 
            : isSubscribed 
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
        } ${className}`}
      >
        {isLoading 
          ? 'Processing...' 
          : isSubscribed 
            ? 'Unsubscribe from Notifications' 
            : 'Enable Notifications'}
      </button>
      
      {error && (
        <p className="text-red-500 text-sm mt-1">{error}</p>
      )}
    </div>
  );
};

export default NotificationButton;