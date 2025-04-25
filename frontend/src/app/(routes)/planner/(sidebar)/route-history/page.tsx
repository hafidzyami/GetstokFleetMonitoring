"use client";

import "boxicons/css/boxicons.min.css";

import React, { useEffect, useState } from "react";

import { format } from "date-fns";
import { id } from "date-fns/locale";
import { useRouter } from "next/navigation";

// Define interfaces for the API response
interface Waypoint {
	id: number;
	latitude: number;
	longitude: number;
	address: string;
	order: number;
}

interface AvoidancePoint {
	id: number;
	latitude: number;
	longitude: number;
	order: number;
}

interface AvoidanceArea {
	id: number;
	reason: string;
	is_permanent: boolean;
	has_photo: boolean;
	points: AvoidancePoint[];
}

interface RoutePlan {
	id: number;
	driver_name: string;
	vehicle_plate: string;
	planner_name: string; // Sekarang sudah diimplementasikan di backend
	route_geometry: string;
	status: string;
	waypoints: Waypoint[];
	avoidance_areas: AvoidanceArea[];
	created_at: string;
	updated_at: string;
}

interface ApiResponse {
	apiVersion: string;
	context?: string;
	id?: string;
	method?: string;
	data: RoutePlan[];
	error?: {
		code: number;
		message: string;
		errors?: any[];
	};
}

const RiwayatRutePage = () => {
	const router = useRouter();
	const [routePlans, setRoutePlans] = useState<RoutePlan[]>([]);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);
	const [searchQuery, setSearchQuery] = useState<string>("");

	// Function to format status with color
	const getStatusDisplay = (status: string) => {
		const statusMap: Record<
			string,
			{ text: string; bgColor: string; textColor: string }
		> = {
			planned: {
				text: "Direncanakan",
				bgColor: "bg-blue-100",
				textColor: "text-blue-800",
			},
			active: {
				text: "Aktif",
				bgColor: "bg-green-100",
				textColor: "text-green-800",
			},
			completed: {
				text: "Selesai",
				bgColor: "bg-gray-100",
				textColor: "text-gray-800",
			},
			cancelled: {
				text: "Dibatalkan",
				bgColor: "bg-red-100",
				textColor: "text-red-800",
			},
			"on confirmation": {
				text: "Dalam Konfirmasi",
				bgColor: "bg-yellow-100",
				textColor: "text-yellow-800",
			},
		};

		const statusInfo = statusMap[status.toLowerCase()] || {
			text: status,
			bgColor: "bg-gray-100",
			textColor: "text-gray-800",
		};

		return (
			<span
				className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.textColor}`}
			>
				{statusInfo.text}
			</span>
		);
	};

	// Format date function
	const formatDate = (dateString: string) => {
		try {
			const date = new Date(dateString);
			return format(date, "dd MMM yyyy, HH:mm", { locale: id });
		} catch (e) {
			return dateString;
		}
	};

	useEffect(() => {
		const fetchRoutePlans = async () => {
			setIsLoading(true);
			try {
				const token = localStorage.getItem("token");
				if (!token) {
					router.push("/login");
					return;
				}

				const response = await fetch(
					"/api/v1/route-plans",
					{
						headers: {
							Authorization: `Bearer ${token}`,
						},
					}
				);

				if (!response.ok) {
					if (response.status === 401) {
						// Token tidak valid, redirect ke login
						localStorage.removeItem("token");
						router.push("/login");
						return;
					}
					throw new Error(
						`Error ${response.status}: ${response.statusText}`
					);
				}

				const data: ApiResponse = await response.json();
				console.log("Route plans data:", data);
				setRoutePlans(data.data || []);
			} catch (err) {
				console.error("Error fetching route plans:", err);
				setError(
					err instanceof Error ? err.message : "An unknown error occurred"
				);
			} finally {
				setIsLoading(false);
			}
		};

		fetchRoutePlans();
	}, [router]);

	// Filter route plans based on search query
	const filteredRoutePlans = routePlans.filter((plan) => {
		const query = searchQuery.toLowerCase();
		const driverName = plan.driver_name?.toLowerCase() || "";
		const vehiclePlate = plan.vehicle_plate?.toLowerCase() || "";
		const status = plan.status?.toLowerCase() || "";
		const plannerName = plan.planner_name?.toLowerCase() || "";

		return (
			driverName.includes(query) ||
			vehiclePlate.includes(query) ||
			status.includes(query) ||
			plannerName.includes(query)
		);
	});

	return (
		<div className="h-full">
			<div className="w-full">
  {/* Desktop Layout (flex row) */}
  <div className="hidden md:flex justify-between items-center gap-4">
    <label className="flex-1 relative px-6 py-3 rounded-lg border border-[#F1F1F1] flex items-center gap-3 bg-white shadow-sm">
      <i className="bx bx-search text-2xl text-[#009EFF]"></i>
      <input
        type="text"
        className="flex-1 outline-none bg-transparent text-gray-700 placeholder-gray-400"
        placeholder="Cari rute berdasarkan nama driver, planner, plat nomor, atau status"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
    </label>
    <button
      onClick={() => router.push("/planner/route-plan")}
      className="bg-[#009EFF] hover:bg-[#0085D0] transition-colors flex gap-2 items-center text-white px-6 py-3 rounded-lg font-bold whitespace-nowrap shadow-md"
    >
      <i className="bx bx-plus text-2xl"></i>
      Buat Rute
    </button>
  </div>

  {/* Mobile Layout (vertical stack) */}
  <div className="md:hidden space-y-3">
    <label className="w-full relative px-4 py-3 rounded-lg border border-[#F1F1F1] flex items-center gap-3 bg-white shadow-sm">
      <i className="bx bx-search text-xl text-[#009EFF]"></i>
      <input
        type="text"
        className="flex-1 outline-none bg-transparent text-gray-700 placeholder-gray-400 text-sm"
        placeholder="Cari driver, planner, plat nomor..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
    </label>
    <button
      onClick={() => router.push("/planner/route-plan")}
      className="w-full bg-[#009EFF] hover:bg-[#0085D0] transition-colors flex gap-2 justify-center items-center text-white px-4 py-3 rounded-lg font-bold shadow-md"
    >
      <i className="bx bx-plus text-xl"></i>
      Buat Rute
    </button>
  </div>
</div>

			<div className="w-full mt-6">
				{/* Desktop Table (hidden on mobile) */}
				<div className="hidden md:block overflow-hidden rounded-lg border border-gray-200 shadow-sm">
					{/* Header Table */}
					<div className="grid grid-cols-7 gap-4 py-3 px-4 bg-gray-100 font-semibold text-sm text-gray-700">
						<div className="truncate">No.</div>
						<div className="truncate">Plat Nomor | MAC ID</div>
						<div className="truncate">Nama Driver</div>
						<div className="truncate">Nama Planner</div>
						<div className="truncate">Status</div>
						<div className="truncate">Tanggal Dibuat</div>
						<div className="truncate">Aksi</div>
					</div>

					{/* Table Content */}
					<div className="h-[500px] overflow-y-auto">
						{isLoading ? (
							<div className="flex items-center justify-center h-full">
								<div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#009EFF]"></div>
							</div>
						) : error ? (
							<div className="flex items-center justify-center h-full text-red-500 p-4">
								<p>Error: {error}</p>
								<button
									onClick={() => window.location.reload()}
									className="ml-2 px-3 py-1 bg-blue-500 text-white rounded-md text-sm"
								>
									Coba Lagi
								</button>
							</div>
						) : filteredRoutePlans.length === 0 ? (
							<div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
								<i className="bx bx-map-alt text-5xl mb-2"></i>
								<p>Belum ada rute yang dibuat</p>
							</div>
						) : (
							filteredRoutePlans.map((plan, index) => (
								<div
									key={plan.id}
									className={`grid grid-cols-7 gap-4 py-3 px-4 border-b text-sm hover:bg-gray-50 ${
										plan.status === "active"
											? "bg-green-50"
											: plan.status === "completed"
											? "bg-gray-50"
											: plan.status === "cancelled"
											? "bg-red-50"
											: ""
									}`}
								>
									<div className="truncate">{index + 1}</div>
									<div className="truncate">
										{plan.vehicle_plate
											? plan.vehicle_plate.split("/").join(" | ")
											: "N/A"}
									</div>
									<div className="truncate">
										{plan.driver_name || "N/A"}
									</div>
									<div className="truncate">
										{plan.planner_name || "Admin"}
									</div>
									<div className="truncate">
										{getStatusDisplay(plan.status)}
									</div>
									<div className="truncate">
										{formatDate(plan.created_at)}
									</div>
									<div>
										<button
											onClick={() =>
												router.push(
													`/planner/route-history/${plan.id}`
												)
											}
											className="px-3 py-1 rounded-lg text-xs flex justify-center items-center w-full bg-[#008EE6] text-white font-medium hover:bg-[#0078C1] transition-colors"
										>
											Lihat Detail
										</button>
									</div>
								</div>
							))
						)}
					</div>
				</div>

				{/* Mobile Cards (shown only on mobile) */}
				<div className="md:hidden space-y-3">
					{isLoading ? (
						<div className="flex items-center justify-center h-32">
							<div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#009EFF]"></div>
						</div>
					) : error ? (
						<div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 text-red-500">
							<p>Error: {error}</p>
							<button
								onClick={() => window.location.reload()}
								className="mt-2 px-3 py-1 bg-blue-500 text-white rounded-md text-sm"
							>
								Coba Lagi
							</button>
						</div>
					) : filteredRoutePlans.length === 0 ? (
						<div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col items-center justify-center text-gray-500">
							<i className="bx bx-map-alt text-5xl mb-2"></i>
							<p>Belum ada rute yang dibuat</p>
						</div>
					) : (
						filteredRoutePlans.map((plan, index) => (
							<>
								<div
									key={plan.id}
									className={`bg-white p-4 rounded-lg shadow-sm border border-gray-200 ${
										plan.status === "active"
											? "border-l-4 border-l-green-500"
											: plan.status === "completed"
											? "border-l-4 border-l-gray-500"
											: plan.status === "cancelled"
											? "border-l-4 border-l-red-500"
											: ""
									}`}
								>
									<div className="flex justify-between items-start mb-2">
										<div className="font-medium text-gray-700">
											#{index + 1}
										</div>
										<span
											className={`text-xs px-2 py-1 rounded-full font-medium bg-opacity-20 ${
												plan.status === "active"
													? "bg-green-100 text-green-800"
													: plan.status === "completed"
													? "bg-gray-100 text-gray-800"
													: plan.status === "cancelled"
													? "bg-red-100 text-red-800"
													: plan.status === "on confirmation"
													? "bg-yellow-100 text-yellow-800"
													: "bg-blue-100 text-blue-800"
											}`}
										>
											{getStatusDisplay(plan.status)}
										</span>
									</div>

									<div className="space-y-2 mt-3">
										<div>
											<p className="text-xs text-gray-500">
												Plat Nomor | MAC ID
											</p>
											<p className="text-sm font-medium">
												{plan.vehicle_plate
													? plan.vehicle_plate
															.split("/")
															.join(" | ")
													: "N/A"}
											</p>
										</div>

										<div className="grid grid-cols-2 gap-2">
											<div>
												<p className="text-xs text-gray-500">
													Driver
												</p>
												<p className="text-sm font-medium">
													{plan.driver_name || "N/A"}
												</p>
											</div>
											<div>
												<p className="text-xs text-gray-500">
													Planner
												</p>
												<p className="text-sm font-medium">
													{plan.planner_name || "Admin"}
												</p>
											</div>
										</div>

										<div>
											<p className="text-xs text-gray-500">
												Tanggal Dibuat
											</p>
											<p className="text-sm font-medium">
												{formatDate(plan.created_at)}
											</p>
										</div>
									</div>

									<button
										onClick={() =>
											router.push(
												`/planner/route-history/${plan.id}`
											)
										}
										className="w-full mt-3 px-4 py-2 rounded-lg bg-[#008EE6] text-white font-medium hover:bg-[#0078C1] transition-colors text-sm flex items-center justify-center gap-2"
									>
										<i className="bx bx-show"></i>
										Lihat Detail
									</button>
								</div>
							</>
						))
					)}
				</div>
			</div>

			{/* <div className="w-full mt-6 overflow-hidden flex flex-col">
        <div className="grid grid-cols-7 gap-4 py-3 px-4 bg-gray-100 rounded-t-lg font-semibold text-sm text-gray-700">
          <div>No.</div>
          <div>Plat Nomor | MAC ID</div>
          <div>Nama Driver</div>
          <div>Nama Planner</div>
          <div>Status</div>
          <div>Tanggal Dibuat</div>
          <div>Aksi</div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#009EFF]"></div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full text-red-500">
              <p>Error: {error}</p>
              <button
                onClick={() => window.location.reload()}
                className="ml-2 px-3 py-1 bg-blue-500 text-white rounded-md text-sm"
              >
                Coba Lagi
              </button>
            </div>
          ) : filteredRoutePlans.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <i className="bx bx-map-alt text-5xl mb-2"></i>
              <p>Belum ada rute yang dibuat</p>
            </div>
          ) : (
            filteredRoutePlans.map((plan, index) => (
              <div
                key={plan.id}
                className={`grid grid-cols-7 gap-4 py-3 px-4 border-b text-sm hover:bg-gray-50 ${
                  plan.status === "active"
                    ? "bg-green-50"
                    : plan.status === "completed"
                    ? "bg-gray-50"
                    : plan.status === "cancelled"
                    ? "bg-red-50"
                    : ""
                }`}
              >
                <div>{index + 1}</div>
                <div className="truncate">
                  {plan.vehicle_plate
                    ? plan.vehicle_plate.split("/").join(" | ")
                    : "N/A"}
                </div>
                <div className="truncate">{plan.driver_name || "N/A"}</div>
                <div className="truncate">{plan.planner_name || "Admin"}</div>
                <div>{getStatusDisplay(plan.status)}</div>
                <div>{formatDate(plan.created_at)}</div>
                <div>
                  <button
                    onClick={() =>
                      router.push(`/planner/route-history/${plan.id}`)
                    }
                    className="px-3 py-1 rounded-[8px] text-xs flex justify-center items-center w-full bg-[#008EE6] text-white font-medium"
                  >
                    Lihat Detail
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div> */}
		</div>
	);
};

export default RiwayatRutePage;
