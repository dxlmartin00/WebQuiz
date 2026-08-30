"use client";

import React from "react";
import { usePathname } from "next/navigation";
import TeacherSidebar from "@/components/layout/TeacherSidebar";
import TeacherGuard from "@/components/layout/TeacherGuard";

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAuthPage =
    pathname === "/teacher/login" || pathname === "/teacher/pending-approval";

  if (isAuthPage) {
    return <TeacherGuard>{children}</TeacherGuard>;
  }

  return (
    <TeacherGuard>
      <div className="min-h-screen flex bg-slate-50">
        <TeacherSidebar />
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {children}
        </main>
      </div>
    </TeacherGuard>
  );
}
