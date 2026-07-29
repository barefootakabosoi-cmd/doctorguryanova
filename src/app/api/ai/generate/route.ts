// src/app/api/ai/generate/route.ts
// API для генерации контента через ИИ
// POST /api/ai/generate
// Body: { type: "article" | "telegram_post" | "meta" | "faq", topic: string }

import { NextRequest, NextResponse } from "next/server";
import { gigachat } from "@/lib/gigachat";

export async function POST(req: NextRequest) {
  try {
    const { type, topic } = await req.json();

    if (!type || !topic) {
      return NextResponse.json(
        { error: "Missing required fields: type, topic" },
        { status: 400 }
      );
    }

    const validTypes = ["article", "telegram_post", "meta", "faq"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    const content = await gigachat.generateContent(type as any, topic);

    return NextResponse.json({
      success: true,
      type,
      topic,
      content,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("AI generation error:", error);
    return NextResponse.json(
      { error: error.message || "Generation failed" },
      { status: 500 }
    );
  }
}
