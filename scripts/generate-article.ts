#!/usr/bin/env ts-node
// scripts/generate-article.ts
// Генератор SEO-статей через GigaChat с жёсткими ограничениями
// Запуск: npx ts-node scripts/generate-article.ts <slug> <ключевик>
// Пример: npx ts-node scripts/generate-article.ts osteohondroz-shejnogo-otdela "остеохондроз шейного отдела"

import { GigaChatClient } from "../src/lib/gigachat";
import * as fs from "fs";
import * as path from "path";

// ЖЁСТКИЕ ЗАПРЕТЫ — ИИ НЕ ДОЛЖЕН ИСПОЛЬЗОВАТЬ ЭТИ СЛОВА
const FORBIDDEN_WORDS = [
  "лечим", "излечиваем", "гарантия", "100%", "навсегда",
  "победим болезнь", "полное излечение", "вылечим за 1 сеанс",
  "чудо-метод", "волшебная пилюля", "уникальная методика",
  "секрет врачей", "забыть о боли навсегда", "полное восстановление",
  "стопроцентный результат", "безоперационное лечение", // осторожно с этим
];

// ПРОВЕРКА НА ЗАПРЕТНЫЕ СЛОВА
function checkForbidden(text: string): string[] {
  const found: string[] = [];
  const lower = text.toLowerCase();
  for (const word of FORBIDDEN_WORDS) {
    if (lower.includes(word.toLowerCase())) {
      found.push(word);
    }
  }
  return found;
}

// ОБЯЗАТЕЛЬНЫЙ ДИСКЛЕЙМЕР
const DISCLAIMER = `
<div class="bg-amber-50 border-l-4 border-amber-400 p-4 mt-6">
  <p class="text-sm text-amber-800"><strong>Важно:</strong> Информация на сайте носит образовательный характер и не является медицинской услугой. Диагностика и назначение лечения возможны только после очной или онлайн-консультации врача.</p>
</div>`;

// УТП (уникальное торговое предложение)
const UTP = "Гурьянова Валентина Андреевна, врач-невролог с 49-летним стажем, выпускница 1-го МГМУ им. Сеченова (1977)";

// CTA (призыв к действию)
const CTA = `
<h2>Запишитесь на консультацию</h2>
<p>Если вы узнали себя в описанных симптомах — не откладывайте визит к специалисту. <strong>${UTP}</strong> проведёт онлайн-консультацию, ответит на вопросы и составит индивидуальный план.</p>
<p><a href="/">Записаться онлайн</a> или позвоните <strong>+7 (916) 100-40-53</strong>.</p>`;

// ПРОМПТ ДЛЯ SEO-СТАТЬИ
function buildSEOPrompt(keyword: string): string {
  return `Ты — медицинский писатель и редактор. Пишешь SEO-статью для сайта невролога.

ЖЁСТКИЕ ПРАВИЛА (нарушение недопустимо):
1. НЕ ИСПОЛЬЗУЙ слова: лечим, излечиваем, гарантия, 100%, навсегда, победим болезнь, полное излечение, вылечим за 1 сеанс, чудо-метод, волшебная пилюля, секрет врачей.
2. НЕ обещай исцеление. НЕ говори "вылечим". Используй "облегчим симптомы", "остановим прогрессирование", "улучшим качество жизни".
3. НЕ диагностируй через текст. НЕ назначай лечение.
4. ВСЕГДА указывай автора: "${UTP}".
5. ВСЕГДА добавляй дисклеймер: "Информация носит образовательный характер..."
6. В конце ВСЕГДА призыв к действию: запись на консультацию.

Тема статьи: "${keyword}"

Структура (строго соблюдай):
- H1: [ключевик] — советы невролога с 49-летним стажем
- Ввод (150 слов): проблема + обещание решения + УТП
- H2: Что такое [ключевик] (200 слов)
- H2: Причины [ключевик] (300 слов, маркированный список)
- H2: Симптомы [ключевик] (250 слов, маркированный список)
- H2: Когда обращаться к неврологу (200 слов)
- H2: Методы лечения [ключевик] (400 слов)
  - H3: Консервативное лечение
  - H3: Рефлексотерапия
  - H3: Гирудотерапия
  - H3: Остеопатия
- H2: Профилактика (200 слов)
- H2: Часто задаваемые вопросы (3-5 FAQ)
- Заключение + CTA

Формат вывода: HTML (теги h1, h2, h3, p, ul, li, strong). Без markdown.
Объём: 1500-2000 слов.
Тон: профессиональный, но доступный пациенту. Уважительный, спокойный.`;
}

// ПРОМПТ ДЛЯ FAQ
function buildFAQPrompt(keyword: string): string {
  return `Ты — медицинский писатель. Пишешь FAQ для сайта невролога.

ЖЁСТКИЕ ПРАВИЛА:
1. НЕ используй: лечим, излечиваем, гарантия, 100%, навсегда, победим болезнь.
2. Вопрос должен быть естественным (как задаёт пациент).
3. Ответ — профессиональный, но доступный, 100-150 слов.
4. В конце: "Консультация врача необходима для постановки диагноза."
5. Укажи автора: "${UTP}".

Тема: "${keyword}"

Формат:
<h1>${keyword} — отвечает невролог с 49-летним стажем</h1>
<p><strong>Вопрос:</strong> [естественный вопрос пациента]</p>
<p><strong>Ответ:</strong> [развёрнутый ответ]</p>
<p><strong>Когда обращаться к врачу:</strong> [симптомы тревоги]</p>
<p>Автор: ${UTP}</p>
<p>Дисклеймер: Информация носит образовательный характер...</p>`;
}

async function main() {
  const [slug, ...keywordParts] = process.argv.slice(2);
  const keyword = keywordParts.join(" ");

  if (!slug || !keyword) {
    console.log("Использование:");
    console.log("  npx ts-node scripts/generate-article.ts <slug> <ключевик>");
    console.log("  npx ts-node scripts/generate-article.ts osteohondroz-shejnogo-otdela 'остеохондроз шейного отдела'");
    process.exit(1);
  }

  console.log(`🤖 Генерация статьи: "${keyword}"`);
  console.log(`   Slug: ${slug}`);
  console.log("   Проверка env vars...");

  if (!process.env.GIGACHAT_CLIENT_ID || !process.env.GIGACHAT_CLIENT_SECRET) {
    console.error("❌ Установи GIGACHAT_CLIENT_ID и GIGACHAT_CLIENT_SECRET в .env.local");
    process.exit(1);
  }

  const client = new GigaChatClient();
  const isFAQ = keyword.includes("?") || keyword.toLowerCase().includes("почему") || keyword.toLowerCase().includes("как");
  const prompt = isFAQ ? buildFAQPrompt(keyword) : buildSEOPrompt(keyword);

  console.log("⏳ Генерация контента... (30-60 сек)");
  let content = await client.generate(prompt, {
    model: isFAQ ? "GigaChat" : "GigaChat-Pro",
    max_tokens: isFAQ ? 1500 : 4000,
    temperature: 0.5, // более консервативно
  });

  // ПРОВЕРКА НА ЗАПРЕТНЫЕ СЛОВА
  const forbidden = checkForbidden(content);
  if (forbidden.length > 0) {
    console.error("❌ НАЙДЕНЫ ЗАПРЕТНЫЕ СЛОВА:");
    forbidden.forEach((w) => console.error(`   - ${w}`));
    console.error("
⚠️  Статья НЕ сохранена. Исправь промпт или отредактируй вручную.");
    process.exit(1);
  }

  // ДОБАВЛЕНИЕ ОБЯЗАТЕЛЬНЫХ БЛОКОВ (если ИИ их не добавил)
  if (!content.includes("Запишитесь на консультацию") && !content.includes("Записаться")) {
    content += "\n" + CTA;
  }
  if (!content.includes("образовательный характер")) {
    content += "\n" + DISCLAIMER;
  }

  // ФОРМИРОВАНИЕ ДАННЫХ СТАТЬИ
  const articleData = {
    slug,
    title: isFAQ ? `${keyword} — отвечает невролог` : `${keyword} — советы невролога с 49-летним стажем`,
    excerpt: `Статья о ${keyword} от ${UTP}.`,
    content,
    keywords: [keyword],
    type: isFAQ ? "faq" : "seo",
    publishedAt: new Date().toISOString().split("T")[0],
    updatedAt: new Date().toISOString().split("T")[0],
    readTime: isFAQ ? 3 : Math.ceil(content.length / 250),
  };

  // СОХРАНЕНИЕ В ФАЙЛ
  const outputPath = path.join(__dirname, "..", "generated", `${slug}.json`);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(articleData, null, 2), "utf-8");

  console.log("\n" + "=".repeat(60));
  console.log("✅ СТАТЬЯ СГЕНЕРИРОВАНА И ПРОВЕРЕНА");
  console.log("=".repeat(60));
  console.log(`Файл: ${outputPath}`);
  console.log(`Тип: ${articleData.type}`);
  console.log(`Объём: ~${content.length} символов`);
  console.log("\n⚠️  ВАЖНО: Перед публикацией статья ДОЛЖНА быть проверена врачом!");
  console.log("   Скопируйте содержимое файла в blog-data.ts после утверждения.");
}

main().catch((err) => {
  console.error("❌ Ошибка:", err.message);
  process.exit(1);
});
