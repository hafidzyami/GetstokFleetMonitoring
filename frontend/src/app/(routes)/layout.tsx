"use client";

import { useAuth } from "@/app/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // const { user, loading, logout } = useAuth();
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return <div className="flex h-screen w-screen items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#009EFF]"></div>
    </div>;
  }

  return user ? (
    // <div className="min-h-screen flex flex-col">
    //   {/* Header dengan logout button */}
    //   <header className="bg-white shadow-sm py-2 px-4">
    //     <div className="container mx-auto flex justify-between items-center">
    //       <div>
    //         {user && (
    //           <p className="text-gray-700">
    //             Selamat datang, <span className="font-semibold">{user.name}</span>
    //           </p>
    //         )}
    //       </div>
    //       <button
    //         onClick={logout}
    //         className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm transition-colors"
    //       >
    //         Logout
    //       </button>
    //     </div>
    //   </header>
      
    //   {/* Content */}
    //   <div className="flex-grow">
    //     {children}
    //   </div>
    // </div>
    <div>
      {children}
    </div>
  ) : null;
}