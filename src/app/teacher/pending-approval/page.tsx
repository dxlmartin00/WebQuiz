"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Clock, ShieldAlert, LogOut, RefreshCw, CheckCircle2 } from "lucide-react";

export default function PendingApprovalPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const isNavigatingRef = useRef(false);

  // Background silent polling without NextAuth loading flickers
  useEffect(() => {
    let isMounted = true;

    async function checkApprovalStatus() {
      if (isNavigatingRef.current) return;

      try {
        const res = await fetch("/api/teacher/auth-status", {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });
        if (!res.ok) return;

        const data = await res.json();
        if (data.isApproved && isMounted && !isNavigatingRef.current) {
          isNavigatingRef.current = true;
          setIsApproved(true);
          try {
            await update();
          } catch {}
          router.replace("/teacher/dashboard");
        }
      } catch {
        // Silently continue polling
      }
    }

    // Check immediately once on mount
    checkApprovalStatus();

    // Poll silently every 3 seconds
    const interval = setInterval(checkApprovalStatus, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [update, router]);

  const handleManualCheck = async () => {
    if (checking || isNavigatingRef.current) return;
    setChecking(true);

    try {
      const res = await fetch("/api/teacher/auth-status", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.isApproved) {
          isNavigatingRef.current = true;
          setIsApproved(true);
          try {
            await update();
          } catch {}
          router.replace("/teacher/dashboard");
          return;
        }
      }
    } catch {}
    finally {
      setTimeout(() => setChecking(false), 600);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-slate-900 text-white flex items-center justify-center font-bold text-sm sm:text-base border border-slate-700">
              W
            </div>
            <span className="font-bold text-slate-900 tracking-tight text-base sm:text-lg">
              WebQuiz
            </span>
          </Link>

          <button
            onClick={() => signOut({ callbackUrl: "/teacher/login" })}
            className="flat-button-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-lg w-full mx-auto px-4 py-8 sm:py-16">
        {isApproved ? (
          <div className="flat-card border-2 border-emerald-500 bg-white p-6 sm:p-8 space-y-6 text-center shadow-lg animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <span className="flat-badge-green text-xs font-mono font-bold">
                Account Approved
              </span>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Welcome to WebQuiz!
              </h1>
              <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                Your faculty account has been approved by the administrator. Entering dashboard...
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs font-mono text-emerald-700">
              <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent animate-spin rounded-full" />
              <span>Redirecting...</span>
            </div>
          </div>
        ) : (
          <div className="flat-card border-2 border-amber-500 bg-white p-6 sm:p-8 space-y-6 text-center shadow-lg">
            <div className="w-14 h-14 bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
              <Clock className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="flat-badge-amber text-xs font-mono font-bold">
                Verification Required
              </span>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Faculty Account Pending Approval
              </h1>
              <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                Your Google account <b className="text-slate-900 font-mono">{session?.user?.email || "..."}</b> has been registered successfully.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 text-left text-xs text-slate-600 space-y-2">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Administrator Authorization Required</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                To maintain academic integrity and prevent unauthorized access, all faculty accounts must be approved by the system administrator (<b className="text-slate-700">Luigie Martin</b>).
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={handleManualCheck}
                disabled={checking}
                className="flat-button-primary text-xs py-2 px-4 w-full sm:w-auto font-bold flex items-center justify-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${checking ? "animate-spin" : ""}`} />
                <span>{checking ? "Checking Approval..." : "Check Status Again"}</span>
              </button>

              <button
                onClick={() => signOut({ callbackUrl: "/teacher/login" })}
                className="flat-button-secondary text-xs py-2 px-4 w-full sm:w-auto font-semibold"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        WebQuiz Academic Platform &bull; Security &amp; Access Control
      </footer>
    </div>
  );
}
