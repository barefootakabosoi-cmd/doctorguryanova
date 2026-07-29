// src/app/api/ai/generate/route.ts
// API для генерации контента через ИИ
// Ленивая инициализация — клиент создаётся только при вызове

import { NextRequest, NextResponse } from "next/server";
import GigaChatClient from "@/lib/gigachat";

// Ленивый клиент — создаётся только при первом вызове
let gigachatClient: GigaChatClient | null = null;

function getClient(): GigaChatClient {
  if (!gigachatClient) {
    gigachatClient = new GigaChatClient();
  }
  return gigachatClient;
}

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

    const client = getClient();
    const content = await client.generateContent(type as any, topic);

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
