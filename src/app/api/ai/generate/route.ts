export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import {
  generateArticleFromAbstract,
  generateTelegramPost,
  generateSEOMeta,
} from "@/lib/gigachat";

const ALLOWED_TYPES = ["article", "telegram", "seo"] as const;
type GenerateType = (typeof ALLOWED_TYPES)[number];

interface GenerateRequest {
  type: GenerateType;
  abstract?: string;
  topic: string;
  articleText?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();

    if (!body.type || !ALLOWED_TYPES.includes(body.type)) {
      return NextResponse.json(
        { error: `type должен быть одним из: ${ALLOWED_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    if (!body.topic || body.topic.trim().length < 3) {
      return NextResponse.json(
        { error: "topic обязателен (минимум 3 символа)" },
        { status: 400 }
      );
    }

    let result: { content: string; meta?: Record<string, string> } = { content: "" };

    switch (body.type) {
      case "article": {
        if (!body.abstract || body.abstract.trim().length < 50) {
          return NextResponse.json(
            { error: "abstract обязателен для type=article (минимум 50 символов)" },
            { status: 400 }
          );
        }
        const content = await generateArticleFromAbstract(body.abstract, body.topic);
        result = { content };
        break;
      }

      case "telegram": {
        if (!body.articleText || body.articleText.trim().length < 100) {
          return NextResponse.json(
            { error: "articleText обязателен для type=telegram (минимум 100 символов)" },
            { status: 400 }
          );
        }
        const content = await generateTelegramPost(body.articleText);
        result = { content };
        break;
      }

      case "seo": {
        if (!body.articleText || body.articleText.trim().length < 100) {
          return NextResponse.json(
            { error: "articleText обязателен для type=seo (минимум 100 символов)" },
            { status: 400 }
          );
        }
        const meta = await generateSEOMeta(body.articleText, body.topic);
        result = { content: "SEO-мета сгенерированы", meta };
        break;
      }
    }

    return NextResponse.json({
      success: true,
      type: body.type,
      topic: body.topic,
      ...result,
    });
  } catch (error) {
    console.error("[GigaChat API Error]", error);
    return NextResponse.json(
      {
        error: "Ошибка генерации контента",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
