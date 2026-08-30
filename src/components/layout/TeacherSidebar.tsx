"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  BookOpen,
  FileQuestion,
  LogOut,
  ShieldCheck,
  X,
} from "lucide-react";

interface TeacherSidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function TeacherSidebar({
  mobileOpen = false,
  onCloseMobile,
}: TeacherSidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "ADMIN";
  const [pendingCount, setPendingCount] = useState<number>(0);

  useEffect(() => {
    if (isAdmin) {
      fetch("/api/teacher/admin/teachers")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.teachers) {
            const pending = data.teachers.filter((t: any) => !t.isApproved).length;
            setPendingCount(pending);
          }
        })
        .catch(() => {});
    }
  }, [isAdmin, pathname]);

  // Close mobile drawer on route change
  useEffect(() => {
    if (onCloseMobile) {
      onCloseMobile();
    }
  }, [pathname]);

  const links = [
    {
      label: "Dashboard",
      href: "/teacher/dashboard",
      icon: LayoutDashboard,
    },
    {
      label: "Classes & Rosters",
      href: "/teacher/subjects",
      icon: BookOpen,
    },
    {
      label: "Quizzes & Exams",
      href: "/teacher/quizzes",
      icon: FileQuestion,
    },
  ];

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between bg-slate-900 text-white select-none">
      {/* Brand Header */}
      <div>
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-indigo-600 flex items-center justify-center font-black text-base sm:text-lg text-white border border-indigo-400">
              W
            </div>
            <div>
              <div className="font-bold tracking-tight text-white flex items-center gap-1.5 text-sm sm:text-base">
                WebQuiz{" "}
                {isAdmin ? (
                  <span className="text-[9px] sm:text-[10px] uppercase font-bold bg-amber-500/20 text-amber-300 px-1.5 py-0.5 border border-amber-500/40">
                    Admin
                  </span>
                ) : (
                  <span className="text-[9px] sm:text-[10px] uppercase font-semibold bg-indigo-900/90 text-indigo-300 px-1.5 py-0.5 border border-indigo-700">
                    Faculty
                  </span>
                )}
              </div>
              <div className="text-[11px] sm:text-xs text-slate-400">Academic Portal</div>
            </div>
          </div>

          {/* Close button for mobile */}
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="md:hidden p-1.5 text-slate-400 hover:text-white transition-colors"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive =
              pathname === link.href ||
              (link.href !== "/teacher/dashboard" && pathname.startsWith(link.href));

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium transition-colors min-h-[44px] ${
                  isActive
                    ? "bg-indigo-600 text-white border border-indigo-500 font-semibold"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{link.label}</span>
              </Link>
            );
          })}

          {/* Developer Admin Only: Faculty Approvals */}
          {isAdmin && (
            <div className="pt-4 mt-4 border-t border-slate-800">
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Administration
              </div>
              <Link
                href="/teacher/admin/teachers"
                className={`flex items-center justify-between px-3.5 py-2.5 text-sm font-medium transition-colors min-h-[44px] ${
                  pathname.startsWith("/teacher/admin/teachers")
                    ? "bg-amber-600 text-white border border-amber-500 font-semibold"
                    : "text-amber-300/90 hover:bg-slate-800 hover:text-amber-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Faculty Approvals</span>
                </div>
                {pendingCount > 0 && (
                  <span className="bg-amber-500 text-slate-950 font-bold text-[10px] px-1.5 py-0.5 rounded-full">
                    {pendingCount}
                  </span>
                )}
              </Link>
            </div>
          )}
        </nav>
      </div>

      {/* User Footer */}
      <div className="p-3.5 sm:p-4 border-t border-slate-800 bg-slate-950">
        <div className="flex items-center justify-between gap-2.5">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-white truncate">
              {session?.user?.name || "Faculty Member"}
            </div>
            <div className="text-[11px] text-slate-400 truncate">
              {session?.user?.email || ""}
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            title="Sign Out"
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-900 transition-colors border border-transparent hover:border-slate-800 min-h-[40px] min-w-[40px] flex items-center justify-center"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:block w-64 shrink-0 border-r border-slate-800 sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Slide-Over Drawer with Backdrop */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />

          {/* Drawer */}
          <div className="relative w-4/5 max-w-xs h-full bg-slate-900 shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
