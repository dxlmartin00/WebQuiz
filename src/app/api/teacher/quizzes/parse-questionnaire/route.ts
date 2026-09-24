import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import mammoth from "mammoth";
import { parseQuestionnaireText } from "@/lib/questionnaire-parser";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
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

    const contentType = req.headers.get("content-type") || "";
    let extractedText = "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const textParam = formData.get("text") as string | null;

      if (file && file.size > 0) {
        const fileName = file.name.toLowerCase();
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (fileName.endsWith(".docx") || fileName.endsWith(".doc")) {
          const result = await mammoth.extractRawText({ buffer });
          extractedText = result.value;
        } else if (fileName.endsWith(".txt")) {
          extractedText = buffer.toString("utf-8");
        } else {
          return NextResponse.json(
            { error: "Unsupported file format. Please upload a .docx or .txt document, or paste the text directly." },
            { status: 400 }
          );
        }
      } else if (textParam) {
        extractedText = textParam;
      }
    } else {
      // JSON body with direct text paste
      const body = await req.json();
      extractedText = body.text || "";
    }

    if (!extractedText.trim()) {
      return NextResponse.json(
        { error: "No text or document content provided." },
        { status: 400 }
      );
    }

    const questions = parseQuestionnaireText(extractedText);

    if (questions.length === 0) {
      return NextResponse.json(
        {
          error:
            "Could not detect any numbered questions from the questionnaire. Please ensure questions are numbered (e.g., '1.', '2.') and multiple choice options have letters (e.g., 'A.', 'B.').",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      count: questions.length,
      questions,
    });
  } catch (error: any) {
    console.error("Parse questionnaire error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to parse questionnaire file." },
      { status: 500 }
    );
  }
}
