"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import React from "react";
import { ToastProvider } from "@/components/ui/ToastContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthSessionProvider>
      <ToastProvider>
        {children}
      </ToastProvider>
    </NextAuthSessionProvider>
  );
}
