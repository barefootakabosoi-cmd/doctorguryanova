// src/lib/blog-data.ts
// Данные статей блога. В будущем — заменить на БД (Prisma + PostgreSQL)

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  keywords: string[];
  type: "seo" | "research" | "faq";
  publishedAt: string;
  updatedAt: string;
  readTime: number; // минуты
  image?: string;
}

export const blogPosts: BlogPost[] = [
  {
    slug: "osteohondroz-shejnogo-otdela-simptomy",
    title: "Остеохондроз шейного отдела: 7 ранних симптомов",
    excerpt: "Шейный остеохондроз — одна из самых частых причин головных болей и головокружений. Узнайте 7 ранних симптомов, которые нельзя игнорировать.",
    content: `<!-- Контент будет сгенерирован ИИ и проверен врачом -->
<h2>Что такое остеохондроз шейного отдела</h2>
<p>...</p>
<h2>7 ранних симптомов</h2>
<ul>
  <li><strong>Головные боли в затылке</strong> — особенно по утрам...</li>
  <li><strong>Головокружение при резких движениях</strong> — ...</li>
  <li><strong>Шум в ушах</strong> — ...</li>
  <li><strong>Покалывание в руках</strong> — ...</li>
  <li><strong>Ограничение подвижности шеи</strong> — ...</li>
  <li><strong>Боли в плечах и лопатках</strong> — ...</li>
  <li><strong>Усталость и сонливость</strong> — ...</li>
</ul>
<h2>Когда обращаться к неврологу</h2>
<p>...</p>
<h2>Методы лечения</h2>
<h3>Консервативное лечение</h3>
<p>...</p>
<h3>Рефлексотерапия</h3>
<p>...</p>
<h3>Гирудотерапия</h3>
<p>...</p>
<h3>Остеопатия</h3>
<p>...</p>
<h2>Профилактика</h2>
<p>...</p>
<h2>Часто задаваемые вопросы</h2>
<p><strong>В: Можно ли вылечить остеохондроз полностью?</strong><br/>
О: Остеохондроз — это дегенеративное изменение, полностью вернуть диски в исходное состояние невозможно. Но консервативное лечение позволяет остановить прогрессирование и устранить симптомы.</p>
<h2>Заключение</h2>
<p>Если вы заметили у себя несколько из перечисленных симптомов — не откладывайте визит к неврологу. <strong>Гурьянова Валентина Андреевна</strong>, врач-невролог с <strong>49-летним стажем</strong>, выпускница <strong>1-го МГМУ им. Сеченова (1977)</strong>, проведёт онлайн-консультацию и составит индивидуальный план лечения.</p>
<p><a href="/">Записаться на консультацию</a> или позвоните <strong>+7 (916) 100-40-53</strong>.</p>
<div class="bg-amber-50 border-l-4 border-amber-400 p-4 mt-6">
  <p class="text-sm text-amber-800"><strong>Важно:</strong> Информация на сайте носит образовательный характер и не является медицинской услугой. Диагностика и назначение лечения возможны только после очной или онлайн-консультации врача.</p>
</div>`,
    keywords: ["остеохондроз шейного отдела", "симптомы остеохондроза", "головокружение при остеохондрозе", "шум в ушах остеохондроз", "невролог остеохондроз"],
    type: "seo",
    publishedAt: "2026-07-29",
    updatedAt: "2026-07-29",
    readTime: 8,
  },
  {
    slug: "migrain-u-zhenshchin-prichiny",
    title: "Мигрень у женщин: причины, симптомы и методы облегчения",
    excerpt: "Мигрень в 3 раза чаще встречается у женщин. Почему так происходит и какие методы помогают облегчить приступы — рассказывает невролог с 49-летним стажем.",
    content: `<!-- Контент будет добавлен после генерации ИИ и проверки врачом -->`,
    keywords: ["мигрень у женщин", "причины мигрени", "лечение мигрени без таблеток", "невролог мигрень"],
    type: "seo",
    publishedAt: "2026-07-29",
    updatedAt: "2026-07-29",
    readTime: 10,
  },
  {
    slug: "pochemu-bolit-golova-po-utram",
    title: "Почему болит голова по утрам: 5 причин, о которых молчат",
    excerpt: "Утренняя головная боль — не всегда следствие недосыпа. Узнайте 5 скрытых причин, которые требуют внимания невролога.",
    content: `<!-- Контент будет добавлен после генерации ИИ и проверки врачом -->`,
    keywords: ["почему болит голова по утрам", "утренняя головная боль", "головная боль причины", "невролог головная боль"],
    type: "faq",
    publishedAt: "2026-07-29",
    updatedAt: "2026-07-29",
    readTime: 5,
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug);
}

export function getAllPosts(): BlogPost[] {
  return blogPosts;
}

export function getPostsByType(type: BlogPost["type"]): BlogPost[] {
  return blogPosts.filter((post) => post.type === type);
}

export function getPostsByKeyword(keyword: string): BlogPost[] {
  return blogPosts.filter((post) =>
    post.keywords.some((k) => k.toLowerCase().includes(keyword.toLowerCase()))
  );
}
