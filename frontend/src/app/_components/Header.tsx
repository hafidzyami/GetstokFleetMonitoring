// components/Header.tsx
"use client";

import { useAuth } from "@/app/contexts/AuthContext";
import LogoutButton from "./LogoutButton";
import Image from "next/image";
import getstokLogo from "@/app/_assets/getstokLogo.png";

export default function Header() {
  const { user } = useAuth();

  return (
    <header className="bg-white shadow-md py-4">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <div className="flex items-center">
          <Image
            src={getstokLogo}
            alt="Getstok Logo"
            width={120}
            height={40}
            className="mr-4"
          />
          <h1 className="text-xl font-semibold text-gray-800">Fleet Monitoring</h1>
        </div>

        <div className="flex items-center gap-4">
          {user && (
            <div className="flex items-center">
              <div className="mr-4">
                <p className="text-sm text-gray-600">Welcome,</p>
                <p className="font-medium text-gray-800">{user.name}</p>
              </div>
              <LogoutButton />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}