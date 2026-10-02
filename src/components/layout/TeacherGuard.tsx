"use client";

import React, { useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";

export default function TeacherGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const isTerminatingRef = useRef(false);

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      if (pathname !== "/teacher/login") {
        router.push("/teacher/login");
      }
      return;
    }

    if (session?.user) {
      const isApproved = (session.user as any).isApproved;

      if (!isApproved) {
        if (pathname !== "/teacher/pending-approval") {
          router.push("/teacher/pending-approval");
        }
      } else {
        if (pathname === "/teacher/pending-approval" || pathname === "/teacher/login") {
          router.push("/teacher/dashboard");
        }
      }
    }
  }, [session, status, pathname, router]);

  // Real-time account liveness check: if admin deletes this teacher, auto logout
  const lastCheckTimeRef = useRef(0);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.email) return;

    let isMounted = true;

    async function checkAccountLiveness() {
      if (isTerminatingRef.current || !isMounted) return;
      lastCheckTimeRef.current = Date.now();

      try {
        const res = await fetch("/api/teacher/auth-status", {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });

        const data = await res.json().catch(() => ({}));

        if (res.status === 401 || data.isDeleted) {
          isTerminatingRef.current = true;
          // Account was deleted by admin! Force instant logout and redirect
          await signOut({ callbackUrl: "/teacher/login?deleted=1", redirect: true });
        }
      } catch {
        // Network/offline error, don't log out
      }
    }

    // Heartbeat check every 2 minutes (120,000ms) instead of aggressive 3s polling
    const interval = setInterval(checkAccountLiveness, 120000);

    // Also check when window gains focus or tab becomes visible, throttled to once every 30s
    const handleVisibility = () => {
      const now = Date.now();
      if (!document.hidden && now - lastCheckTimeRef.current > 30000) {
        checkAccountLiveness();
      }
    };

    window.addEventListener("focus", handleVisibility);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener("focus", handleVisibility);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [status, session]);

  if (status === "loading" && !session) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent animate-spin mx-auto"></div>
          <p className="text-xs font-mono text-slate-400">Verifying faculty credentials...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
