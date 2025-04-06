"use client";
import React from "react";
import "boxicons/css/boxicons.min.css";
import Image from "next/image";
import { useRouter } from "next/navigation";

const daftarRiwayat = [
  {
    alamatAsal: "Bogor",
    platNomor: "B 1234 SSUV",
  },
  {
    alamatAsal: "Bogor",
    platNomor: "B 1234 SSUV",
  },
  {
    alamatAsal: "Bogor",
    platNomor: "B 1234 SSUV",
  },
  {
    alamatAsal: "Bogor",
    platNomor: "B 1234 SSUV",
  },
  {
    alamatAsal: "Bogor",
    platNomor: "B 1234 SSUV",
  },
  {
    alamatAsal: "Bogor",
    platNomor: "B 1234 SSUV",
  },
  {
    alamatAsal: "Bogor",
    platNomor: "B 1234 SSUV",
  },
  {
    alamatAsal: "Bogor",
    platNomor: "B 1234 SSUV",
  },
  {
    alamatAsal: "Bogor",
    platNomor: "B 1234 SSUV",
  },
  {
    alamatAsal: "Bogor",
    platNomor: "B 1234 SSUV",
  },
  {
    alamatAsal: "Bogor",
    platNomor: "B 1234 SSUV",
  },
  {
    alamatAsal: "Bogor",
    platNomor: "B 1234 SSUV",
  },
  {
    alamatAsal: "Bogor",
    platNomor: "B 1234 SSUV",
  },
];

const RiwayatRutePage = () => {
  const route = useRouter();

  return (
    <div className="h-full px-8">
      <div className="bg-white w-full justify-between flex items-center">
        <label className="relative px-6 py-3 rounded-[8px] border-[1px] border-[#F1F1F1] flex items-center gap-2">
          <i className="bx bx-search text-2xl text-[#009EFF]"></i>
          <input type="text" className="" placeholder="Cari Rute" />
        </label>
        <button
          onClick={() => route.push("/planner/buat-rute")}
          className="bg-[#009EFF] flex gap-2 text-white px-6 py-2.5 rounded-[8px] font-bold"
        >
          <i className="bx bx-plus text-2xl"></i>
          Buat Rute
        </button>
      </div>

      <div className="w-full mt-6 flex flex-col gap-2 h-[450px] overflow-y-auto">
        {daftarRiwayat.map((user, index) => (
          <div
            key={index}
            className="px-5 py-2 flex gap-5 bg-[#E6F5FF] rounded-[8px]"
          >
            <Image
              src={"/icons/PlusComment.svg"}
              alt="Comment plus"
              width={25}
              height={25}
              className="bg-[#009EFF] rounded-full flex items-center justify-center p-2 w-fit h-fit self-center"
            />
            <div className="flex gap-[300px] w-[80%] text-sm items-center mr-[100px]">
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

            <button onClick={() => route.push('/planner/validasi-rute/1')} className="px-3 py-1 rounded-[8px] text-sm flex justify-center items-center w-[145px] bg-[#008EE6] text-white font-semibold">
              Lihat Detail
            </button>
          </div>
        ))}
      </div>

     
    </div>
  );
};

export default RiwayatRutePage;
