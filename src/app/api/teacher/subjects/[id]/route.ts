import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const teacher = await prisma.teacher.findUnique({
    where: { email: session.user.email.toLowerCase().trim() },
  });

  if (!teacher || !teacher.isApproved) {
    return NextResponse.json({ error: "Unauthorized or pending approval" }, { status: 403 });
  }

  const { id } = await params;
  const subject = await prisma.subject.findFirst({
    where: {
      id,
      teacherId: teacher.id, // Strictly owner only
    },
    include: {
      enrollments: {
        orderBy: { studentIdNumber: "asc" },
      },
      quizzes: {
        include: {
          _count: {
            select: { questions: true, submissions: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!subject) {
    return NextResponse.json({ error: "Subject not found or access denied." }, { status: 404 });
  }

  return NextResponse.json({ subject });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const teacher = await prisma.teacher.findUnique({
    where: { email: session.user.email.toLowerCase().trim() },
  });

  if (!teacher || !teacher.isApproved) {
    return NextResponse.json({ error: "Unauthorized or pending approval" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { title, description } = body;

  try {
    const existing = await prisma.subject.findFirst({
      where: { id, teacherId: teacher.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Subject not found or unauthorized." }, { status: 404 });
    }

    const updated = await prisma.subject.update({
      where: { id },
      data: {
        title: title?.trim(),
        description: description?.trim() || null,
      },
    });

    return NextResponse.json({ subject: updated });
  } catch (error) {
    console.error("Update subject error:", error);
    return NextResponse.json({ error: "Failed to update subject" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const teacher = await prisma.teacher.findUnique({
    where: { email: session.user.email.toLowerCase().trim() },
  });

  if (!teacher || !teacher.isApproved) {
    return NextResponse.json({ error: "Unauthorized or pending approval" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const existing = await prisma.subject.findFirst({
      where: { id, teacherId: teacher.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Subject not found or unauthorized." }, { status: 404 });
    }

    await prisma.subject.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete subject error:", error);
    return NextResponse.json({ error: "Failed to delete subject" }, { status: 500 });
  }
}
