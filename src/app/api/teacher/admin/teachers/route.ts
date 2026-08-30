import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify Admin role
  const currentUser = await prisma.teacher.findUnique({
    where: { email: session.user.email.toLowerCase().trim() },
  });

  if (currentUser?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Admin privileges required." }, { status: 403 });
  }

  try {
    const teachers = await prisma.teacher.findMany({
      include: {
        _count: {
          select: { subjects: true },
        },
      },
      orderBy: [
        { isApproved: "asc" }, // Unapproved first
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({ teachers });
  } catch (error) {
    console.error("Admin fetch teachers error:", error);
    return NextResponse.json({ error: "Failed to load teachers" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentUser = await prisma.teacher.findUnique({
    where: { email: session.user.email.toLowerCase().trim() },
  });

  if (currentUser?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Admin privileges required." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { teacherId, isApproved } = body;

    if (!teacherId || typeof isApproved !== "boolean") {
      return NextResponse.json({ error: "Missing teacherId or isApproved status." }, { status: 400 });
    }

    const updated = await prisma.teacher.update({
      where: { id: teacherId },
      data: { isApproved },
    });

    return NextResponse.json({ success: true, teacher: updated });
  } catch (error) {
    console.error("Admin update teacher error:", error);
    return NextResponse.json({ error: "Failed to update teacher approval status." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentUser = await prisma.teacher.findUnique({
    where: { email: session.user.email.toLowerCase().trim() },
  });

  if (currentUser?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Admin privileges required." }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const teacherId = searchParams.get("teacherId");

    if (!teacherId) {
      return NextResponse.json({ error: "Missing teacherId." }, { status: 400 });
    }

    if (teacherId === currentUser.id) {
      return NextResponse.json({ error: "Cannot delete your own admin account." }, { status: 400 });
    }

    await prisma.teacher.delete({
      where: { id: teacherId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin delete teacher error:", error);
    return NextResponse.json({ error: "Failed to delete teacher account." }, { status: 500 });
  }
}
