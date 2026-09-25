import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "lummartin@nemsu.edu.ph").toLowerCase().trim();
const ADMIN_EMAILS = new Set([
  ADMIN_EMAIL,
  "lummartin@nemsu.edu.ph",
  "dxlmartin0@gmail.com",
]);

export function isSystemAdmin(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.has(email.toLowerCase().trim());
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        try {
          const email = user.email.toLowerCase().trim();
          const isAdmin = isSystemAdmin(email);

          await prisma.teacher.upsert({
            where: { email },
            update: {
              googleId: account.providerAccountId,
              avatar: user.image,
              role: isAdmin ? "ADMIN" : undefined,
              isApproved: isAdmin ? true : undefined,
            },
            create: {
              email,
              name: user.name || "Faculty Member",
              googleId: account.providerAccountId,
              avatar: user.image,
              role: isAdmin ? "ADMIN" : "TEACHER",
              isApproved: isAdmin ? true : false,
            },
          });
        } catch (e) {
          console.error("Error in signIn upsert:", e);
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      // ONLY perform DB operations on INITIAL sign-in when `user` is provided!
      // On all subsequent requests, token decoding is 100% in-memory (0ms latency).
      if (user && user.email) {
        const email = user.email.toLowerCase().trim();
        token.email = email;
        const isAdmin = isSystemAdmin(email);

        try {
          let teacher = await prisma.teacher.findUnique({
            where: { email },
            select: { id: true, role: true, isApproved: true },
          });

          if (!teacher) {
            teacher = await prisma.teacher.create({
              data: {
                email,
                name: user.name || "Faculty Member",
                googleId: account?.providerAccountId,
                avatar: user.image,
                role: isAdmin ? "ADMIN" : "TEACHER",
                isApproved: isAdmin ? true : false,
              },
              select: { id: true, role: true, isApproved: true },
            });
          }

          token.id = teacher.id;
          token.role = isAdmin ? "ADMIN" : teacher.role;
          token.isApproved = isAdmin ? true : teacher.isApproved;
        } catch (err) {
          console.error("JWT teacher sync error:", err);
          if (isAdmin) {
            token.role = "ADMIN";
            token.isApproved = true;
          }
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.email) {
        session.user.id = (token.id as string) || (token.sub as string);
        session.user.role = (token.role as string) || "TEACHER";
        session.user.isApproved = token.isApproved !== undefined ? (token.isApproved as boolean) : false;
        session.user.email = token.email as string;

        const email = (token.email as string).toLowerCase().trim();
        if (isSystemAdmin(email)) {
          session.user.role = "ADMIN";
          session.user.isApproved = true;
        }
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/teacher/login",
    error: "/teacher/login",
  },
  secret: process.env.NEXTAUTH_SECRET || "webquiz-super-secret-production-key-2026-secure",
};
