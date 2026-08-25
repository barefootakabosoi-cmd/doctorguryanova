/**
 * Семантический анализ: сопоставление реальных поисчных запросов
 * (из Яндекс.Метрики) с опубликованным контентом блога.
 * Чистые функции — покрыты юнит-тестами.
 */

export interface SearchQuery {
  phrase: string;
  visits: number;
}

export interface PostCover {
  slug: string;
  title: string;
  keywords?: string[];
}

/** Нормализация запроса: нижний регистр, без пунктуации, схлопнутые пробелы. */
export function normalizeQuery(q: string): string {
  return q
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-z0-9а-я\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOP_WORDS = new Set([
  "это","что","как","для","или","при","и","в","на","с","по","от","до","у","о",
  "можно","нужно","надо","если","чем","чему","когда","почему","есть","будет",
  "сколько","какой","какая","какие","лучше","где",
]);

/** Значимые слова запроса (без стоп-слов, короче 2 символов). */
export function significantWords(q: string): string[] {
  return normalizeQuery(q)
    .split(" ")
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

// --- Компактный стеммер ---------------------------------------------------

const ENDINGS = [
  // глаголы и отглагольные формы
  "ироваться", "ываться", "оваться", "еться", "иться", "аться",
  "ирования", "ования", "евания", "ирование", "ование", "евание",
  "ировать", "ровать", "евать", "ывать", "овать",
  "ениями", "ениям", "ениях", "ение", "ание", "ения", "ания",
  "ностью", "ностей", "ности", "ность",
  "ствами", "ства", "ство", "циями", "ции", "ций", "ация", "яция",
  "иями", "ями", "ами",
  // личные формы глаголов
  "ешься", "итесь", "ется", "ится", "атся", "ются", "утся",
  "аются", "яются", "ует", "уют", "ает", "яет",
  "ешь", "ишь", "ете", "ите", "ат", "ят", "ут", "ют", "ет", "ит",
  "ить", "ать", "ять", "еть", "уть", "ыть",
  "ла", "ло", "ли", "ть", "ся",
  // причастия и прилагательные
  "енный", "анный", "инный", "аемый",
  "вший", "вшая", "вшие", "щего", "щая", "щие",
  // падежные флексии существительных
  "ому", "ему", "ого", "его", "ыми", "ими",
  "ый", "ий", "ой", "ая", "яя", "ое", "ее", "ые", "ие",
  "ых", "их", "ым", "им",
  "ов", "ев", "ей", "ам", "ям", "ах", "ях", "ом", "ем",
  "ью", "ья", "ье", "ьи", "ия", "ии", "ию", "иях",
  "на", "но", "ны",
  "а", "я", "о", "е", "у", "ю", "ы", "и", "ь",
]
  .filter((e, i, arr) => arr.indexOf(e) === i)
  .sort((a, b) => b.length - a.length);

/**
 * Отрезает одну (самую длинную подходящую) флексию.
 * Корень короче 3 символов не оставляем — тогда слово не трогаем.
 * Примеры: лечить/лечение -> "леч", мигрень/мигрени -> "мигрен".
 */
export function stem(word: string): string {
  let w = word;
  if (w.length > 4 && /[a-z]/.test(w)) {
    // минимальный английский: treats->treat, therapies->therapy
    w = w.replace(/ies$/, "y").replace(/([a-z])s$/, "$1");
  }
  for (const e of ENDINGS) {
    if (w.endsWith(e) && w.length - e.length >= 3) {
      return w.slice(0, w.length - e.length);
    }
  }
  return w;
}

/**
 * Покрыт ли запрос существующей статьёй.
 * Запрос считается покрытым, если пересечение значимых слов
 * с заголовком/ключами статьи >= порога от слов запроса.
 */
export function isQueryCovered(query: string, posts: PostCover[], threshold = 0.6): boolean {
  const qWords = significantWords(query);
  if (qWords.length === 0) return true; // мусорный/брендовый короткий запрос

  for (const post of posts) {
    const haystack = significantWords(
      [post.title, ...(post.keywords ?? [])].join(" ")
    );
    if (haystack.length === 0) continue;
    const haySet = new Set(haystack);
    const qStems = qWords.map(stem);
    const hayStems = new Set(haystack.map(stem));
    const hits = qWords.filter((w) => haySet.has(w)).length;
    const stemHits = qStems.filter((s) => hayStems.has(s)).length;
    const score = Math.max(hits, stemHits) / qWords.length;
    if (score >= threshold) return true;
  }
  return false;
}

const BRAND_RE = /гурьянов|doctorguryanova|вконтакт|вк\b|телеграм|youtube|инстаграм|отзыв|адрес|телефон/i;

/**
 * Отбор возможностей для контента:
 * реальные запросы с трафиком, не покрытые статьями.
 * Сортировка по визитам, дедупликация по нормализованной фразе.
 */
export function findOpportunities(
  queries: SearchQuery[],
  posts: PostCover[],
  opts: { limit?: number; minVisits?: number } = {}
): SearchQuery[] {
  const { limit = 8, minVisits = 1 } = opts;
  const seen = new Set<string>();
  const seenStems = new Set<string>(); // сигнатуры тем — против почти-дублей
  const result: SearchQuery[] = [];

  const sorted = [...queries].sort((a, b) => b.visits - a.visits);

  for (const q of sorted) {
    const norm = normalizeQuery(q.phrase);
    if (!norm || norm.length < 5) continue;          // слишком короткие («мигрень», «невроз» — тоже темы)
    if (BRAND_RE.test(norm)) continue;               // брендовые/навигационные
    if (q.visits < minVisits) continue;
    if (seen.has(norm)) continue;
    seen.add(norm);

    // почти-дубли («как лечить мигрень» ≈ «лечение мигрени»): одна тема — одно предложение
    const sig = Array.from(new Set(significantWords(q.phrase).map(stem))).sort().join("+");
    if (sig && seenStems.has(sig)) continue;
    if (sig) seenStems.add(sig);

    if (!isQueryCovered(q.phrase, posts)) {
      result.push({ phrase: q.phrase.trim(), visits: q.visits });
      if (result.length >= limit) break;
    }
  }
  return result;
}

/** Короткий стабильный ID запроса для callback_data (лимит Telegram — 64 байта). */
export function queryId(phrase: string): string {
  let h = 0;
  const s = normalizeQuery(phrase);
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return "q" + Math.abs(h).toString(36);
}
