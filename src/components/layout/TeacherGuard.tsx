"use client";

import React, { useEffect } from "react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";

export default function TeacherGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();

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
        if (pathname === "/teacher/pending-approval") {
          router.push("/teacher/dashboard");
        }
      }
    }
  }, [session, status, pathname, router]);

  if (status === "loading") {
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
