"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";

export function useRoleProtection(allowedRoles: string[]) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      // Check if user's role is in the allowed roles
      if (!allowedRoles.includes(user.role)) {
        // Redirect based on role
        if (user.role === "management") {
          router.push("/management");
        } else if (user.role === "planner") {
          router.push("/planner");
        } else if (user.role === "driver") {
          router.push("/driver");
        } else {
          router.push("/");
        }
      }
    }
  }, [user, loading, router, allowedRoles]);

  return { user, loading };
}