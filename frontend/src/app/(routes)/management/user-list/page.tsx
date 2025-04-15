"use client";
import React, { useState, useEffect } from "react";
import "boxicons/css/boxicons.min.css";
import Image from "next/image";
import { useRouter } from "next/navigation";

// Define TypeScript interfaces
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

interface ApiResponse<T> {
  data?: T;
  error?: {
    message: string;
  };
}

const UserManagementPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [isOpen, setIsOpen] = useState({
    inputData: false,
    konfirmasi: false,
    notifikasiBerhasil: false,
    resetPassword: false,
  });
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "planner",
  });
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Fetch users only once on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  // Filter users when search term or selected role changes
  useEffect(() => {
    filterUsers();
  }, [searchTerm, selectedRole, users]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      // Get token from local storage or wherever it's stored
      const token = localStorage.getItem("token");
      
      const response = await fetch(`/api/v1/users`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      
      const result = await response.json() as ApiResponse<User[]>;
      
      if (response.ok) {
        setUsers(result.data || []);
        // Initial filtering will be handled by useEffect
      } else {
        console.error("Failed to fetch users:", result.error?.message);
      }
    } catch (error) {
      console.error("Error fetching users:", error instanceof Error ? error.message : "Unknown error");
    }
    setIsLoading(false);
  };

  const filterUsers = () => {
    let filtered = [...users];
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filter by role
    if (selectedRole) {
      filtered = filtered.filter(
        (user) => user.role.toLowerCase() === selectedRole.toLowerCase()
      );
    }
    
    setFilteredUsers(filtered);
  };

  const handleAddUser = async () => {
    try {
      const token = localStorage.getItem("token");
      
      const response = await fetch(`/api/v1/auth/register`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newUser.name,
          email: newUser.email,
          role: newUser.role.toLowerCase(),
        }),
      });
      
      const result = await response.json() as ApiResponse<User>;
      
      if (response.ok) {
        // Close input modal and show success modal
        setIsOpen({
          ...isOpen,
          inputData: false,
          konfirmasi: false,
          notifikasiBerhasil: true,
        });
        
        // Refresh user list
        fetchUsers();
      } else {
        console.error("Failed to add user:", result.error?.message);
        alert(`Failed to add user: ${result.error?.message || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error adding user:", error instanceof Error ? error.message : "Unknown error");
      alert(`Error adding user: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser) return;
    
    try {
      const token = localStorage.getItem("token");
      
      const response = await fetch(`/api/v1/users/reset-password`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: selectedUser.id,
        }),
      });
      
      const result = await response.json() as ApiResponse<any>;
      
      if (response.ok) {
        alert("Password reset successful. Default password is 'password123'");
        setIsOpen({ ...isOpen, resetPassword: false });
      } else {
        console.error("Failed to reset password:", result.error?.message);
        alert(`Failed to reset password: ${result.error?.message || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error resetting password:", error instanceof Error ? error.message : "Unknown error");
      alert(`Error resetting password: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  // Function to clear filters
  const handleClearFilter = () => {
    setSelectedRole("");
    setSearchTerm("");
  };

  // Function to capitalize first letter for display
  const capitalizeFirstLetter = (string: string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  return (
    <div className="h-full pt-[12%] px-4 sm:px-8">
      {/* Header */}
      <div className="bg-white w-full justify-between flex items-center flex-wrap gap-4 sm:gap-0 mt-10 sm:mt-0">
        <label className="relative px-4 py-2 sm:px-6 sm:py-3 rounded-[8px] border border-[#F1F1F1] flex items-center gap-2 w-full sm:w-auto">
          <i className="bx bx-search text-xl sm:text-2xl text-[#009EFF]"></i>
          <input
            type="text"
            className="w-full outline-none text-sm sm:text-base"
            placeholder="Cari User"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="text-gray-500 hover:text-red-500"
            >
              <i className="bx bx-x text-xl"></i>
            </button>
          )}
        </label>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-grow">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="text-sm px-4 py-2 border border-[#F1F1F1] rounded-[8px] outline-none w-full appearance-none pr-8"
            >
              <option value="">Semua Role</option>
              <option value="driver">Driver</option>
              <option value="planner">Planner</option>
              <option value="management">Management</option>
            </select>
            {selectedRole && (
              <button 
                onClick={() => setSelectedRole('')}
                className="absolute right-2 top-2 text-gray-500 hover:text-red-500"
              >
                <i className="bx bx-x text-xl"></i>
              </button>
            )}
          </div>
          
          <button
            onClick={() => setIsOpen({ ...isOpen, inputData: true })}
            className="bg-[#009EFF] flex gap-2 text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-[8px] font-bold w-full sm:w-auto justify-center"
          >
            <i className="bx bx-user-plus text-xl sm:text-2xl"></i>
            <span className="text-sm sm:text-base">Tambah User Baru</span>
          </button>
        </div>
      </div>

      {/* Filter status indicator */}
      {(selectedRole || searchTerm) && (
        <div className="mt-2 flex items-center text-sm text-[#009EFF]">
          <i className="bx bx-filter mr-1"></i>
          <span>
            {selectedRole && `Role: ${capitalizeFirstLetter(selectedRole)}`}
            {selectedRole && searchTerm && ' • '}
            {searchTerm && `Pencarian: "${searchTerm}"`}
          </span>
          {(selectedRole || searchTerm) && (
            <button 
              onClick={handleClearFilter}
              className="ml-2 text-[#009EFF] hover:underline text-xs"
            >
              Hapus filter
            </button>
          )}
        </div>
      )}

      {/* List */}
      <div className="w-full mt-3 flex flex-col gap-3 h-[450px] overflow-y-auto">
        {isLoading ? (
          // Loading skeleton
          Array.from({ length: 5 }).map((_, index) => (
            <div
              key={`skeleton-${index}`}
              className="px-4 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center sm:gap-5 bg-[#F5F5F5] rounded-[8px] animate-pulse"
            >
              <div className="flex items-center gap-3 sm:w-12">
                <div className="h-8 w-8 rounded-full bg-gray-300"></div>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 w-full text-xs sm:text-sm mt-2 sm:mt-0">
                <div className="flex flex-col items-center sm:w-16">
                  <div className="h-4 w-4 bg-gray-300 rounded mb-1"></div>
                  <div className="h-4 w-6 bg-gray-300 rounded"></div>
                </div>
                
                <div className="hidden sm:flex flex-col items-center sm:w-40">
                  <div className="h-4 w-12 bg-gray-300 rounded mb-1"></div>
                  <div className="h-4 w-24 bg-gray-300 rounded"></div>
                </div>
                
                <div className="hidden sm:flex flex-col items-center sm:w-48">
                  <div className="h-4 w-12 bg-gray-300 rounded mb-1"></div>
                  <div className="h-4 w-32 bg-gray-300 rounded"></div>
                </div>
                
                <div className="flex flex-col items-center sm:w-24">
                  <div className="h-4 w-8 bg-gray-300 rounded mb-1"></div>
                  <div className="h-4 w-16 bg-gray-300 rounded"></div>
                </div>
                
                <div className="flex flex-col items-center sm:w-24">
                  <div className="h-4 w-12 bg-gray-300 rounded mb-1"></div>
                  <div className="h-4 w-20 bg-gray-300 rounded"></div>
                </div>
              </div>

              <div className="mt-3 sm:mt-0 ml-auto">
                <div className="h-8 w-24 bg-gray-300 rounded"></div>
              </div>
            </div>
          ))
        ) : filteredUsers.length === 0 ? (
          <div className="flex justify-center items-center h-32 bg-gray-50 rounded-lg">
            <div className="text-center">
              <i className="bx bx-search-alt text-4xl text-gray-400"></i>
              <p className="mt-2 text-gray-500">Tidak ada data user</p>
              {(selectedRole || searchTerm) && (
                <button 
                  onClick={handleClearFilter}
                  className="mt-2 text-[#009EFF] hover:underline"
                >
                  Hapus filter
                </button>
              )}
            </div>
          </div>
        ) : (
          filteredUsers.map((user, index) => (
            <div
              key={user.id}
              className="px-4 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center sm:gap-5 bg-[#E6F5FF] rounded-[8px]"
            >
              <div className="flex items-center gap-3 sm:w-12">
                <i className="bx bx-user text-xl text-white rounded-full bg-[#009EFF] p-2"></i>
                <div className="text-sm sm:hidden">
                  <p className="font-semibold">{user.name}</p>
                  <p className="text-[#707070]">{user.email}</p>
                </div>
              </div>

              {/* Fixed-width columns for better alignment */}
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 w-full text-xs sm:text-sm mt-2 sm:mt-0">
                <div className="flex flex-col items-center sm:w-16">
                  <span className="font-medium">No</span>
                  <p className="text-[#707070]">{index + 1}</p>
                </div>
                
                <div className="hidden sm:flex flex-col items-center sm:w-40">
                  <span className="font-medium">Nama</span>
                  <p className="text-[#707070] text-center">{user.name}</p>
                </div>
                
                <div className="hidden sm:flex flex-col items-center sm:w-48">
                  <span className="font-medium">Email</span>
                  <p className="text-[#707070] text-center overflow-hidden text-ellipsis">{user.email}</p>
                </div>
                
                <div className="flex flex-col items-center sm:w-24">
                  <span className="font-medium">Role</span>
                  <p className="text-[#707070]">
                    {capitalizeFirstLetter(user.role)}
                  </p>
                </div>
                
                <div className="flex flex-col items-center sm:w-24">
                  <span className="font-medium">Created</span>
                  <p className="text-[#707070]">
                    {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="mt-3 sm:mt-0 ml-auto">
                <button
                  onClick={() => {
                    setSelectedUser(user);
                    setIsOpen({ ...isOpen, resetPassword: true });
                  }}
                  className="px-3 py-2 rounded-[8px] text-sm flex justify-center items-center w-full sm:w-auto bg-[#FFA500] text-white font-semibold"
                >
                  Reset Password
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add User Modal */}
      {isOpen.inputData && (
        <>
          <div
            className="fixed inset-0 backdrop-blur-sm z-40"
            onClick={() => setIsOpen({ ...isOpen, inputData: false })}
          ></div>

          <div
            className="bg-white w-[90%] sm:w-[354px] fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[8px] gap-6 flex flex-col items-center p-6 z-50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-2 items-center">
              <Image
                src={"/image/logo.png"}
                alt="Logo"
                width={134}
                height={134}
              />
              <p className="text-xl sm:text-2xl font-semibold text-[#009EFF]">
                Tambah User Baru
              </p>
              <p className="text-sm text-[#707070] text-center">
                Isi detail user baru
              </p>
            </div>

            {/* Nama */}
            <div className="flex flex-col gap-1 w-full text-[#545454] font-semibold">
              <div className="flex gap-2 text-sm items-center">
                <i className="bx bx-user text-xl"></i>
                <p>Nama</p>
              </div>
              <input
                type="text"
                placeholder="Input nama"
                className="text-sm px-4 py-2 border border-[#F1F1F1] rounded-[8px]"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              />
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1 w-full text-[#545454] font-semibold">
              <div className="flex gap-2 text-sm items-center">
                <i className="bx bx-mail-send text-xl"></i>
                <p>Email</p>
              </div>
              <input
                type="email"
                placeholder="Input email"
                className="text-sm px-4 py-2 border border-[#F1F1F1] rounded-[8px]"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              />
            </div>

            {/* Role Dropdown */}
            <div className="flex flex-col gap-1 w-full text-[#545454] font-semibold">
              <div className="flex gap-2 text-sm items-center">
                <i className="bx bx-user-circle text-xl"></i>
                <p>Role</p>
              </div>
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                className="text-sm px-4 py-2 border border-[#F1F1F1] rounded-[8px]"
              >
                <option value="driver">Driver</option>
                <option value="planner">Planner</option>
                <option value="management">Management</option>
              </select>
            </div>

            <button
              onClick={() =>
                setIsOpen({ ...isOpen, konfirmasi: true, inputData: false })
              }
              className="bg-[#009EFF] w-full py-2 rounded-[8px] text-white font-semibold"
            >
              Tambah user baru
            </button>
          </div>
        </>
      )}

      {/* Confirmation Modal */}
      {isOpen.konfirmasi && (
        <>
          <div
            className="fixed inset-0 backdrop-blur-sm z-40"
            onClick={() => setIsOpen({ ...isOpen, konfirmasi: false })}
          ></div>

          <div
            className="bg-white w-[90%] sm:w-[354px] fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[8px] gap-6 flex flex-col items-center p-6 z-50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-2 items-center">
              <Image
                src={"/image/logo.png"}
                alt="Logo"
                width={134}
                height={134}
              />
              <p className="text-xl sm:text-2xl font-semibold text-[#009EFF]">
                Konfirmasi
              </p>
              <p className="text-sm text-[#707070] text-center">
                Apakah Anda yakin ingin menambahkan user baru?
              </p>
              <p className="text-sm font-bold text-center">
                {newUser.name} - {newUser.email} ({capitalizeFirstLetter(newUser.role)})
              </p>
              <p className="text-sm text-[#707070] text-center mt-2">
                Password default: password123
              </p>
            </div>

            <button
              onClick={handleAddUser}
              className="bg-[#008EE6] w-full py-2 rounded-[8px] text-white font-semibold"
            >
              Ya, Tambah User
            </button>
            
            <button
              onClick={() => setIsOpen({ ...isOpen, konfirmasi: false })}
              className="border border-[#008EE6] text-[#008EE6] w-full py-2 rounded-[8px] font-semibold"
            >
              Batal
            </button>
          </div>
        </>
      )}

      {/* Success Notification Modal */}
      {isOpen.notifikasiBerhasil && (
        <>
          <div
            className="fixed inset-0 backdrop-blur-sm z-40"
            onClick={() => setIsOpen({ ...isOpen, notifikasiBerhasil: false })}
          ></div>

          <div
            className="bg-white w-[90%] sm:w-[354px] fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[8px] gap-1 flex flex-col p-6 z-50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex gap-2 items-center font-semibold text-[#009EFF]">
              <i className="bx bx-check text-2xl"></i>
              Berhasil
            </div>
            <p className="text-sm text-[#707070]">
              Pengguna baru berhasil ditambahkan
            </p>

            <div className="flex gap-3 items-center justify-center mt-3">
              <button
                onClick={() => router.push("/management/dashboard")}
                className="border-[#008EE6] text-[#008EE6] border flex-1 w-full py-2 rounded-[8px] font-semibold"
              >
                Dashboard
              </button>
              <button
                onClick={() =>
                  setIsOpen({
                    ...isOpen,
                    notifikasiBerhasil: false,
                  })
                }
                className="bg-[#008EE6] flex-1 w-full py-2 rounded-[8px] text-white font-semibold"
              >
                Lihat List
              </button>
            </div>
          </div>
        </>
      )}

      {/* Reset Password Modal */}
      {isOpen.resetPassword && selectedUser && (
        <>
          <div
            className="fixed inset-0 backdrop-blur-sm z-40"
            onClick={() => setIsOpen({ ...isOpen, resetPassword: false })}
          ></div>

          <div
            className="bg-white w-[90%] sm:w-[354px] fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[8px] gap-6 flex flex-col items-center p-6 z-50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-2 items-center">
              <i className="bx bx-key text-4xl text-[#009EFF]"></i>
              <p className="text-xl sm:text-2xl font-semibold text-[#009EFF]">
                Reset Password
              </p>
              <p className="text-sm text-[#707070] text-center">
                Apakah Anda yakin ingin mereset password untuk:
              </p>
              <p className="text-sm font-bold text-center">
                {selectedUser.name} - {selectedUser.email}
              </p>
              <p className="text-sm text-[#707070] text-center mt-2">
                Password akan direset menjadi: <span className="font-bold">password123</span>
              </p>
            </div>

            <button
              onClick={handleResetPassword}
              className="bg-[#008EE6] w-full py-2 rounded-[8px] text-white font-semibold"
            >
              Ya, Reset Password
            </button>
            
            <button
              onClick={() => setIsOpen({ ...isOpen, resetPassword: false })}
              className="border border-[#008EE6] text-[#008EE6] w-full py-2 rounded-[8px] font-semibold"
            >
              Batal
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default UserManagementPage;