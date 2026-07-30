import { NextRequest, NextResponse } from 'next/server';
import { chatCompletion } from '@/lib/gigachat';

export const runtime = 'nodejs';

const SYSTEM_PROMPTS: Record<string, string> = {
  blog: `Ты — профессиональный медицинский копирайтер, пишешь для сайта врача-невролога Гурьяновой В.А.
Пиши статью в блог на заданную тему.
Требования:
- Объём: 1500–2000 слов
- Структура: введение, 3–5 разделов с подзаголовками H2, заключение
- Тон: спокойный, уверенный, но не холодный. Объясняй простыми словами сложные вещи.
- Обязательно: практические советы, когда обращаться к врачу
- Без воды, без повторов, без шаблонных фраз "в современном мире"
- Выводи только текст статьи, без мета-информации`,

  telegram: `Ты — SMM-специалист, ведёшь Telegram-канал врача-невролога Гурьяновой В.А.
Напиши пост на заданную тему.
Требования:
- Объём: 300–500 слов
- Цепляющее начало (задай вопрос или назови цифру)
- Используй 1–2 эмодзи, но не переборщи
- Короткие абзацы (1–3 предложения)
- Призыв к действию в конце: запись на приём, вопрос в комментариях
- Хэштеги в конце: #невролог #здоровье + 1–2 тематических
- Выводи только текст поста`,

  seo: `Ты — SEO-оптимизатор, пишешь текст для посадочной страницы услуги врача-невролога Гурьяновой В.А.
Напиши SEO-описание услуги.
Требования:
- Объём: 500–800 слов
- Естественное включение ключевых слов (не спамь)
- Структура: H1-заголовок, 2–3 секции с H2, список преимуществ (3–5 пунктов), призыв к действию
- Упомяни: опыт врача, индивидуальный подход, запись по телефону/онлайн
- Выводи только текст страницы`,
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { topic, template = 'blog' } = body;

    if (!topic || typeof topic !== 'string') {
      return NextResponse.json(
        { error: 'Поле topic обязательно' },
        { status: 400 }
      );
    }

    const systemPrompt = SYSTEM_PROMPTS[template] || SYSTEM_PROMPTS.blog;

    const result = await chatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Тема: ${topic}` },
      ],
      temperature: 0.3,
      max_tokens: 800,
    });

    const content = result.choices[0]?.message?.content ?? '';

    return NextResponse.json({
      success: true,
      template,
      content,
    });
  } catch (error: any) {
    console.error('Generate error:', error);
    return NextResponse.json(
      { error: error.message || 'Ошибка генерации' },
      { status: 500 }
    );
  }
}
