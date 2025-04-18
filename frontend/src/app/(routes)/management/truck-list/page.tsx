"use client";
import React, { useState, useEffect } from "react";
import "boxicons/css/boxicons.min.css";
import Image from "next/image";
import { useRouter } from "next/navigation";

// Define TypeScript interfaces
interface Truck {
  id: string;
  mac_id?: string;
  plate_number: string;
  truck_type?: string;
  type?: string;
  capacity?: number;
  status?: string;
  created_at?: string;
  updated_at?: string;
  latitude?: number;
  longitude?: number;
  fuel?: number;
  last_position?: string;
  last_fuel?: string;
}

interface ApiResponse<T> {
  data?: T;
  error?: {
    message: string;
  };
}

const TruckManagementPage = () => {
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [filteredTrucks, setFilteredTrucks] = useState<Truck[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [isOpen, setIsOpen] = useState({
    inputData: false,
    konfirmasi: false,
    notifikasiBerhasil: false,
    editData: false,
    konfirmasiEdit: false,
    notifikasiBerhasilEdit: false
  });
  const [newTruck, setNewTruck] = useState({
    mac_id: "",
    type: "container",
    plate_number: ""
  });
  const [editTruck, setEditTruck] = useState({
    id: "",
    mac_id: "",
    type: "",
    plate_number: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Fetch trucks only once on component mount
  useEffect(() => {
    fetchTrucks();
  }, []);

  // Filter trucks when search term or selected type changes
  useEffect(() => {
    filterTrucks();
  }, [searchTerm, selectedType, trucks]);

  const fetchTrucks = async () => {
    setIsLoading(true);
    try {
      // Get token from local storage or wherever it's stored
      const token = localStorage.getItem("token");
      
      const response = await fetch(`/api/v1/trucks`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      
      const result = await response.json() as ApiResponse<Truck[]>;
      
      if (response.ok) {
        // Ensure all received data is properly formatted
        const formattedTrucks = (result.data || []).map(truck => ({
          ...truck,
          // Handle API inconsistencies
          truck_type: truck.truck_type || truck.type,
          type: truck.type || truck.truck_type,
          // Ensure basic data is always present
          license_plate: truck.plate_number|| 'No Plate',
          status: truck.status || 'Unknown'
        }));
        
        setTrucks(formattedTrucks);
        // Initial filtering will be handled by useEffect
      } else {
        console.error("Failed to fetch trucks:", result.error?.message);
      }
    } catch (error) {
      console.error("Error fetching trucks:", error instanceof Error ? error.message : "Unknown error");
    }
    setIsLoading(false);
  };

  const handleAddTruck = async () => {
    try {
      const token = localStorage.getItem("token");
      
      const response = await fetch(`/api/v1/trucks`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mac_id: newTruck.mac_id,
          type: newTruck.type,
          plate_number: newTruck.plate_number,
        }),
      });
      
      const result = await response.json() as ApiResponse<Truck>;
      
      if (response.ok) {
        // Close input modal and show success modal
        setIsOpen({
          ...isOpen,
          inputData: false,
          konfirmasi: false,
          notifikasiBerhasil: true,
        });
        
        // Refresh truck list
        fetchTrucks();
      } else {
        console.error("Failed to add truck:", result.error?.message);
        alert(`Failed to add truck: ${result.error?.message || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error adding truck:", error instanceof Error ? error.message : "Unknown error");
      alert(`Error adding truck: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const filterTrucks = () => {
    let filtered = [...trucks];
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (truck) =>
          (truck.plate_number?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
          (truck.truck_type?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
          (truck.type?.toLowerCase() || '').includes(searchTerm.toLowerCase())
      );
    }
    
    // Filter by truck type
    if (selectedType) {
      filtered = filtered.filter(
        (truck) => 
          (truck.truck_type?.toLowerCase() || '') === selectedType.toLowerCase() ||
          (truck.type?.toLowerCase() || '') === selectedType.toLowerCase()
      );
    }
    
    setFilteredTrucks(filtered);
  };

  // Function to edit truck
  const handleEditTruck = (truck: Truck) => {
    setEditTruck({
      id: truck.id,
      mac_id: truck.mac_id || "",
      type: (truck.truck_type || truck.type || ""),
      plate_number: truck.plate_number || ""
    });
    setIsOpen({...isOpen, editData: true});
  };

  const handleUpdateTruck = async () => {
    try {
      const token = localStorage.getItem("token");
      
      const response = await fetch(`/api/v1/trucks/id/${editTruck.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mac_id: editTruck.mac_id,
          type: editTruck.type,
          plate_number: editTruck.plate_number,
        }),
      });
      
      const result = await response.json() as ApiResponse<any>;
      
      if (response.ok) {
        // Close edit modal and show success modal
        setIsOpen({
          ...isOpen,
          editData: false,
          konfirmasiEdit: false,
          notifikasiBerhasilEdit: true,
        });
        
        // Refresh truck list
        fetchTrucks();
      } else {
        console.error("Failed to update truck:", result.error?.message);
        alert(`Failed to update truck: ${result.error?.message || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error updating truck:", error instanceof Error ? error.message : "Unknown error");
      alert(`Error updating truck: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  // Function to clear filters
  const handleClearFilter = () => {
    setSelectedType("");
    setSearchTerm("");
  };

  // Function to capitalize first letter for display
  const capitalizeFirstLetter = (string: string | undefined | null) => {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  // Function to get status color
  const getStatusColor = (status: string | undefined | null) => {
    if (!status) return 'text-gray-600';
    
    switch (status.toLowerCase()) {
      case 'active':
        return 'text-green-600';
      case 'maintenance':
        return 'text-orange-500';
      case 'inactive':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="h-full pt-5 px-4 sm:px-8">
      {/* Header */}
      <div className="bg-white w-full justify-between flex items-center flex-wrap gap-4 sm:gap-0 mt-10 sm:mt-0">
        <label className="relative px-4 py-2 sm:px-6 sm:py-3 rounded-[8px] border border-[#F1F1F1] flex items-center gap-2 w-full sm:w-auto">
          <i className="bx bx-search text-xl sm:text-2xl text-[#009EFF]"></i>
          <input
            type="text"
            className="w-full outline-none text-sm sm:text-base"
            placeholder="Cari Truck"
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
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="text-sm px-4 py-2 border border-[#F1F1F1] rounded-[8px] outline-none w-full appearance-none pr-8"
            >
              <option value="">Semua Tipe</option>
              <option value="container">Container</option>
              <option value="box">Box</option>
              <option value="dump">Dump</option>
              <option value="trailer">Trailer</option>
            </select>
            {selectedType && (
              <button 
                onClick={() => setSelectedType('')}
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
            <i className="bx bx-plus-circle text-xl sm:text-2xl"></i>
            <span className="text-sm sm:text-base">Tambah Truck Baru</span>
          </button>
        </div>
      </div>

      {/* Filter status indicator */}
      {(selectedType || searchTerm) && (
        <div className="mt-2 flex items-center text-sm text-[#009EFF]">
          <i className="bx bx-filter mr-1"></i>
          <span>
            {selectedType && `Tipe: ${capitalizeFirstLetter(selectedType)}`}
            {selectedType && searchTerm && ' • '}
            {searchTerm && `Pencarian: "${searchTerm}"`}
          </span>
          {(selectedType || searchTerm) && (
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
        ) : filteredTrucks.length === 0 ? (
          <div className="flex justify-center items-center h-32 bg-gray-50 rounded-lg">
            <div className="text-center">
              <i className="bx bx-search-alt text-4xl text-gray-400"></i>
              <p className="mt-2 text-gray-500">Tidak ada data truck</p>
              {(selectedType || searchTerm) && (
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
          filteredTrucks.map((truck, index) => (
            <div
              key={truck.id}
              className="px-4 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center sm:gap-5 bg-[#E6F5FF] rounded-[8px]"
            >
              <div className="flex items-center gap-3 sm:w-12">
                <i className="bx bx-truck text-xl text-white rounded-full bg-[#009EFF] p-2"></i>
                <div className="text-sm sm:hidden">
                  <p className="font-semibold">{truck.plate_number|| 'No Plate'}</p>
                  <p className="text-[#707070]">{truck.truck_type || truck.type || 'Unknown'}</p>
                </div>
              </div>

              {/* Fixed-width columns for better alignment */}
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 w-full text-xs sm:text-sm mt-2 sm:mt-0">
                <div className="flex flex-col items-center sm:w-16">
                  <span className="font-medium">No</span>
                  <p className="text-[#707070]">{index + 1}</p>
                </div>

                <div className="hidden sm:flex flex-col items-center sm:w-40">
                  <span className="font-medium">MAC ID</span>
                  <p className="text-[#707070] text-center">{truck.mac_id}</p>
                </div>
                
                <div className="hidden sm:flex flex-col items-center sm:w-40">
                  <span className="font-medium">Plat Nomor</span>
                  <p className="text-[#707070] text-center">{truck.plate_number}</p>
                </div>
                
                <div className="hidden sm:flex flex-col items-center sm:w-48">
                  <span className="font-medium">Tipe</span>
                  <p className="text-[#707070] text-center">{capitalizeFirstLetter(truck.truck_type || truck.type || '')}</p>
                </div>
              </div>

              <div className="mt-3 sm:mt-0 ml-auto">
                <button
                  onClick={() => handleEditTruck(truck)}
                  className="px-3 py-2 rounded-[8px] text-sm flex justify-center items-center w-full sm:w-auto bg-[#FFA500] text-white font-semibold"
                >
                  <i className="bx bx-edit mr-1"></i> Edit
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Truck Modal */}
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
                Tambah Truck Baru
              </p>
              <p className="text-sm text-[#707070] text-center">
                Isi detail truck baru
              </p>
            </div>

            {/* MAC ID */}
            <div className="flex flex-col gap-1 w-full text-[#545454] font-semibold">
              <div className="flex gap-2 text-sm items-center">
                <i className="bx bx-chip text-xl"></i>
                <p>MAC ID</p>
              </div>
              <input
                type="text"
                placeholder="Input MAC ID"
                className="text-sm px-4 py-2 border border-[#F1F1F1] rounded-[8px]"
                value={newTruck.mac_id}
                onChange={(e) => setNewTruck({ ...newTruck, mac_id: e.target.value })}
              />
            </div>

            {/* Type */}
            <div className="flex flex-col gap-1 w-full text-[#545454] font-semibold">
              <div className="flex gap-2 text-sm items-center">
                <i className="bx bx-category-alt text-xl"></i>
                <p>Type</p>
              </div>
              <select
                value={newTruck.type}
                onChange={(e) => setNewTruck({ ...newTruck, type: e.target.value })}
                className="text-sm px-4 py-2 border border-[#F1F1F1] rounded-[8px]"
              >
                <option value="container">Container</option>
                <option value="box">Box</option>
                <option value="dump">Dump</option>
                <option value="trailer">Trailer</option>
              </select>
            </div>

            {/* Plate Number */}
            <div className="flex flex-col gap-1 w-full text-[#545454] font-semibold">
              <div className="flex gap-2 text-sm items-center">
                <i className="bx bx-id-card text-xl"></i>
                <p>Plate Number</p>
              </div>
              <input
                type="text"
                placeholder="Input plate number"
                className="text-sm px-4 py-2 border border-[#F1F1F1] rounded-[8px]"
                value={newTruck.plate_number}
                onChange={(e) => setNewTruck({ ...newTruck, plate_number: e.target.value })}
              />
            </div>

            <button
              onClick={() =>
                setIsOpen({ ...isOpen, konfirmasi: true, inputData: false })
              }
              className="bg-[#009EFF] w-full py-2 rounded-[8px] text-white font-semibold"
            >
              Tambah truck baru
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
                Apakah Anda yakin ingin menambahkan truck baru?
              </p>
              <p className="text-sm font-bold text-center">
                {newTruck.plate_number} - {capitalizeFirstLetter(newTruck.type)}
              </p>
              <p className="text-sm text-[#707070] text-center mt-2">
                MAC ID: {newTruck.mac_id}
              </p>
            </div>

            <button
              onClick={handleAddTruck}
              className="bg-[#008EE6] w-full py-2 rounded-[8px] text-white font-semibold"
            >
              Ya, Tambah Truck
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
              Truck baru berhasil ditambahkan
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

      {/* Edit Truck Modal */}
      {isOpen.editData && (
        <>
          <div
            className="fixed inset-0 backdrop-blur-sm z-40"
            onClick={() => setIsOpen({ ...isOpen, editData: false })}
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
                Edit Truck
              </p>
              <p className="text-sm text-[#707070] text-center">
                Update detail truck
              </p>
            </div>

            {/* MAC ID */}
            <div className="flex flex-col gap-1 w-full text-[#545454] font-semibold">
              <div className="flex gap-2 text-sm items-center">
                <i className="bx bx-chip text-xl"></i>
                <p>MAC ID</p>
              </div>
              <input
                type="text"
                placeholder="Input MAC ID"
                className="text-sm px-4 py-2 border border-[#F1F1F1] rounded-[8px]"
                value={editTruck.mac_id}
                onChange={(e) => setEditTruck({ ...editTruck, mac_id: e.target.value })}
              />
            </div>

            {/* Type */}
            <div className="flex flex-col gap-1 w-full text-[#545454] font-semibold">
              <div className="flex gap-2 text-sm items-center">
                <i className="bx bx-category-alt text-xl"></i>
                <p>Type</p>
              </div>
              <select
                value={editTruck.type}
                onChange={(e) => setEditTruck({ ...editTruck, type: e.target.value })}
                className="text-sm px-4 py-2 border border-[#F1F1F1] rounded-[8px]"
              >
                <option value="container">Container</option>
                <option value="box">Box</option>
                <option value="dump">Dump</option>
                <option value="trailer">Trailer</option>
              </select>
            </div>

            {/* Plate Number */}
            <div className="flex flex-col gap-1 w-full text-[#545454] font-semibold">
              <div className="flex gap-2 text-sm items-center">
                <i className="bx bx-id-card text-xl"></i>
                <p>Plate Number</p>
              </div>
              <input
                type="text"
                placeholder="Input plate number"
                className="text-sm px-4 py-2 border border-[#F1F1F1] rounded-[8px]"
                value={editTruck.plate_number}
                onChange={(e) => setEditTruck({ ...editTruck, plate_number: e.target.value })}
              />
            </div>

            <button
              onClick={() =>
                setIsOpen({ ...isOpen, konfirmasiEdit: true, editData: false })
              }
              className="bg-[#009EFF] w-full py-2 rounded-[8px] text-white font-semibold"
            >
              Update truck
            </button>
          </div>
        </>
      )}

      {/* Edit Confirmation Modal */}
      {isOpen.konfirmasiEdit && (
        <>
          <div
            className="fixed inset-0 backdrop-blur-sm z-40"
            onClick={() => setIsOpen({ ...isOpen, konfirmasiEdit: false })}
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
                Apakah Anda yakin ingin mengubah data truck ini?
              </p>
              <p className="text-sm font-bold text-center">
                {editTruck.plate_number} - {capitalizeFirstLetter(editTruck.type)}
              </p>
              <p className="text-sm text-[#707070] text-center mt-2">
                MAC ID: {editTruck.mac_id}
              </p>
            </div>

            <button
              onClick={handleUpdateTruck}
              className="bg-[#008EE6] w-full py-2 rounded-[8px] text-white font-semibold"
            >
              Ya, Update Truck
            </button>
            
            <button
              onClick={() => setIsOpen({ ...isOpen, konfirmasiEdit: false, editData: true })}
              className="border border-[#008EE6] text-[#008EE6] w-full py-2 rounded-[8px] font-semibold"
            >
              Batal
            </button>
          </div>
        </>
      )}

      {/* Edit Success Notification Modal */}
      {isOpen.notifikasiBerhasilEdit && (
        <>
          <div
            className="fixed inset-0 backdrop-blur-sm z-40"
            onClick={() => setIsOpen({ ...isOpen, notifikasiBerhasilEdit: false })}
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
              Data truck berhasil diperbarui
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
                    notifikasiBerhasilEdit: false,
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
    </div>
  );
};

export default TruckManagementPage;