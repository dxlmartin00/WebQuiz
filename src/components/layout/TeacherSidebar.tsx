"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  BookOpen,
  FileQuestion,
  LogOut,
  GraduationCap,
  Sparkles,
} from "lucide-react";

export default function TeacherSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

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

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col border-r border-slate-800 shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center gap-3">
        <div className="w-9 h-9 bg-indigo-600 flex items-center justify-center font-black text-lg text-white border border-indigo-400">
          W
        </div>
        <div>
          <div className="font-bold tracking-tight text-white flex items-center gap-1.5 text-base">
            WebQuiz <span className="text-[10px] uppercase font-semibold bg-indigo-900/90 text-indigo-300 px-1.5 py-0.5 border border-indigo-700">Admin</span>
          </div>
          <div className="text-xs text-slate-400">Faculty Portal</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive =
            pathname === link.href ||
            (link.href !== "/teacher/dashboard" && pathname.startsWith(link.href));

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-indigo-600 text-white border border-indigo-500 font-semibold"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-white truncate">
              {session?.user?.name || "Professor"}
            </div>
            <div className="text-[11px] text-slate-400 truncate">
              {session?.user?.email || "teacher@school.edu"}
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            title="Sign Out"
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-900 transition-colors border border-transparent hover:border-slate-800"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
