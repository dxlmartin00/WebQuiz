import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateQuizGradebookExcel } from "@/lib/excel";
import { format } from "date-fns";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: quizId } = await params;

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      subject: {
        include: {
          enrollments: true,
        },
      },
      questions: {
        orderBy: { orderIndex: "asc" },
      },
      submissions: {
        include: {
          answers: {
            include: {
              question: true,
            },
          },
          violationLogs: {
            orderBy: { timestamp: "asc" },
          },
        },
        orderBy: { score: "desc" },
      },
    },
  });

  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  const totalQuizPoints = quiz.questions.reduce((sum, q) => sum + q.points, 0);

  // Map enrolled students
  const submissionMap = new Map();
  for (const s of quiz.submissions) {
    submissionMap.set(s.studentIdNumber, s);
  }

  const records = quiz.subject.enrollments.map((enrolled) => {
    const sub = submissionMap.get(enrolled.studentIdNumber);
    const score = sub ? sub.score : 0;
    const percentage = sub && totalQuizPoints > 0 ? (sub.score / totalQuizPoints) * 100 : 0;

    let durationMins: number | string = "-";
    if (sub?.startedAt && sub?.submittedAt) {
      const diffMs = new Date(sub.submittedAt).getTime() - new Date(sub.startedAt).getTime();
      durationMins = (diffMs / (1000 * 60)).toFixed(1);
    }

    return {
      studentIdNumber: enrolled.studentIdNumber,
      studentName: enrolled.studentName,
      score,
      totalPoints: totalQuizPoints,
      percentage,
      status: sub ? sub.status : "NOT_STARTED",
      startedAt: sub?.startedAt ? format(new Date(sub.startedAt), "yyyy-MM-dd HH:mm:ss") : "-",
      submittedAt: sub?.submittedAt ? format(new Date(sub.submittedAt), "yyyy-MM-dd HH:mm:ss") : "-",
      durationMinutes: durationMins,
      violationCount: sub ? sub.violationCount : 0,
      isFlagged: sub && sub.violationCount > 0 ? `FLAGGED (${sub.violationCount})` : "CLEAN",
    };
  });

  // Collect question breakdown
  const questionBreakdown: any[] = [];
  for (const sub of quiz.submissions) {
    for (let i = 0; i < sub.answers.length; i++) {
      const ans = sub.answers[i];
      let correctAnswersStr = "";
      try {
        const parsed = JSON.parse(ans.question.correctAnswers);
        correctAnswersStr = parsed.join(" | ");
      } catch {
        correctAnswersStr = ans.question.correctAnswers;
      }

      questionBreakdown.push({
        studentIdNumber: sub.studentIdNumber,
        studentName: sub.studentName || "-",
        questionNumber: i + 1,
        prompt: ans.question.prompt,
        type: ans.question.type,
        studentAnswer: ans.studentAnswer,
        correctAnswer: correctAnswersStr,
        matchType: ans.matchType || (ans.isCorrect ? "EXACT" : "INCORRECT"),
        pointsAwarded: ans.pointsAwarded,
      });
    }
  }

  // Collect violation logs
  const violations: any[] = [];
  for (const sub of quiz.submissions) {
    for (const v of sub.violationLogs) {
      violations.push({
        studentIdNumber: sub.studentIdNumber,
        studentName: sub.studentName || "-",
        eventType: v.eventType,
        details: v.details || "-",
        timestamp: format(new Date(v.timestamp), "yyyy-MM-dd HH:mm:ss"),
      });
    }
  }

  const excelBuffer = generateQuizGradebookExcel({
    quizTitle: quiz.title,
    subjectCode: quiz.subject.subjectCode,
    subjectTitle: quiz.subject.title,
    totalQuestions: quiz.questions.length,
    totalQuizPoints,
    records,
    questionBreakdown,
    violations,
  });

  const filename = `${quiz.subject.subjectCode}_${quiz.title.replace(/[^a-zA-Z0-9]/g, "_")}_Gradebook.xlsx`;

  return new NextResponse(excelBuffer as any, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
