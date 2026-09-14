import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import mammoth from "mammoth";
import { parseDocxQuestions } from "@/lib/docx-parser";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const teacherId = session?.user?.id;
  const isApproved = (session?.user as any)?.isApproved;

  if (!teacherId || !session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isApproved) {
    return NextResponse.json(
      { error: "Unauthorized or pending approval" },
      { status: 403 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".docx")) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload a Microsoft Word (.docx) file." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { value: rawText } = await mammoth.extractRawText({ buffer });

    if (!rawText || !rawText.trim()) {
      return NextResponse.json(
        { error: "The uploaded document contains no readable text." },
        { status: 400 }
      );
    }

    const result = parseDocxQuestions(rawText);

    if (result.questions.length === 0) {
      return NextResponse.json(
        {
          error:
            "No quiz items were detected in the document. Please ensure questions are numbered (e.g. '1. Question prompt...') followed by options (A, B, C, D) or statements.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      questions: result.questions,
      summary: result.summary,
    });
  } catch (error: any) {
    console.error("Docx parsing error:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred while parsing the Word document." },
      { status: 500 }
    );
  }
}
