// utils/sessionVerification.js

import { useEffect } from "react";
import { useRouter } from "next/router";

export default function useSession(requiredRole = null) {
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem("loggedInUser");
    if (!storedUser) {
      alert("Session expired. Please log in again.");
      router.push("/");
      return;
    }

    const user = JSON.parse(storedUser);

    // Optional role restriction
    if (requiredRole && user.role !== requiredRole) {
      alert("Unauthorized access. Redirecting...");
      router.push("/");
      return;
    }
  }, [requiredRole, router]);
}
