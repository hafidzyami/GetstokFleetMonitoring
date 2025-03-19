"use client";

import React, { useState } from 'react';
import { useNotification } from '../contexts/NotificationContext';

// Interface untuk user (sesuaikan dengan struktur data user di aplikasi Anda)
interface User {
  id: number;
  name: string;
  role: string;
}

interface NotificationSenderProps {
  users?: User[]; // Optional list of users untuk dipilih
  className?: string;
  allowedRoles?: string[]; // Role yang boleh dipilih
}

const NotificationSender: React.FC<NotificationSenderProps> = ({ 
  users = [],
  className = '',
  allowedRoles = ['management', 'driver']
}) => {
  const { sendNotification, isLoading, error } = useNotification();
  
  // State untuk form
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [url, setUrl] = useState('');
  const [targetRoles, setTargetRoles] = useState<string[]>([]);
  const [targetUserIDs, setTargetUserIDs] = useState<number[]>([]);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !message) {
      return;
    }
    
    if (targetRoles.length === 0 && targetUserIDs.length === 0) {
      return;
    }
    
    try {
      await sendNotification(title, message, url, targetRoles, targetUserIDs);
      setSuccessMessage('Notification sent successfully!');
      
      // Reset form after successful submission
      setTitle('');
      setMessage('');
      setUrl('');
      setTargetRoles([]);
      setTargetUserIDs([]);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      console.error('Error sending notification:', err);
    }
  };
  
  // Handle role checkbox change
  const handleRoleChange = (role: string) => {
    setTargetRoles(prev => 
      prev.includes(role)
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };
  
  // Handle user selection change
  const handleUserChange = (userId: number) => {
    setTargetUserIDs(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };
  
  return (
    <div className={`p-4 bg-white rounded-lg shadow ${className}`}>
      <h2 className="text-xl font-semibold mb-4">Send Notification</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1" htmlFor="title">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="Notification Title"
            required
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1" htmlFor="message">
            Message <span className="text-red-500">*</span>
          </label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="Notification Message"
            rows={3}
            required
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1" htmlFor="url">
            URL (Optional)
          </label>
          <input
            id="url"
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="https://example.com/page"
          />
        </div>
        
        <div className="mb-4">
          <p className="block text-sm font-medium mb-2">
            Target Recipients <span className="text-red-500">*</span>
          </p>
          
          <div className="mb-3">
            <p className="text-sm font-medium mb-1">Roles:</p>
            <div className="flex flex-wrap gap-3">
              {allowedRoles.map(role => (
                <label key={role} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={targetRoles.includes(role)}
                    onChange={() => handleRoleChange(role)}
                    className="mr-1"
                  />
                  <span className="capitalize">{role}</span>
                </label>
              ))}
            </div>
          </div>
          
          {users.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-1">Specific Users:</p>
              <div className="max-h-40 overflow-y-auto border rounded-md p-2">
                {users.map(user => (
                  <label key={user.id} className="flex items-center mb-1">
                    <input
                      type="checkbox"
                      checked={targetUserIDs.includes(user.id)}
                      onChange={() => handleUserChange(user.id)}
                      className="mr-1"
                    />
                    <span>{user.name} ({user.role})</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          
          {targetRoles.length === 0 && targetUserIDs.length === 0 && (
            <p className="text-sm text-red-500 mt-1">
              Select at least one target role or user
            </p>
          )}
        </div>
        
        <button
          type="submit"
          disabled={isLoading || !title || !message || (targetRoles.length === 0 && targetUserIDs.length === 0)}
          className={`px-4 py-2 rounded-md ${
            isLoading || !title || !message || (targetRoles.length === 0 && targetUserIDs.length === 0)
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {isLoading ? 'Sending...' : 'Send Notification'}
        </button>
      </form>
      
      {error && (
        <p className="text-red-500 text-sm mt-3">{error}</p>
      )}
      
      {successMessage && (
        <p className="text-green-500 text-sm mt-3">{successMessage}</p>
      )}
    </div>
  );
};

export default NotificationSender;