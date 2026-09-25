import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isSystemAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = session.user.email.toLowerCase().trim();
  const isAdmin = isSystemAdmin(email);

  const teacher = await prisma.teacher.findUnique({
    where: { email },
  });

  if (!teacher || (!teacher.isApproved && !isAdmin)) {
    return NextResponse.json({ error: "Unauthorized or pending approval" }, { status: 403 });
  }

  const isUserAdmin = isAdmin || teacher.role === "ADMIN";
  const { id: subjectId } = await params;

  // Strict ownership check (Admins can manage any subject)
  const subject = await prisma.subject.findFirst({
    where: isUserAdmin ? { id: subjectId } : { id: subjectId, teacherId: teacher.id },
  });

  if (!subject) {
    return NextResponse.json({ error: "Subject not found or unauthorized" }, { status: 404 });
  }

  const body = await req.json();

  try {
    const students: { studentIdNumber: string; studentName: string }[] = [];

    if (body.students && Array.isArray(body.students)) {
      for (const s of body.students) {
        if (s.studentIdNumber) {
          students.push({
            studentIdNumber: s.studentIdNumber.trim().toUpperCase(),
            studentName: s.studentName?.trim() || "Student",
          });
        }
      }
    } else if (body.rawCsvText) {
      const lines = body.rawCsvText.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;

        const parts = trimmed.split(",");
        if (parts.length >= 2) {
          const studentId = parts[0].trim().toUpperCase();
          const studentName = parts.slice(1).join(",").trim();
          if (studentId && studentName) {
            students.push({ studentIdNumber: studentId, studentName });
          }
        } else if (parts.length === 1 && parts[0].trim()) {
          students.push({
            studentIdNumber: parts[0].trim().toUpperCase(),
            studentName: "Student",
          });
        }
      }
    } else if (body.studentIdNumber) {
      students.push({
        studentIdNumber: body.studentIdNumber.trim().toUpperCase(),
        studentName: body.studentName?.trim() || "Student",
      });
    }

    if (students.length === 0) {
      return NextResponse.json(
        { error: "No valid student entries provided" },
        { status: 400 }
      );
    }

    let addedCount = 0;
    for (const student of students) {
      await prisma.enrollment.upsert({
        where: {
          subjectId_studentIdNumber: {
            subjectId,
            studentIdNumber: student.studentIdNumber,
          },
        },
        update: {
          studentName: student.studentName,
        },
        create: {
          subjectId,
          studentIdNumber: student.studentIdNumber,
          studentName: student.studentName,
        },
      });
      addedCount++;
    }

    const updatedEnrollments = await prisma.enrollment.findMany({
      where: { subjectId },
      orderBy: { studentIdNumber: "asc" },
    });

    return NextResponse.json({
      success: true,
      addedCount,
      enrollments: updatedEnrollments,
    });
  } catch (error) {
    console.error("Roster update error:", error);
    return NextResponse.json({ error: "Failed to update roster" }, { status: 500 });
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

  const email = session.user.email.toLowerCase().trim();
  const isAdmin = isSystemAdmin(email);

  const teacher = await prisma.teacher.findUnique({
    where: { email },
  });

  if (!teacher || (!teacher.isApproved && !isAdmin)) {
    return NextResponse.json({ error: "Unauthorized or pending approval" }, { status: 403 });
  }

  const isUserAdmin = isAdmin || teacher.role === "ADMIN";
  const { id: subjectId } = await params;

  // Strict ownership check (Admins can manage any subject)
  const subject = await prisma.subject.findFirst({
    where: isUserAdmin ? { id: subjectId } : { id: subjectId, teacherId: teacher.id },
  });

  if (!subject) {
    return NextResponse.json({ error: "Subject not found or unauthorized" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  let studentIdNumber = searchParams.get("studentIdNumber") || searchParams.get("idNumber");

  if (!studentIdNumber) {
    try {
      const body = await req.json();
      studentIdNumber = body.studentIdNumber || body.idNumber;
    } catch {
      // body might not be provided
    }
  }

  if (!studentIdNumber) {
    return NextResponse.json(
      { error: "studentIdNumber is required" },
      { status: 400 }
    );
  }

  try {
    await prisma.enrollment.deleteMany({
      where: {
        subjectId,
        studentIdNumber: studentIdNumber.trim().toUpperCase(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove student error:", error);
    return NextResponse.json({ error: "Failed to remove student" }, { status: 500 });
  }
}
