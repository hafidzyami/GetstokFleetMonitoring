"use client";

import { useEffect, useState } from "react";
import { MapPin, Truck, User, Filter } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

// Type definitions
export type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at: string;
  updated_at: string;
};

type Waypoint = {
  id: number;
  latitude: number;
  longitude: number;
  address: string;
  order: number;
};

type RoutePlan = {
  id: number;
  driver_name: string;
  vehicle_plate: string;
  planner_name: string;
  status: string;
  waypoints: Waypoint[];
  created_at: string;
  updated_at: string;
};

type ApiResponse = {
  apiVersion: string;
  data: RoutePlan[];
};

export default function DriverRouteList() {
  const [routePlans, setRoutePlans] = useState<RoutePlan[]>([]);
  const [filteredRoutePlans, setFilteredRoutePlans] = useState<RoutePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // Status options for filtering
  const statusOptions = [
    { value: "all", label: "All Routes" },
    { value: "planned", label: "Planned" },
    { value: "active", label: "On Going" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" }
  ];

  useEffect(() => {
    // Get user data from localStorage
    const userString = localStorage.getItem("user");
    if (userString) {
      try {
        const userData = JSON.parse(userString) as User;
        setUser(userData);
      } catch (err) {
        console.error("Failed to parse user data:", err);
        setError("Failed to load user data");
      }
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchRoutePlans = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("Authentication token not found");
        }

        // Fetch route plans
        const response = await fetch(`/api/v1/route-plans/driver/${user.id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data: ApiResponse = await response.json();
        setRoutePlans(data.data || []);
        setFilteredRoutePlans(data.data || []);
      } catch (err) {
        console.error("Error fetching route plans:", err);
        setError(err instanceof Error ? err.message : "Failed to load route plans");
      } finally {
        setLoading(false);
      }
    };

    fetchRoutePlans();
  }, [user]);

  // Apply filter when activeFilter changes
  useEffect(() => {
    if (activeFilter === "all") {
      setFilteredRoutePlans(routePlans);
    } else {
      setFilteredRoutePlans(
        routePlans.filter(route => route.status.toLowerCase() === activeFilter)
      );
    }
  }, [activeFilter, routePlans]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-green-500";
      case "completed":
        return "bg-blue-500";
      case "cancelled":
        return "bg-red-500";
      default:
        return "bg-yellow-500"; // 'planned' status
    }
  };

  const handleFilterChange = (status: string) => {
    setActiveFilter(status);
    setShowFilterDropdown(false);
  };

  if (error) {
    return (
      <div className="container mx-auto p-4 max-w-6xl">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-red-700">Error</h2>
            <p className="text-red-600 mt-2">{error}</p>
            <button 
              className="mt-4 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100"
              onClick={() => window.location.reload()}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold">My Route Plans</h1>
        <p className="text-gray-500 text-sm md:text-base">View all your assigned routes</p>
      </div>

      {/* Filter Controls */}
      <div className="mb-6 relative">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div className="text-sm md:text-base text-gray-700">
            {filteredRoutePlans.length} {filteredRoutePlans.length === 1 ? 'route' : 'routes'} found
          </div>
          
          <div className="relative">
            <button
              className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50"
              onClick={() => setShowFilterDropdown(prev => !prev)}
            >
              <Filter className="h-4 w-4" />
              <span>{statusOptions.find(option => option.value === activeFilter)?.label || 'Filter'}</span>
            </button>
            
            {showFilterDropdown && (
              <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                <div className="py-1">
                  {statusOptions.map(option => (
                    <button
                      key={option.value}
                      className={`w-full text-left px-4 py-2 text-sm ${
                        activeFilter === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100'
                      }`}
                      onClick={() => handleFilterChange(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        // Loading skeletons
        <div className="bg-white border rounded-lg overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="border-b last:border-b-0 p-4">
              <div className="animate-pulse">
                <div className="flex justify-between">
                  <div className="h-5 w-32 bg-gray-200 rounded"></div>
                  <div className="h-5 w-20 bg-gray-200 rounded"></div>
                </div>
                <div className="h-4 w-1/4 bg-gray-200 rounded mt-2"></div>
                <div className="flex gap-4 mt-3">
                  <div className="h-4 w-1/3 bg-gray-200 rounded"></div>
                  <div className="h-4 w-1/3 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredRoutePlans.length === 0 ? (
        // Empty state
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <Truck className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-3 text-lg font-medium text-gray-900">No routes found</h3>
          {activeFilter !== "all" ? (
            <>
              <p className="mt-1 text-gray-500">No {activeFilter} routes found.</p>
              <button
                onClick={() => setActiveFilter("all")}
                className="mt-3 text-blue-500 hover:text-blue-700 font-medium"
              >
                View all routes
              </button>
            </>
          ) : (
            <p className="mt-1 text-gray-500">You don't have any assigned routes at the moment.</p>
          )}
        </div>
      ) : (
        // Route plans list
        <div className="bg-white border rounded-lg overflow-hidden">
          {filteredRoutePlans.map((route, index) => (
            <div 
              key={route.id} 
              className={`p-4 hover:bg-gray-50 transition-colors duration-200 ${
                index !== filteredRoutePlans.length - 1 ? 'border-b' : ''
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-medium">Route #{route.id}</h3>
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full text-white ${getStatusColor(route.status)}`}>
                    {route.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {format(new Date(route.created_at), "PPP")}
                </p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <span className="text-xs md:text-sm truncate">{route.vehicle_plate}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <span className="text-xs md:text-sm truncate">Planned by: {route.planner_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <span className="text-xs md:text-sm truncate">
                    {route.waypoints.length} {route.waypoints.length === 1 ? 'point' : 'points'}
                  </span>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Link href={`route-list/${route.id}`}>
                  <button className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-1.5 px-3 text-xs rounded transition-colors duration-200">
                    View Details
                  </button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}