import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    // Google OAuth 2.0 Provider
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "placeholder-client-id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "placeholder-client-secret",
      allowDangerousEmailAccountLinking: true,
    }),
    // Direct Credentials Provider for Faculty Sign-In & Development
    CredentialsProvider({
      id: "teacher-credentials",
      name: "Teacher Account",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "teacher@school.edu" },
        name: { label: "Full Name", type: "text", placeholder: "Prof. Alan Turing" },
      },
      async authorize(credentials) {
        if (!credentials?.email) {
          return null;
        }

        const email = credentials.email.toLowerCase().trim();
        const name = credentials.name?.trim() || "Instructor";

        // Find or create Teacher record in DB
        let teacher = await prisma.teacher.findUnique({
          where: { email },
        });

        if (!teacher) {
          teacher = await prisma.teacher.create({
            data: {
              email,
              name,
            },
          });
        }

        return {
          id: teacher.id,
          name: teacher.name,
          email: teacher.email,
          image: teacher.avatar || undefined,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        try {
          const email = user.email.toLowerCase().trim();
          const existing = await prisma.teacher.findUnique({
            where: { email },
          });

          if (!existing) {
            await prisma.teacher.create({
              data: {
                email,
                name: user.name || "Teacher",
                googleId: account.providerAccountId,
                avatar: user.image,
              },
            });
          } else {
            await prisma.teacher.update({
              where: { email },
              data: {
                googleId: account.providerAccountId,
                avatar: user.image || existing.avatar,
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
        let teacher = await prisma.teacher.findUnique({
          where: { email },
        });

        if (!teacher) {
          teacher = await prisma.teacher.create({
            data: {
              email,
              name: session.user.name || "Instructor",
              avatar: session.user.image,
            },
          });
        }

        session.user.id = teacher.id;
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
