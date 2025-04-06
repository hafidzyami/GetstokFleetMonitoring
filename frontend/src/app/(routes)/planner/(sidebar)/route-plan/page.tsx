'use client'
import { useRouter } from "next/navigation";
import React from "react";

const BuatRutePage = () => {
  const route  = useRouter();

  return (
    <div className="h-[550px] px-8  overflow-y-auto">
      <div className="flex flex-col gap-1 w-full text-[#545454] ">
        <div className="flex gap-1 text-sm items-center font-semibold">
          <p>Jenis model</p>
        </div>
        <select className="text-sm px-6 py-4 border-[2px] border-[#F1F1F1] rounded-[8px]">
          <option className="font-light" value="">Pilih Jenis Mobil Anda di sini</option>
          <option value="CCDL">CCDL</option>
          <option value="CDL">CDL</option>
          <option value="CDE">CDE</option>
          <option value="Pick UP">Pick UP</option>
        </select>
      </div>

      <div className="flex flex-col gap-1 w-full text-[#545454] ">
        <div className="flex gap-1 text-sm items-center font-semibold">
          <p>Supir</p>
        </div>
        <select className="text-sm px-6 py-4 border-[2px] border-[#F1F1F1] rounded-[8px]">
          <option value="">Pilih nama Supir Mobil Anda di sini</option>
          <option value="Sucipto Adi Nugroho Wahyudin">Sucipto Adi Nugroho Wahyudin</option>
          <option value="Kartono Sucipto">Kartono Sucipto</option>
          <option value="andi Bahras">andi Bahras</option>
        </select>
      </div>

      <div className="flex flex-col gap-1 w-full text-[#545454] ">
        <div className="flex gap-1 text-sm items-center font-semibold">
          <p>Plat Nomor Kendaraan</p>
        </div>
        <select className="text-sm px-6 py-4 border-[2px] border-[#F1F1F1] rounded-[8px]">
          <option value="">Pilih Plat Nomor Kendaraan Anda di sini</option>
          <option value="B1234 SUV">B1234 SUV</option>
          <option value="B 3832 USY">B 3832 USY</option>
          <option value="B 0239 IIA">B 0239 IIA</option>
          <option value="B 2812 KUS">B 2812 KUS</option>
        </select>
      </div>

      <div className="flex flex-col gap-1 w-full text-[#545454] font-semibold">
        <div className="flex gap-1 text-sm items-center">
          <p>Alamat Asal</p>
        </div>
        <input
          type="text"
          placeholder="Masukkan Alamat Asal  di sini"
          className="text-sm px-6 py-4 border-[2px] border-[#F1F1F1] rounded-[8px]"
        />
      </div>
      <div className="flex flex-col gap-1 w-full text-[#545454] font-semibold">
        <div className="flex gap-1 text-sm items-center">
          <p>Alamat Tujuan</p>
        </div>
        <input
          type="text"
          placeholder="Masukkan Alamat Tujuan di sini"
          className="text-sm px-6 py-4 border-[2px] border-[#F1F1F1] rounded-[8px]"
        />
      </div>

      <div id="additional-destinations"></div>
      <div
        className="text-sm px-6 py-4 border-[2px] border-[#009EFF] text-[#009EFF] rounded-[8px] flex items-center justify-center gap-2 font-semibold mt-2 cursor-pointer"
        onClick={() => {
          const container = document.getElementById("additional-destinations");
          const newDiv = document.createElement("div");
          newDiv.className =
        "flex flex-col gap-1 w-full text-[#545454] font-semibold relative mt-2";
            newDiv.innerHTML = `
          <div class="flex flex-col gap-2">
            <div class="flex gap-1 text-sm items-center">
            <p>Alamat Tujuan</p>
            </div>
            <div class="flex items-center gap-2">
            <input
              type="text"
              placeholder="Masukkan Alamat Tujuan di sini"
              class="text-sm px-6 py-4 border-[2px] border-[#F1F1F1] rounded-[8px] flex-1"
            />
            <i class="bx bx-trash-alt text-xl text-red-500 border-red-500 border-2 rounded-[8px] p-2 cursor-pointer"></i>
            </div>
          </div>
            `;
          newDiv.querySelector(".bx-trash-alt")?.addEventListener("click", () => {
        newDiv.remove();
          });
          container?.prepend(newDiv); // Use prepend to add the new div at the top
        }}
      >
        <i className="bx bx-plus text-2xl"></i>
        Tambahkan Alamat Tujuan Lain
      </div>
      <button onClick={() => route.push("/planner/buat-rute/1")} className="w-full text-sm px-6 py-4 border-[2px] bg-[#009EFF] text-white rounded-[8px] flex items-center justify-center gap-2 font-semibold mt-2">
        Generate
      </button>
    </div>
  );
};

export default BuatRutePage;
