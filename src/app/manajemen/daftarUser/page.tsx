"use client";
import React, { useState } from "react";
import "boxicons/css/boxicons.min.css";
import Image from "next/image";
import { useRouter } from "next/navigation";

const daftarUser = [
  {
    nama: "Hallo",
    email: "Hallo@gmail.com",
    status: "Active",
    role: "Planner",
  },
  {
    nama: "Hallo",
    email: "Hallo@gmail.com",
    status: "Active",
    role: "Planner",
  },
  {
    nama: "Hallo",
    email: "Hallo@gmail.com",
    status: "Active",
    role: "Planner",
  },
  {
    nama: "Hallo",
    email: "Hallo@gmail.com",
    status: "Active",
    role: "Planner",
  },
  {
    nama: "Hallo",
    email: "Hallo@gmail.com",
    status: "Active",
    role: "Planner",
  },
  {
    nama: "Hallo",
    email: "Hallo@gmail.com",
    status: "Active",
    role: "Planner",
  },
  {
    nama: "Hallo",
    email: "Hallo@gmail.com",
    status: "Active",
    role: "Planner",
  },
  {
    nama: "Hallo",
    email: "Hallo@gmail.com",
    status: "Active",
    role: "Planner",
  },
  {
    nama: "Hallo",
    email: "Hallo@gmail.com",
    status: "Active",
    role: "Planner",
  },
  {
    nama: "Hallo",
    email: "Hallo@gmail.com",
    status: "Active",
    role: "Planner",
  },
];

const DaftarUserPage = () => {
  const [isOpen, setIsOpen] = useState({
    inputData: false,
    konfirmasi: false,
    notifikasiBerhasil: false,
  });
  const [status, setStatus] = useState("Active");
  const [role, setRole] = useState("Planner");
  const route = useRouter();

  return (
    <div className="h-full pt-[12%] px-4 sm:px-8">
      {/* Header */}
      <div className="bg-white w-full justify-between flex items-center flex-wrap gap-4 sm:gap-0 mt-10 sm:mt-0">
        <label className="relative px-4 py-2 sm:px-6 sm:py-3 rounded-[8px] border border-[#F1F1F1] flex items-center gap-2 w-full sm:w-auto">
          <i className="bx bx-search text-xl sm:text-2xl text-[#009EFF]"></i>
          <input
            type="text"
            className="w-full outline-none text-sm sm:text-base"
            placeholder="Cari Supir"
          />
        </label>
        <button
          onClick={() => setIsOpen({ ...isOpen, inputData: true })}
          className="bg-[#009EFF] flex gap-2 text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-[8px] font-bold w-full sm:w-auto justify-center"
        >
          <i className="bx bx-user-plus text-xl sm:text-2xl"></i>
          <span className="text-sm sm:text-base">Tambah Role User</span>
        </button>
      </div>

      {/* List */}
      <div className="w-full mt-6 flex flex-col gap-3 h-[450px] overflow-y-auto">
        {daftarUser.map((user, index) => (
          <div
            key={index}
            className="px-4 sm:px-5 py-3 flex flex-col sm:flex-row sm:gap-5 bg-[#E6F5FF] rounded-[8px]"
          >
            <div className="flex items-center gap-3">
              <i className="bx bx-user-plus text-xl text-white rounded-full bg-[#009EFF] p-2"></i>
              <div className="text-sm sm:hidden">
                <p className="font-semibold">{user.nama}</p>
                <p className="text-[#707070]">{user.email}</p>
              </div>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap justify-between sm:justify-between w-full text-xs sm:text-sm items-center mt-2 sm:mt-0 gap-2">
              <div className="flex flex-col items-center w-1/2 sm:w-auto">
                <span className="font-medium">No</span>
                <p className="text-[#707070]">{index + 1}</p>
              </div>
              <div className="hidden sm:flex flex-col font-semibold items-center">
                Nama
                <p className="text-[#707070]">{user.nama}</p>
              </div>
              <div className="hidden sm:flex flex-col font-semibold items-center">
                Email
                <p className="text-[#707070]">{user.email}</p>
              </div>
              <div className="flex flex-col font-semibold items-center w-1/2 sm:w-auto">
                Status
                <p className="text-[#707070]">{user.status}</p>
              </div>
              <div className="flex flex-col font-semibold items-center w-1/2 sm:w-auto">
                Role
                <p className="text-[#707070]">{user.role}</p>
              </div>
            </div>

            <button className="mt-3 sm:mt-0 px-3 py-2 rounded-[8px] text-sm flex justify-center items-center w-full sm:w-[145px] bg-[#008EE6] text-white font-semibold">
              Edit Pengguna
            </button>
          </div>
        ))}
      </div>

      {/* Modal */}
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
                Selamat datang kembali
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
              />
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1 w-full text-[#545454] font-semibold">
              <div className="flex gap-2 text-sm items-center">
                <i className="bx bx-mail-send text-xl"></i>
                <p>Email</p>
              </div>
              <input
                type="text"
                placeholder="Input email"
                className="text-sm px-4 py-2 border border-[#F1F1F1] rounded-[8px]"
              />
            </div>

            {/* Status Dropdown */}
            <div className="flex flex-col gap-1 w-full text-[#545454] font-semibold">
              <div className="flex gap-2 text-sm items-center">
                <i className="bx bx-user-pin text-xl"></i>
                <p>Status</p>
              </div>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="text-sm px-4 py-2 border border-[#F1F1F1] rounded-[8px]"
              >
                <option value="Active">Active</option>
                <option value="Unactive">Unactive</option>
              </select>
            </div>

            {/* Role Dropdown */}
            <div className="flex flex-col gap-1 w-full text-[#545454] font-semibold">
              <div className="flex gap-2 text-sm items-center">
                <i className="bx bx-user-circle text-xl"></i>
                <p>Role</p>
              </div>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="text-sm px-4 py-2 border border-[#F1F1F1] rounded-[8px]"
              >
                <option value="Driver">Driver</option>
                <option value="Planner">Planner</option>
                <option value="Management">Management</option>
              </select>
            </div>

            <button
              onClick={() =>
                setIsOpen({ ...isOpen, konfirmasi: true, inputData: false })
              }
              className="bg-[#F1F1F1] w-full py-2 rounded-[8px] text-[#4343]"
            >
              Tambah user baru
            </button>
          </div>
        </>
      )}

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
                Tambah User Baru
              </p>
              <p className="text-sm text-[#707070] text-center">
                Selamat datang kembali
              </p>
            </div>

            <button
              onClick={() =>
                setIsOpen({
                  ...isOpen,
                  konfirmasi: false,
                  notifikasiBerhasil: true,
                })
              }
              className="bg-[#008EE6] w-full py-2 rounded-[8px] text-white font-semibold"
            >
              Tambah user baru
            </button>
          </div>
        </>
      )}

      {isOpen.notifikasiBerhasil && (
        <>
          <div
            className="fixed inset-0 backdrop-blur-sm z-40"
            onClick={() => setIsOpen({ ...isOpen, notifikasiBerhasil: false })}
          ></div>

          <div
            className="bg-white w-[90%] sm:w-[354px] fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[8px] gap-1 flex flex-col  p-6 z-50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex gap-2 items-center font-semibold text-[#009EFF]">
              <i className="bx bx-check text-2xl"></i>
              Berhasil
            </div>
            <p className="text-sm text-[#707070]">
              Pengguna baru berhasil ditambahkan
            </p>

            <div className=" flex gap-3 items-center justify-center mt-3">
              <button
                onClick={() => route.push("/manajemen/dashboard")}
                className="border-[#008EE6] text-[#008EE6] border flex-1 w-full py-2 rounded-[8px]  font-semibold"
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
    </div>
  );
};

export default DaftarUserPage;
