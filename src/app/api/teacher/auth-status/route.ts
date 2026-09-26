import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { authenticated: false, isApproved: false, isDeleted: true },
        { status: 401 }
      );
    }

    const email = session.user.email.toLowerCase().trim();
    const teacher = await prisma.teacher.findUnique({
      where: { email },
      select: { id: true, isApproved: true, role: true },
    });

    if (!teacher) {
      return NextResponse.json(
        {
          authenticated: false,
          isApproved: false,
          isDeleted: true,
          error: "Account has been deleted by an administrator.",
        },
        {
          status: 401,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
          },
        }
      );
    }

    return NextResponse.json(
      {
        authenticated: true,
        isApproved: !!teacher.isApproved,
        role: teacher.role,
        isDeleted: false,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      }
    );
  } catch (error) {
    console.error("Auth status check error:", error);
    return NextResponse.json(
      { authenticated: false, isApproved: false, error: "Server error" },
      { status: 500 }
    );
  }
}
