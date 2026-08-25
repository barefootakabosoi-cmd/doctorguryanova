import { z } from "zod";

/**
 * Серверные zod-схемы для всех POST-роутов.
 * Валидация входа — единая точка: схема -> данные либо 400 с сообщением.
 */
export async function parseBody<T extends z.ZodTypeAny>(
  request: Request,
  schema: T
): Promise<{ ok: true; data: z.infer<T> } | { ok: false; response: Response }> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return {
      ok: false,
      response: Response.json({ error: "Некорректный JSON" }, { status: 400 }),
    };
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message || "Некорректные данные";
    return {
      ok: false,
      response: Response.json({ error: msg }, { status: 400 }),
    };
  }
  return { ok: true, data: parsed.data };
}

const phoneUa = z
  .string()
  .min(10, "Введите телефон")
  .max(20, "Слишком длинный номер телефона");

/** POST /api/booking */
export const bookingSchema = z.object({
  direction: z.string().min(1, "Выберите направление").max(100),
  date: z.string().min(1, "Выберите дату").max(10),
  time: z.string().min(1, "Выберите время").max(5),
  symptoms: z.string().max(3000, "Описание слишком длинное").optional(),
  name: z.string().min(2, "Введите имя (минимум 2 символа)").max(100),
  phone: phoneUa,
  email: z.string().email("Некорректный email").optional().or(z.literal("")),
  consent: z.literal(true, {
    errorMap: () => ({ message: "Требуется согласие на обработку данных" }),
  }),
  website: z.string().optional(), // honeypot
});

/** POST /api/payment/create */
export const paymentCreateSchema = z.object({
  serviceId: z.string().min(1).max(50),
  returnUrl: z.string().url().optional(),
  bookingId: z.string().min(1).max(64),
  email: z.string().email("Некорректный email").optional().or(z.literal("")),
});

/** POST /api/ai/generate */
export const aiGenerateSchema = z.object({
  topic: z.string().min(1, "Укажите topic").max(500),
  template: z.enum(["blog", "telegram", "dzen", "vc"]).default("blog"),
  // доп. поля не запрещаем
});

/** POST /api/content/generate */
export const contentGenerateSchema = z
  .object({
    topic: z.string().max(500).optional(),
    keyword: z.string().max(200).optional(),
    random: z.boolean().optional(),
  })
  .refine((d) => d.topic || d.keyword || d.random, {
    message: "Укажите topic, keyword или random=true",
  });

/** POST /api/content/publish */
export const contentPublishSchema = z.object({
  draftId: z.string().max(100).optional(),
  post: z.object({
    title: z.string().min(1, "Заполните title и content").max(300),
    content: z.string().min(1).max(100_000),
    slug: z.string().max(200).optional(),
    excerpt: z.string().max(500).optional(),
  }).passthrough(),
  telegramPost: z.string().max(4000).optional(),
});
