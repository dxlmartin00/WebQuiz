"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import TeacherSidebar from "@/components/layout/TeacherSidebar";
import TeacherGuard from "@/components/layout/TeacherGuard";
import { Menu, ShieldCheck } from "lucide-react";

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isAdmin = (session?.user as any)?.role === "ADMIN";

  const isAuthPage =
    pathname === "/teacher/login" || pathname === "/teacher/pending-approval";

  if (isAuthPage) {
    return <TeacherGuard>{children}</TeacherGuard>;
  }

  return (
    <TeacherGuard>
      <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
        {/* Mobile Header Bar */}
        <header className="md:hidden sticky top-0 z-30 bg-slate-900 border-b border-slate-800 text-white px-4 h-14 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-1.5 -ml-1.5 text-slate-300 hover:text-white transition-colors focus:outline-none min-h-[40px] min-w-[40px] flex items-center justify-center"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-indigo-600 flex items-center justify-center font-black text-xs text-white border border-indigo-400">
                W
              </div>
              <span className="font-bold text-sm tracking-tight text-white">
                WebQuiz
              </span>
              {isAdmin && (
                <span className="text-[9px] uppercase font-bold bg-amber-500/20 text-amber-300 px-1 py-0.2 border border-amber-500/40">
                  Admin
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-900/60 border border-indigo-600 text-indigo-300 font-bold text-xs flex items-center justify-center rounded-full">
              {session?.user?.name?.charAt(0) || "T"}
            </div>
          </div>
        </header>

        {/* Sidebar (Desktop + Mobile Slide-over) */}
        <TeacherSidebar
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />

        {/* Main Workspace */}
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {children}
        </main>
      </div>
    </TeacherGuard>
  );
}
