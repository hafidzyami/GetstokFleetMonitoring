// src/app/(routes)/management/page.tsx
"use client";

import { useRoleProtection } from "@/app/hooks/useRoleProtection";
import { useAuth } from "@/app/contexts/AuthContext";

export default function ManagementDashboard() {
  // Protect this page for management role only
  const { loading } = useRoleProtection(["management"]);
  const { user, logout } = useAuth();

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
      
      {/* Dashboard content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Users</h2>
          <p className="text-3xl font-bold">42</p>
        </div>
        {/* More dashboard cards */}
      </div>
    </div>
  );
}