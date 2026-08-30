"use client";

import React, { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { GraduationCap, ArrowRight, ShieldCheck, Mail, AlertCircle, Info } from "lucide-react";

function TeacherLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authError = searchParams.get("error");

  const [email, setEmail] = useState("teacher@school.edu");
  const [name, setName] = useState("Prof. Alan Turing");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authError) {
      if (authError === "OAuthSignin" || authError === "OAuthCallback" || authError === "Configuration") {
        setError(
          "Google OAuth requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET configured in .env. You can also sign in directly using the Faculty form below."
        );
      } else {
        setError(`Authentication issue (${authError}). Please try again or use direct sign-in.`);
      }
    }
  }, [authError]);

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await signIn("teacher-credentials", {
        email,
        name,
        redirect: false,
      });

      if (res?.error) {
        throw new Error(res.error);
      }

      router.push("/teacher/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to authenticate instructor.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    signIn("google", { callbackUrl: "/teacher/dashboard" });
  };

  return (
    <div className="flat-card border-2 border-slate-900 bg-white p-6 sm:p-8">
      <div className="text-center pb-5 border-b border-slate-200 mb-6">
        <div className="w-12 h-12 bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mx-auto mb-3">
          <GraduationCap className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Faculty Authentication
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Sign in to manage classes, publish quizzes, and view integrity logs.
        </p>
      </div>

      {error && (
        <div className="mb-5 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{error}</span>
        </div>
      )}

      {/* Google OAuth Button */}
      <div className="space-y-4">
        <button
          onClick={handleGoogleLogin}
          type="button"
          className="flat-button-secondary w-full py-2.5 text-sm font-semibold flex items-center justify-center gap-2.5 border-slate-300 hover:bg-slate-50 min-h-[44px] touch-manipulation"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.36 7.33 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.94 0 12c0 2.06.46 3.84 1.26 5.42l4.02-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.25 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
          <span>Sign in with Google</span>
        </button>

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="flex-shrink mx-3 text-slate-400 text-xs uppercase tracking-wider font-semibold">
            Or Direct Faculty Sign-In
          </span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        {/* Direct Faculty Form */}
        <form onSubmit={handleCredentialsLogin} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Faculty Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Prof. Alan Turing"
              className="flat-input text-sm py-2.5"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Institutional Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teacher@school.edu"
              className="flat-input text-sm py-2.5 font-mono"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flat-button-dark w-full py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 mt-4 min-h-[46px] touch-manipulation"
          >
            <span>{loading ? "Authenticating..." : "Enter Faculty Portal"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

export default function TeacherLoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Navigation */}
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

          <Link
            href="/"
            className="flat-button-secondary text-xs py-1.5 px-3"
          >
            &larr; Student Portal
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-md w-full mx-auto px-4 py-6 sm:py-10">
        <Suspense fallback={<div className="text-center p-8 text-xs font-mono text-slate-500">Loading sign in...</div>}>
          <TeacherLoginForm />
        </Suspense>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        WebQuiz Faculty Management System &bull; Secure Academic Platform
      </footer>
    </div>
  );
}
