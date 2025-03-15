"use client";

const API_URL = "http://172.20.10.5:8080/api/v1";

interface FetchOptions extends RequestInit {
  requireAuth?: boolean;
}

export async function apiFetch(
  endpoint: string,
  options: FetchOptions = {}
) {
  const { requireAuth = true, ...fetchOptions } = options;
  const url = `${API_URL}${endpoint}`;

  // Set default headers
  const headers = new Headers(fetchOptions.headers || {});
  
  if (!headers.has("Content-Type") && !(fetchOptions.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  
  // Add auth token if required
  if (requireAuth) {
    const token = localStorage.getItem("token");
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  // Prepare request options
  const requestOptions: RequestInit = {
    ...fetchOptions,
    headers,
  };

  // Make the request
  const response = await fetch(url, requestOptions);
  
  // Parse response
  const data = await response.json();
  
  // Handle error responses
  if (!response.ok) {
    // Handle 401 - Unauthorized (expired token)
    if (response.status === 401 && requireAuth) {
      // Clear local storage
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      
      // Redirect to login
      window.location.href = "/login";
    }
    
    throw new Error(data.error?.message || "An error occurred");
  }
  
  return data;
}

// Utility methods for common operations
export const api = {
  get: (endpoint: string, options?: FetchOptions) => 
    apiFetch(endpoint, { method: "GET", ...options }),
    
  post: (endpoint: string, data: any, options?: FetchOptions) => 
    apiFetch(endpoint, { 
      method: "POST", 
      body: JSON.stringify(data), 
      ...options 
    }),
    
  put: (endpoint: string, data: any, options?: FetchOptions) => 
    apiFetch(endpoint, { 
      method: "PUT", 
      body: JSON.stringify(data), 
      ...options 
    }),
    
  delete: (endpoint: string, options?: FetchOptions) => 
    apiFetch(endpoint, { method: "DELETE", ...options }),
};