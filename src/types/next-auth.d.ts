import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      isApproved?: boolean;
      role?: string;
    } & DefaultSession["user"];
  }

  interface User {
    id?: string;
    isApproved?: boolean;
    role?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    isApproved?: boolean;
    role?: string;
  }
}
