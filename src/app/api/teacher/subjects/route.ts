import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const teacher = await prisma.teacher.findUnique({
    where: { email: session.user.email.toLowerCase().trim() },
  });

  if (!teacher) {
    return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });
  }

  if (!teacher.isApproved) {
    return NextResponse.json({ error: "Account pending administrator approval" }, { status: 403 });
  }

  // Multi-tenant isolation: Only fetch classes belonging strictly to THIS teacher
  const subjects = await prisma.subject.findMany({
    where: { teacherId: teacher.id },
    include: {
      _count: {
        select: {
          enrollments: true,
          quizzes: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ subjects });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const teacher = await prisma.teacher.findUnique({
    where: { email: session.user.email.toLowerCase().trim() },
  });

  if (!teacher) {
    return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });
  }

  if (!teacher.isApproved) {
    return NextResponse.json({ error: "Account pending administrator approval" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { subjectCode, title, description } = body;

    if (!subjectCode || !title) {
      return NextResponse.json(
        { error: "Subject Code and Title are required" },
        { status: 400 }
      );
    }

    const cleanCode = subjectCode.trim().toUpperCase();

    // Check if code already exists for THIS teacher
    const existing = await prisma.subject.findUnique({
      where: {
        teacherId_subjectCode: {
          teacherId: teacher.id,
          subjectCode: cleanCode,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `You already have a class with subject code '${cleanCode}'.` },
        { status: 409 }
      );
    }

    const subject = await prisma.subject.create({
      data: {
        teacherId: teacher.id,
        subjectCode: cleanCode,
        title: title.trim(),
        description: description?.trim() || null,
      },
    });

    return NextResponse.json({ subject }, { status: 201 });
  } catch (error) {
    console.error("Create subject error:", error);
    return NextResponse.json({ error: "Failed to create subject" }, { status: 500 });
  }
}
