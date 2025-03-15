// app/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./contexts/AuthContext";

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        // Jika sudah login, redirect ke halaman berdasarkan role
        if (user.role === "management") {
          router.push("/management");
        } else if (user.role === "planner") {
          router.push("/planner");
        } else if (user.role === "driver") {
          router.push("/driver");
        }
      } else {
        // Jika belum login, redirect ke halaman login
        router.push("/login");
      }
    }
  }, [user, loading, router]);

  // Menampilkan loading spinner saat proses berlangsung
  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#009EFF]"></div>
    </div>
  );
}