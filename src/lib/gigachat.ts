// src/lib/gigachat.ts
// Клиент для GigaChat API (Sber)
// ВАЖНО: Sber выдаёт ID и Secret в перепутанном порядке.
// Для Basic Auth: decoded_secret (как username) : id (как password)

import https from "https";

function httpsRequest(options: https.RequestOptions, body?: string): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode || 0, data: data ? JSON.parse(data) : null });
        } catch {
          resolve({ status: res.statusCode || 0, data: data });
        }
      });
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

async function getAccessToken(): Promise<string> {
  const clientId = process.env.GIGACHAT_CLIENT_ID;
  const clientSecretRaw = process.env.GIGACHAT_CLIENT_SECRET;

  if (!clientId || !clientSecretRaw) {
    throw new Error("GIGACHAT_CLIENT_ID или GIGACHAT_CLIENT_SECRET не заданы");
  }

  const clientSecretDecoded = Buffer.from(clientSecretRaw, "base64").toString("utf8");
  const credentials = Buffer.from(`${clientSecretDecoded}:${clientId}`).toString("base64");

  const { status, data } = await httpsRequest(
    {
      hostname: "ngw.devices.sberbank.ru",
      port: 9443,
      path: "/api/v2/oauth",
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        Authorization: `Basic ${credentials}`,
        RqUID: crypto.randomUUID(),
      },
      rejectUnauthorized: false,
    },
    new URLSearchParams({ scope: process.env.GIGACHAT_SCOPE || "GIGACHAT_API_PERS" }).toString()
  );

  if (status !== 200) {
    throw new Error(`GigaChat auth error: ${status} ${JSON.stringify(data)}`);
  }

  return data.access_token;
}

async function chatRequest(token: string, body: object): Promise<any> {
  const payload = JSON.stringify(body);

  const { status, data } = await httpsRequest(
    {
      hostname: "gigachat.devices.sberbank.ru",
      port: 443,
      path: "/api/v1/chat/completions",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "Content-Length": Buffer.byteLength(payload),
      },
      rejectUnauthorized: false,
    },
    payload
  );

  if (status !== 200) {
    throw new Error(`GigaChat API error: ${status} ${JSON.stringify(data)}`);
  }

  return data;
}

export async function chatCompletion(options: {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
}) {
  const token = await getAccessToken();

  return chatRequest(token, {
    model: options.model || "GigaChat:latest",
    messages: options.messages,
    temperature: options.temperature ?? 0.3,
    max_tokens: options.max_tokens ?? 2048,
  });
}

export async function generateArticleFromAbstract(abstract: string, topic: string): Promise<string> {
  const result = await chatCompletion({
    messages: [
      {
        role: "system",
        content: `Ты — медицинский редактор сайта doctorguryanova.ru.
Врач: Гурьянова Валентина Андреевна, невролог, нутрициолог, рефлексотерапевт, 49 лет практики.`,
      },
      {
        role: "user",
        content: `Прочитай abstract и напиши обзор для пациентов на русском.

Тема: ${topic}

Инструкции:
1. НЕ копируй текст оригинала. Перескажи своими словами.
2. Структура: заголовок, о чём исследование, метод, результаты, ограничения, что значит для пациентов, ссылка на оригинал.
3. Объём: 400-600 слов.
4. Дисклеймер в конце.

Abstract:
${abstract}`,
      },
    ],
    temperature: 0.3,
    max_tokens: 2500,
  });

  return result.choices[0]?.message?.content ?? "";
}

export async function generateTelegramPost(articleText: string): Promise<string> {
  const result = await chatCompletion({
    messages: [
      { role: "system", content: "Ты — SMM-редактор медицинского Telegram-канала." },
      {
        role: "user",
        content: `Напиши пост для Telegram (макс. 800 символов) на основе статьи:\n\n${articleText.slice(0, 2000)}`,
      },
    ],
    temperature: 0.5,
    max_tokens: 800,
  });

  return result.choices[0]?.message?.content ?? "";
}

export async function generateSEOMeta(articleText: string, topic: string) {
  const result = await chatCompletion({
    messages: [
      { role: "system", content: "Ты — SEO-специалист." },
      {
        role: "user",
        content: `Для статьи "${topic}" сгенерируй:
1. Title (50-60 символов)
2. Meta description (150-160)
3. Ключевые слова (10-15)

Статья: ${articleText.slice(0, 1500)}`,
      },
    ],
    temperature: 0.3,
    max_tokens: 500,
  });

  const text = result.choices[0]?.message?.content ?? "";
  const titleMatch = text.match(/Title:\s*(.+)/i);
  const descMatch = text.match(/Description:\s*(.+)/i);
  const kwMatch = text.match(/Keywords?:\s*(.+)/i);

  return {
    title: titleMatch?.[1]?.trim() ?? topic,
    description: descMatch?.[1]?.trim() ?? `Статья о ${topic}`,
    keywords: kwMatch?.[1]?.trim() ?? topic,
  };
}
