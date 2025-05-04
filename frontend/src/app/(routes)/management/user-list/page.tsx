"use client";

import "boxicons/css/boxicons.min.css";

import React, { useEffect, useState } from "react";

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

			const result = (await response.json()) as ApiResponse<User[]>;

			if (response.ok) {
				setUsers(result.data || []);
				// Initial filtering will be handled by useEffect
			} else {
				console.error("Failed to fetch users:", result.error?.message);
			}
		} catch (error) {
			console.error(
				"Error fetching users:",
				error instanceof Error ? error.message : "Unknown error"
			);
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

			const result = (await response.json()) as ApiResponse<User>;

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
				alert(
					`Failed to add user: ${result.error?.message || "Unknown error"}`
				);
			}
		} catch (error) {
			console.error(
				"Error adding user:",
				error instanceof Error ? error.message : "Unknown error"
			);
			alert(
				`Error adding user: ${
					error instanceof Error ? error.message : "Unknown error"
				}`
			);
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

			const result = (await response.json()) as ApiResponse<any>;

			if (response.ok) {
				alert(
					"Password reset successful. Default password is 'password123'"
				);
				setIsOpen({ ...isOpen, resetPassword: false });
			} else {
				console.error("Failed to reset password:", result.error?.message);
				alert(
					`Failed to reset password: ${
						result.error?.message || "Unknown error"
					}`
				);
			}
		} catch (error) {
			console.error(
				"Error resetting password:",
				error instanceof Error ? error.message : "Unknown error"
			);
			alert(
				`Error resetting password: ${
					error instanceof Error ? error.message : "Unknown error"
				}`
			);
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
		<div className="h-full">
			{/* Header */}
			<div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center">
				<label className="bg-white relative px-4 py-2 sm:px-5 sm:py-3 rounded-lg border border-gray-200 flex items-center gap-3 w-full sm:w-auto flex-grow shadow-sm hover:shadow-md transition-shadow">
					<i className="bx bx-search text-xl text-[#009EFF]"></i>
					<input
						type="text"
						className="w-full outline-none text-sm sm:text-base placeholder-gray-400"
						placeholder="Cari User"
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
					/>
					{searchTerm && (
						<button
							onClick={() => setSearchTerm("")}
							className="text-gray-400 hover:text-red-500 transition-colors"
						>
							<i className="bx bx-x text-xl"></i>
						</button>
					)}
				</label>

				<div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto sm:items-center">
					{/* Type Filter */}
					<div className="relative w-full sm:w-[180px]">
						<select
							value={selectedRole}
							onChange={(e) => setSelectedRole(e.target.value)}
							className="text-sm px-4 py-3 border border-gray-200 rounded-lg outline-none w-full appearance-none bg-white shadow-sm hover:shadow-md transition-shadow pr-8"
						>
							<option value="">Semua Role</option>
							<option value="driver">Driver</option>
							<option value="planner">Planner</option>
							<option value="management">Management</option>
						</select>
						{selectedRole && (
							<button
								onClick={() => setSelectedRole("")}
								className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
							>
								<i className="bx bx-x text-xl"></i>
							</button>
						)}
					</div>

					{/* Mobile Filter Indicator */}
					{(selectedRole || searchTerm) && (
						<div className="sm:hidden flex items-center bg-blue-50 px-3 py-2 rounded-lg text-sm text-[#009EFF]">
							<i className="bx bx-filter-alt mr-2"></i>
							<div className="flex-1">
								{selectedRole && (
									<span className="font-medium">
										Role: {capitalizeFirstLetter(selectedRole)}
									</span>
								)}
								{selectedRole && searchTerm && (
									<span className="mx-2">•</span>
								)}
								{searchTerm && (
									<span className="font-medium">
										Pencarian: &quot;{searchTerm}&quot;
									</span>
								)}
							</div>
							<button
								onClick={handleClearFilter}
								className="text-[#009EFF] hover:underline font-medium text-xs ml-2"
							>
								Hapus
							</button>
						</div>
					)}

					<button
						onClick={() => setIsOpen({ ...isOpen, inputData: true })}
            className="bg-[#009EFF] hover:bg-[#0085D0] transition-colors flex gap-2 items-center justify-center text-white px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg font-semibold shadow-md hover:shadow-lg w-full sm:w-auto"
						>
							<i className="bx bx-plus-circle text-xl"></i>
							<span className="text-sm sm:text-base">Tambah User Baru</span>
					</button>
				</div>
			</div>

      {/* Filter status indicator tab */}
			{(selectedRole || searchTerm) && (
				<div className="mt-2 hidden sm:flex items-center text-sm text-[#009EFF]">
					<i className="bx bx-filter mr-1"></i>
					<span>
						{selectedRole &&
							`Role: ${capitalizeFirstLetter(selectedRole)}`}
						{selectedRole && searchTerm && " • "}
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
			<div className="w-full mt-3">
  {isLoading ? (
    // Loading skeleton
    <div className="flex flex-col gap-3 h-[450px] overflow-y-auto pr-2">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={`skeleton-${index}`}
          className="px-4 py-4 flex items-start sm:items-center gap-4 bg-gray-100 rounded-lg animate-pulse"
        >
          <div className="h-10 w-10 rounded-full bg-gray-300"></div>
          
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="space-y-2">
              <div className="h-4 w-16 bg-gray-300 rounded"></div>
              <div className="h-4 w-24 bg-gray-300 rounded"></div>
            </div>
            
            <div className="space-y-2 hidden sm:block">
              <div className="h-4 w-20 bg-gray-300 rounded"></div>
              <div className="h-4 w-32 bg-gray-300 rounded"></div>
            </div>
            
            <div className="space-y-2 hidden sm:block">
              <div className="h-4 w-20 bg-gray-300 rounded"></div>
              <div className="h-4 w-40 bg-gray-300 rounded"></div>
            </div>
            
            <div className="space-y-2">
              <div className="h-4 w-16 bg-gray-300 rounded"></div>
              <div className="h-4 w-24 bg-gray-300 rounded"></div>
            </div>
            
            <div className="space-y-2">
              <div className="h-4 w-20 bg-gray-300 rounded"></div>
              <div className="h-4 w-24 bg-gray-300 rounded"></div>
            </div>
          </div>
          
          <div className="h-9 w-28 bg-gray-300 rounded-md"></div>
        </div>
      ))}
    </div>
  ) : filteredUsers.length === 0 ? (
    <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg border border-gray-200">
      <i className="bx bx-user-x text-4xl text-gray-400 mb-3"></i>
      <p className="text-gray-600 font-medium">Tidak ada data user</p>
      {(selectedRole || searchTerm) && (
        <button
          onClick={handleClearFilter}
          className="mt-3 px-4 py-2 text-sm text-white bg-[#009EFF] rounded-md hover:bg-blue-600 transition-colors"
        >
          Hapus filter
        </button>
      )}
    </div>
  ) : (
    <div className="flex flex-col gap-3 h-[650px] overflow-y-auto pr-2">
      {filteredUsers.map((user, index) => (
        <div
          key={user.id}
          className="px-4 py-4 flex items-start sm:items-center gap-4 bg-white rounded-lg border border-gray-200 hover:border-[#009EFF] transition-colors"
        >
          <div className="flex-shrink-0">
            <i className="bx bx-user text-xl text-white rounded-full bg-[#009EFF] p-2"></i>
          </div>
          
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-500">No</p>
              <p className="text-sm font-semibold">{index + 1}</p>
            </div>
            
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-500 sm:hidden">Info</p>
              <p className="text-xs font-medium text-gray-500 hidden sm:block">Nama</p>
              <p className="text-sm font-semibold sm:font-normal text-gray-700">
                {user.name}
              </p>
            </div>
            
            <div className="space-y-1 hidden sm:block">
              <p className="text-xs font-medium text-gray-500">Email</p>
              <p className="text-sm text-gray-700 truncate">{user.email}</p>
            </div>
            
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-500">Role</p>
              <p className="text-sm text-gray-700">
                {capitalizeFirstLetter(user.role)}
              </p>
            </div>
            
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-500">Created</p>
              <p className="text-sm text-gray-700">
                {new Date(user.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          
          <div className="flex-shrink-0">
            <button
              onClick={() => {
                setSelectedUser(user);
                setIsOpen({ ...isOpen, resetPassword: true });
              }}
              className="px-3 py-2 rounded-md text-sm flex items-center bg-[#FFA500] text-white font-medium hover:bg-orange-600 transition-colors"
            >
              Reset Password
            </button>
          </div>
        </div>
      ))}
    </div>
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
								onChange={(e) =>
									setNewUser({ ...newUser, name: e.target.value })
								}
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
								onChange={(e) =>
									setNewUser({ ...newUser, email: e.target.value })
								}
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
								onChange={(e) =>
									setNewUser({ ...newUser, role: e.target.value })
								}
								className="text-sm px-4 py-2 border border-[#F1F1F1] rounded-[8px]"
							>
								<option value="driver">Driver</option>
								<option value="planner">Planner</option>
								<option value="management">Management</option>
							</select>
						</div>

						<button
							onClick={() =>
								setIsOpen({
									...isOpen,
									konfirmasi: true,
									inputData: false,
								})
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
								{newUser.name} - {newUser.email} (
								{capitalizeFirstLetter(newUser.role)})
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
						onClick={() =>
							setIsOpen({ ...isOpen, notifikasiBerhasil: false })
						}
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
								Password akan direset menjadi:{" "}
								<span className="font-bold">password123</span>
							</p>
						</div>

						<button
							onClick={handleResetPassword}
							className="bg-[#008EE6] w-full py-2 rounded-[8px] text-white font-semibold"
						>
							Ya, Reset Password
						</button>

						<button
							onClick={() =>
								setIsOpen({ ...isOpen, resetPassword: false })
							}
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
