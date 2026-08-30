import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/providers/SessionProvider";

export const metadata: Metadata = {
  title: "WebQuiz - Modern Quiz & Exam Management Platform",
  description: "Secure, responsive, and authoritative quiz management system with automated grading and integrity monitoring.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 selection:bg-indigo-500 selection:text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
