"use client";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import React from "react";
import "boxicons/css/boxicons.min.css"; // Import Boxicons CSS

const LayoutPlanner = ({ children }: { children: React.ReactNode }) => {
  const sidebar = [
    {
      icon: "bx-map-pin",
      name: "Buat Rute ",
      href: "/planner/buat-rute",
    },
    {
      icon: "bx-history",
      name: "Riwayat Rute",
      href: "/planner/riwayat-rute",
    },
    {
      icon: "bx-clipboard",
      name: "Validasi Rute",
      href: "/planner/validasi-rute",
    },
  ];

  const currentPath = usePathname();
  const route = useRouter();

  return (
    <div className="flex flex-col h-screen w-full">
     

      <div className="flex w-full ">
        <div className=" flex flex-col h-screen w-[272px]  p-[25px] items-center">
          <Image
            src={"/image/logo.png"}
            alt="logo"
            width={139}
            height={139}
            className="mb-[48px] bg-white p-2 rounded-md"
          />
          <div className="flex flex-col gap-4 w-full">
            {sidebar.map((item, index) => (
              <button
                onClick={() => route.push(item.href)}
                key={index}
                className={`flex items-center gap-2 cursor-pointer px-6 py-4 text-[#707070] rounded-md ${
                  currentPath === item.href ? "bg-gray-200" : "bg-white"
                }`}
              >
                <i className={`bx ${item.icon} text-2xl`}></i>
                <span>{item.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className=" w-full h-fit">
          <div className="mt-[68px] text-[#545454] text-2xl font-semibold flex justify-between w-full mb-[43px] px-6">
          {currentPath.includes("/buat-rute") && "Membuat Rute" }
          {currentPath.includes("/riwayat-rute") && "Riwayat Rute" }
          {currentPath.includes("/validasi-rute") && "Validasi Rute" }
            <div className="flex rounded-[100px] text-base bg-[#009EFF] items-center text-[#F1F1F1] p-1 gap-2">
              <Image
                src={"/image/UserImage.png"}
                alt="Logo"
                width={42}
                height={42}
              />
              Transport Planner
              <i className="bx  bx-caret-down "></i>
            </div>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
};

export default LayoutPlanner;
