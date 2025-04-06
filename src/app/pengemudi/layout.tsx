"use client";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import React from "react";
import "boxicons/css/boxicons.min.css"; // Import Boxicons CSS


const LayoutPengemudi = ({ children }: { children: React.ReactNode }) => {
  const sidebar = [
    {
      icon: "bx-map-alt",
      name: "Rute ",
      href: "/pengemudi/rute",
    },
    {
      icon: "bx-receipt",
      name: "Kuitansi ",
      href: "/pengemudi/kuitansi",
    },
    {
      icon: "bx-log-out",
      name: "Keluar ",
      href: "/login",
    },
  ];

  const currentPath = usePathname();
  const route = useRouter();

  return (
    <div className="flex flex-col h-screen w-full">
      <div className="sm:hidden h-full w-full  flex flex-col">
        <div className="mt-[68px]  flex justify-between w-full mb-[43px] px-6">
          <Image src={"/image/logo.png"} alt="Logo" width={172} height={172} />
          <div className="flex rounded-[100px] bg-[#009EFF] items-center text-[#F1F1F1] p-1 gap-2">
            <Image
              src={"/image/UserImage.png"}
              alt="Logo"
              width={42}
              height={42}
            />
            Driver
            <i className="bx  bx-caret-down "></i>
          </div>
        </div>
        {children}

        <div className="flex w-full mt-auto bg-[#009EFF] justify-center gap-8 h-[68px]">
          {sidebar.map((item, index) => (
            <button
              onClick={() => {
                route.push(item.href);
              }}
              key={index}
              className={`flex flex-col items-center justify-center cursor-pointer hover:bg-white/10 px-6 py-4 text-white`}
            >
              <i className={`bx ${item.icon} text-2xl`}></i>
              <span>{item.name}</span>
              {currentPath === item.href && (
                <div className="w-full h-[2px] border borderwh "></div>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="hidden sm:flex w-full ">
        <div className=" flex flex-col h-screen w-[272px] bg-[#009EFF] p-[42px] items-center">
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
          <div className="mt-[68px]  flex justify-between w-full mb-[43px] px-6">
            <Image
              src={"/image/logo.png"}
              alt="Logo"
              width={172}
              height={172}
            />
            <div className="flex rounded-[100px] bg-[#009EFF] items-center text-[#F1F1F1] p-1 gap-2">
              <Image
                src={"/image/UserImage.png"}
                alt="Logo"
                width={42}
                height={42}
              />
              Driver
              <i className="bx  bx-caret-down "></i>
            </div>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
};

export default LayoutPengemudi;
