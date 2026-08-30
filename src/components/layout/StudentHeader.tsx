"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, User, GraduationCap } from "lucide-react";

interface StudentHeaderProps {
  studentName?: string;
  studentIdNumber?: string;
}

export default function StudentHeader({
  studentName = "Student",
  studentIdNumber = "STU-0000",
}: StudentHeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/student/logout", { method: "POST" });
      router.push("/");
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/student/dashboard" className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-slate-900 text-white flex items-center justify-center font-bold text-sm sm:text-base border border-slate-700 shrink-0">
            W
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-slate-900 tracking-tight text-sm sm:text-base leading-tight truncate">
              WebQuiz
            </span>
            <span className="text-[9px] sm:text-[10px] uppercase font-semibold text-indigo-600 tracking-wider">
              Student Portal
            </span>
          </div>
        </Link>

        {/* User Info & Actions */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {/* Mobile compact badge */}
          <div className="flex sm:hidden items-center gap-1.5 pr-2 border-r border-slate-200">
            <div className="w-7 h-7 bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-mono font-bold text-[10px]">
              {studentIdNumber.slice(-3)}
            </div>
            <div className="text-[11px] font-mono font-bold text-slate-800 truncate max-w-[80px]">
              {studentIdNumber}
            </div>
          </div>

          {/* Desktop full badge */}
          <div className="hidden sm:flex items-center gap-3 pr-4 border-r border-slate-200">
            <div className="w-8 h-8 bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-semibold text-xs shrink-0">
              {studentIdNumber.slice(-2)}
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-slate-900 leading-tight truncate max-w-[140px]">
                {studentName}
              </div>
              <div className="text-xs font-mono text-slate-500">
                ID: {studentIdNumber}
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flat-button-secondary text-xs py-1.5 px-2.5 sm:px-3 flex items-center gap-1.5 min-h-[36px] touch-manipulation"
            title="Sign out of student portal"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="hidden xs:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
