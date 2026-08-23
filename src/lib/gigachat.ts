// src/lib/gigachat.ts
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

    // Таймаут 30 секунд
    req.setTimeout(30000, () => {
      req.destroy(new Error("GigaChat request timeout (30s)"));
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
