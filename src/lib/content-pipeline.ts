// src/lib/content-pipeline.ts
// Pipeline: PubMed → GigaChat → готовый контент

import { getPubMedArticles, type PubMedArticle } from "./pubmed";
import { chatCompletion, generateSEOMeta } from "./gigachat";
import { getClusterByKeyword, type KeywordCluster } from "./seo-keywords";
import type { BlogPost } from "./blog-data";

export interface GeneratedContent {
  post: BlogPost;
  telegramPost: string;
  seo: { title: string; description: string; keywords: string };
  sources: PubMedArticle[];
}

// Слаг из заголовка
function slugify(text: string): string {
  const transliterate = (str: string) => {
    const map: Record<string, string> = {
      а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"e",ж:"zh",з:"z",и:"i",й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"h",ц:"ts",ч:"ch",ш:"sh",щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya"
    };
    return str.toLowerCase().replace(/[а-яё]/g, (char) => map[char] || char);
  };
  
  return transliterate(text)
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .substring(0, 80);
}

// Оценка времени чтения
function calculateReadTime(content: string): number {
  const text = content.replace(/<[^>]+>/g, "");
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(3, Math.ceil(words / 200));
}

// Генерация статьи из научных источников
export async function generateArticle(topic: string, cluster?: KeywordCluster): Promise<GeneratedContent> {
  console.log(`[pipeline] Начинаем генерацию по теме: ${topic}`);
  
  // 1. PubMed: ищем научные статьи
  const pubmedQuery = cluster?.pubmedQuery || topic;
  const articles = await getPubMedArticles(pubmedQuery, 5);
  console.log(`[pipeline] PubMed: ${articles.length} статей`);
  
  // 2. GigaChat: генерируем статью
  const abstractsText = articles.length > 0
    ? articles.map((a, i) => `--- Статья ${i + 1} ---\nЗаголовок: ${a.title}\nAbstract: ${a.abstract}`).join("\n\n")
    : "Научных статей не найдено. Напиши статью на основе медицинских знаний.";
  
  const systemPrompt = `Ты — медицинский редактор сайта doctorguryanova.ru.
Врач: Гурьянова Валентина Андреевна, невролог, нутрициолог, рефлексотерапевт, гирудотерапевт, 49 лет практики.
Специализация: неврология, рефлексотерапия (иглоукалывание), гирудотерапия (пиявки), остеопатия, мануальная терапия.

Правила:
- Пиши для пациентов простым языком, но медицински корректно
- Объём: 1500-2500 слов
- Структура: введение, 3-5 разделов с H2, заключение
- Обязательно: практические советы, когда обращаться к врачу
- В конце: дисклеймер "Информация не заменяет консультацию врача"
- НЕ выдумывай исследования — опирайся на предоставленные abstract'ы
- Источники: укажи ссылки на PubMed в конце
- HTML-формат: используй <h2>, <p>, <ul>, <li>, <strong>`;
  
  const userPrompt = `Тема: ${topic}

Научные источники (abstract'ы из PubMed):
 ${abstractsText}

Напиши статью для блога сайта врача-невролога. Перескажи научные данные простым языком для пациентов, добавь практические рекомендации.`;
  
  const result = await chatCompletion({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.3,
    max_tokens: 4000,
  });
  
  const content = result.choices[0]?.message?.content ?? "";
  console.log(`[pipeline] Статья сгенерирована: ${content.length} символов`);
  
  // 3. GigaChat: генерируем title и excerpt
  const metaResult = await chatCompletion({
    messages: [
      { role: "system", content: "Ты — SEO-копирайтер. Создавай цепляющие заголовки и описания." },
      { role: "user", content: `Для статьи на тему "${topic}" создай:
1. Title (50-60 символов, цепляющий, с ключевым словом)
2. Meta description (150-160 символов, с призывом к действию)
3. 5-7 ключевых слов через запятую

Формат ответа:
TITLE: ...
DESCRIPTION: ...
KEYWORDS: ...` },
    ],
    temperature: 0.4,
    max_tokens: 500,
  });
  
  const metaText = metaResult.choices[0]?.message?.content ?? "";
  
  const titleMatch = metaText.match(/TITLE:\s*(.+)/i);
  const descMatch = metaText.match(/DESCRIPTION:\s*(.+)/i);
  const kwMatch = metaText.match(/KEYWORDS:\s*(.+)/i);
  
  const title = titleMatch?.[1]?.trim() || topic;
  const excerpt = descMatch?.[1]?.trim() || `Статья о ${topic.toLowerCase()}`;
  const keywords = kwMatch?.[1]?.split(/[,;]/).map(k => k.trim()).filter(Boolean).slice(0, 7) || [topic];
  
  // 4. GigaChat: генерируем пост для Telegram
  const tgResult = await chatCompletion({
    messages: [
      { role: "system", content: "Ты — SMM-редактор медицинского Telegram-канала." },
      { role: "user", content: `Напиши пост для Telegram (макс. 800 символов) на основе статьи. Тема: ${topic}
Статья: ${content.slice(0, 2000)}

Структура: цепляющий заголовок, 2-3 абзаца с пользой, призыв к действию (запись на консультацию).` },
    ],
    temperature: 0.5,
    max_tokens: 1000,
  });
  
  const telegramPost = tgResult.choices[0]?.message?.content ?? "";
  console.log(`[pipeline] Telegram-пост: ${telegramPost.length} символов`);
  
  // 5. Собираем BlogPost
  const slug = slugify(title);
  const now = new Date().toISOString().split("T")[0];
  
  const post: BlogPost = {
    slug,
    title,
    excerpt,
    content: content + generateSourcesBlock(articles),
    keywords,
    type: articles.length > 0 ? "research" : "seo",
    publishedAt: now,
    updatedAt: now,
    readTime: calculateReadTime(content),
  };
  
  return {
    post,
    telegramPost,
    seo: { title, description: excerpt, keywords: keywords.join(", ") },
    sources: articles,
  };
}

function generateSourcesBlock(articles: PubMedArticle[]): string {
  if (articles.length === 0) return "";
  
  const sources = articles.map(a => 
    `<li><a href="${a.url}" target="_blank" rel="noopener">${a.title}</a> — ${a.journal}, ${a.pubDate}</li>`
  ).join("");
  
  return `
<h2>Источники</h2>
<ul>${sources}</ul>`;
}

// Удобный запуск по ключевому слову
export async function generateArticleByKeyword(keyword: string): Promise<GeneratedContent> {
  const cluster = getClusterByKeyword(keyword);
  return generateArticle(keyword, cluster);
}
