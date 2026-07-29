// src/lib/gigachat.ts — клиент для GigaChat API
// Поддержка: авторизация, автообновление токена, генерация контента

interface GigaChatToken {
  access_token: string;
  expires_at: number;
}

interface GenerateOptions {
  model?: string;      // GigaChat | GigaChat-Pro | GigaChat-Max
  temperature?: number;
  max_tokens?: number;
}

class GigaChatClient {
  private clientId: string;
  private clientSecret: string;
  private scope: string;
  private token: GigaChatToken | null = null;
  private baseUrl = "https://gigachat.devices.sberbank.ru/api/v1";
  private authUrl = "https://ngw.devices.sberbank.ru:9443/api/v2/oauth";

  constructor() {
    this.clientId = process.env.GIGACHAT_CLIENT_ID || "";
    this.clientSecret = process.env.GIGACHAT_CLIENT_SECRET || "";
    this.scope = process.env.GIGACHAT_SCOPE || "GIGACHAT_API_PERS";

    if (!this.clientId || !this.clientSecret) {
      throw new Error("GIGACHAT_CLIENT_ID and GIGACHAT_CLIENT_SECRET required");
    }
  }

  // Получение/обновление токена (живёт 30 минут)
  private async getToken(): Promise<string> {
    if (this.token && Date.now() < this.token.expires_at - 60000) {
      return this.token.access_token;
    }

    const authString = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");

    const response = await fetch(this.authUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${authString}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
        "RqUID": crypto.randomUUID(),
      },
      body: new URLSearchParams({ scope: this.scope }),
    });

    if (!response.ok) {
      throw new Error(`GigaChat auth failed: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    this.token = {
      access_token: data.access_token,
      expires_at: Date.now() + (data.expires_at * 1000 || 30 * 60 * 1000),
    };

    return this.token.access_token;
  }

  // Генерация текста
  async generate(prompt: string, options: GenerateOptions = {}): Promise<string> {
    const token = await this.getToken();

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        model: options.model || "GigaChat",
        messages: [
          { role: "system", content: "Ты — помощник врача-невролога. Пишешь только образовательный контент, не диагностируешь, не назначаешь лечение. Всегда добавляешь дисклеймер." },
          { role: "user", content: prompt },
        ],
        temperature: options.temperature ?? 0.7,
        max_tokens: options.max_tokens ?? 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`GigaChat generate failed: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  }

  // Генерация с учётом типа контента
  async generateContent(type: "article" | "telegram_post" | "meta" | "faq", topic: string): Promise<string> {
    const prompts: Record<string, string> = {
      article: `Ты — эксперт-невролог с 49-летним стажем, выпускница 1-го МГМУ им. Сеченова.
Напиши SEO-статью на тему "${topic}" для сайта doctorguryanova.ru.

Требования:
- Объём: 1500-2000 слов
- Структура: H2 заголовки, маркированные списки, жирный текст
- Ключевые слова: невролог, онлайн консультация, ${topic}
- Тон: профессиональный, но доступный пациенту
- В конце: призыв записаться на консультацию + телефон + сайт
- Дисклеймер: "Информация носит образовательный характер и не является медицинской услугой"
- НЕ диагностируй, НЕ назначай лечение — только образовательная информация`,

      telegram_post: `Напиши пост для Telegram-канала врача-невролога Гурьяновой В.А.
Тема: ${topic}

Формат:
- 1 короткий вводный абзац (хук)
- 3-5 практических советов
- Призыв к действию (запись на консультацию)
- Эмодзи, короткие предложения
- Не более 1500 символов
- Хэштеги: #невролог #здоровье`,

      meta: `Напиши meta description (150-160 символов) для страницы "${topic}".
Включи: невролог, онлайн консультация, ${topic}.
Призыв к действию в конце.`,

      faq: `Напиши вопрос и ответ FAQ на тему "${topic}" для сайта невролога.
Вопрос должен быть естественным (как задаёт пациент).
Ответ — профессиональный, но доступный, 100-150 слов.
В конце дисклеймер: "Консультация врача необходима для постановки диагноза."`,
    };

    return this.generate(prompts[type], {
      model: type === "article" ? "GigaChat-Pro" : "GigaChat",
      max_tokens: type === "article" ? 4000 : 2000,
    });
  }
}

export const gigachat = new GigaChatClient();
export default GigaChatClient;
