"use client";

import { useState } from "react";
import { useRoleProtection } from "@/app/hooks/useRoleProtection";
import { useAuth } from "@/app/contexts/AuthContext";
import { useNotification } from "@/app/contexts/NotificationContext";

export default function ManagementDashboard() {
  // Protect this page for management role only
  const { loading } = useRoleProtection(["management"]);
  const { user, logout } = useAuth();
  const { sendNotification, isLoading: isNotificationLoading, error: notificationError } = useNotification();
  
  // State untuk form notifikasi
  const [showNotificationForm, setShowNotificationForm] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [url, setUrl] = useState('');
  const [targetRoles, setTargetRoles] = useState<string[]>([]);
  const [targetUserIDsInput, setTargetUserIDsInput] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Roles yang tersedia
  const availableRoles = ['management', 'driver', 'planner'];
  
  // Handle form submission
  const handleSubmitNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !message) {
      return;
    }
    
    // Parse User IDs dari input text
    const targetUserIDs = targetUserIDsInput
      .split(',')
      .map(id => id.trim())
      .filter(id => id !== '')
      .map(id => parseInt(id, 10))
      .filter(id => !isNaN(id));
    
    if (targetRoles.length === 0 && targetUserIDs.length === 0) {
      alert('Pilih setidaknya satu target (role atau user ID)');
      return;
    }
    
    try {
      await sendNotification(title, message, url, targetRoles, targetUserIDs);
      setSuccessMessage('Notifikasi berhasil dikirim!');
      
      // Reset form after successful submission
      setTitle('');
      setMessage('');
      setUrl('');
      setTargetRoles([]);
      setTargetUserIDsInput('');
      
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
  
  // Toggle notification form
  const toggleNotificationForm = () => {
    setShowNotificationForm(prev => !prev);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Management Dashboard</h1>
        <div className="flex items-center gap-4">
          <span>Welcome, {user?.name}</span>
          <button 
            onClick={logout}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      </div>
      
      {/* Notification Section */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Notifikasi</h2>
          <button 
            onClick={toggleNotificationForm}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            {showNotificationForm ? 'Tutup Form' : 'Kirim Notifikasi'}
          </button>
        </div>
        
        {showNotificationForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-medium mb-4">Kirim Notifikasi</h3>
            
            <form onSubmit={handleSubmitNotification}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1" htmlFor="title">
                  Judul <span className="text-red-500">*</span>
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Judul notifikasi"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1" htmlFor="message">
                  Pesan <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Pesan notifikasi"
                  rows={3}
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1" htmlFor="url">
                  URL (Opsional)
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
                  Target Penerima <span className="text-red-500">*</span>
                </p>
                
                <div className="mb-3">
                  <p className="text-sm font-medium mb-1">Roles:</p>
                  <div className="flex flex-wrap gap-3">
                    {availableRoles.map(role => (
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
                
                <div className="mb-3">
                  <p className="text-sm font-medium mb-1">User IDs (pisahkan dengan koma):</p>
                  <input
                    type="text"
                    value={targetUserIDsInput}
                    onChange={(e) => setTargetUserIDsInput(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="1, 2, 3, 4"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Contoh: 1, 2, 3, 4
                  </p>
                </div>
                
                {targetRoles.length === 0 && !targetUserIDsInput && (
                  <p className="text-sm text-red-500 mt-1">
                    Pilih setidaknya satu target role atau masukkan User IDs
                  </p>
                )}
              </div>
              
              <button
                type="submit"
                disabled={isNotificationLoading || !title || !message || (targetRoles.length === 0 && !targetUserIDsInput)}
                className={`px-4 py-2 rounded-md ${
                  isNotificationLoading || !title || !message || (targetRoles.length === 0 && !targetUserIDsInput)
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                {isNotificationLoading ? 'Mengirim...' : 'Kirim Notifikasi'}
              </button>
            </form>
            
            {notificationError && (
              <p className="text-red-500 text-sm mt-3">{notificationError}</p>
            )}
            
            {successMessage && (
              <p className="text-green-500 text-sm mt-3">{successMessage}</p>
            )}
          </div>
        )}
      </div>
      
      {/* Tambahkan konten dashboard lainnya di sini */}
    </div>
  );
}