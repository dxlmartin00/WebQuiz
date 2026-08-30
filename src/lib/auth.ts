import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "lummartin@nemsu.edu.ph").toLowerCase().trim();

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
                isApproved: isAdmin ? true : false,
              },
            });
          } else {
            await prisma.teacher.update({
              where: { email },
              data: {
                googleId: account.providerAccountId || existing.googleId,
                avatar: user.image || existing.avatar,
                role: isAdmin ? "ADMIN" : existing.role,
                isApproved: isAdmin ? true : existing.isApproved,
              },
            });
          }
        } catch (e) {
          console.error("Error creating/updating Google teacher in signIn callback:", e);
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      // Runs on initial sign in and every subsequent request
      if (user && user.email) {
        token.email = user.email.toLowerCase().trim();
      }

      if (token.email) {
        const email = token.email.toLowerCase().trim();
        const isAdmin = email === ADMIN_EMAIL || email === "lummartin@nemsu.edu.ph";

        try {
          let teacher = await prisma.teacher.findUnique({
            where: { email },
          });

          if (!teacher) {
            teacher = await prisma.teacher.create({
              data: {
                email,
                name: token.name || "Faculty Member",
                googleId: account?.providerAccountId,
                avatar: token.picture as string | undefined,
                role: isAdmin ? "ADMIN" : "TEACHER",
                isApproved: isAdmin ? true : false,
              },
            });
          }

          token.id = teacher.id;
          token.role = teacher.role;
          token.isApproved = teacher.isApproved;
        } catch (err) {
          console.error("JWT teacher sync error:", err);
          // Fallback values so user is never locked out
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

        // If admin email, ensure always approved
        const email = (token.email as string).toLowerCase().trim();
        if (email === ADMIN_EMAIL || email === "lummartin@nemsu.edu.ph") {
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
