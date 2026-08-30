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

  const { id } = await params;
  const subject = await prisma.subject.findUnique({
    where: { id },
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
    return NextResponse.json({ error: "Subject not found" }, { status: 404 });
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

  const { id } = await params;
  const body = await req.json();
  const { title, description } = body;

  try {
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

  const { id } = await params;
  try {
    await prisma.subject.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete subject error:", error);
    return NextResponse.json({ error: "Failed to delete subject" }, { status: 500 });
  }
}
