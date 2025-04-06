"use client";
import React from "react";
import "boxicons/css/boxicons.min.css";
import Image from "next/image";
import { useRouter } from "next/navigation";

const daftarRute = [
  {
    alamatAsal: "Bogor",
    platNomor: "B 1234 SSUV",
    status: "Menunggu",
  },

  {
    alamatAsal: "Bogor",
    platNomor: "B 1234 SSUV",
    status: "Menunggu",
  },

  {
    alamatAsal: "Bogor",
    platNomor: "B 1234 SSUV",
    status: "Disetujui",
  },
  {
    alamatAsal: "Bogor",
    platNomor: "B 1234 SSUV",
    status: "Disetujui",
  },
  {
    alamatAsal: "Bogor",
    platNomor: "B 1234 SSUV",
    status: "Disetujui",
  },
  {
    alamatAsal: "Bogor",
    platNomor: "B 1234 SSUV",
    status: "Disetujui",
  },
  {
    alamatAsal: "Bogor",
    platNomor: "B 1234 SSUV",
    status: "Disetujui",
  },
  {
    alamatAsal: "Bogor",
    platNomor: "B 1234 SSUV",
    status: "Disetujui",
  },
  {
    alamatAsal: "Bogor",
    platNomor: "B 1234 SSUV",
    status: "Disetujui",
  },
];

const ValidasiRutePage = () => {
 const route = useRouter(); 

  return (
    <div className="h-full px-8">
      <div className="bg-white w-full justify-between flex items-center">
        <label className="relative px-6 py-3 rounded-[8px] border-[1px] border-[#F1F1F1] flex items-center gap-2">
          <i className="bx bx-search text-2xl text-[#009EFF]"></i>
          <input type="text" className="" placeholder="Cari Rute" />
        </label>
      </div>

      <div className="w-full mt-6 flex flex-col gap-2 h-[450px] overflow-y-auto">
        {daftarRute.map((user, index) => (
          <div
            key={index}
            className="px-5 py-2 flex gap-5 bg-orange-50 rounded-[8px]"
          >
            <Image
              src={"/icons/PlusComment.svg"}
              alt="Comment plus"
              width={25}
              height={25}
              className="bg-[#E2A052] rounded-full flex items-center justify-center p-2 w-fit h-fit self-center"
            />
            <div className="flex w-full gap-[300px] text-sm items-center  ">
              <div className="flex flex-col items-center self-start">
                No
                <p className="text-[#707070]">{index + 1}</p>
              </div>
              <div className="flex flex-col font-semibold items-center">
                Alamat Asal
                <p className="text-[#707070]">{user.alamatAsal}</p>
              </div>
              <div className="flex flex-col font-semibold items-center">
                Plat Nomor
                <p className="text-[#707070]">{user.platNomor}</p>
              </div>
            </div>

            <div className="flex gap-10">
              <button onClick={() => route.push('/planner/validasi-rute/1')} className="px-3 py-1 rounded-[8px] w-[145px] text-sm flex justify-center items-center  bg-[#E2A052] text-white font-semibold">
                Lihat Detail
              </button>

              <div
                className={` rounded-[8px] text-sm flex justify-center items-center w-[130px] font-semibold ${
                  user.status === "Menunggu"
                    ? "text-[#B58F07]"
                    : "bg-[#E6F5E9] text-[#09844D]"
                }`}
              >
                {user.status === "Menunggu" ? "Menunggu" : "Disetujui"}
              </div>
            </div>
          </div>
        ))}
      </div>

     
    </div>
  );
};

export default ValidasiRutePage;
