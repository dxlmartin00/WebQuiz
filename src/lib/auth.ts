import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "lummartin@nemsu.edu.ph").toLowerCase().trim();

export const authOptions: NextAuthOptions = {
  providers: [
    // Google OAuth 2.0 Provider
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
          const isAdmin = email === ADMIN_EMAIL || email === "lummartin@nemsu.edu.ph";

          const existing = await prisma.teacher.findUnique({
            where: { email },
          });

          if (!existing) {
            await prisma.teacher.create({
              data: {
                email,
                name: user.name || "Faculty Member",
                googleId: account.providerAccountId,
                avatar: user.image,
                role: isAdmin ? "ADMIN" : "TEACHER",
                isApproved: isAdmin ? true : false, // Admin is auto-approved; other teachers require approval
              },
            });
          } else {
            await prisma.teacher.update({
              where: { email },
              data: {
                googleId: account.providerAccountId,
                avatar: user.image || existing.avatar,
                role: isAdmin ? "ADMIN" : existing.role,
                isApproved: isAdmin ? true : existing.isApproved,
              },
            });
          }
        } catch (e) {
          console.error("Error creating/updating Google teacher:", e);
        }
      }
      return true;
    },
    async session({ session, token }) {
      if (session.user && session.user.email) {
        const email = session.user.email.toLowerCase().trim();
        const isAdmin = email === ADMIN_EMAIL || email === "lummartin@nemsu.edu.ph";

        let teacher = await prisma.teacher.findUnique({
          where: { email },
        });

        if (!teacher) {
          teacher = await prisma.teacher.create({
            data: {
              email,
              name: session.user.name || "Faculty Member",
              avatar: session.user.image,
              role: isAdmin ? "ADMIN" : "TEACHER",
              isApproved: isAdmin ? true : false,
            },
          });
        }

        session.user.id = teacher.id;
        session.user.role = teacher.role;
        session.user.isApproved = teacher.isApproved;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
  },
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/teacher/login",
    error: "/teacher/login",
  },
  secret: process.env.NEXTAUTH_SECRET || "webquiz-super-secret-production-key-2026-secure",
};
