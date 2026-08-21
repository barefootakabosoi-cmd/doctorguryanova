// src/lib/blog-data.ts
// Данные статей блога: статичные + из Vercel KV (опубликованные через админку)

import { Redis } from "@upstash/redis";

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  keywords: string[];
  type: "seo" | "research" | "faq";
  publishedAt: string;
  updatedAt: string;
  readTime: number;
  image?: string;
}

// Статичные статьи (fallback)
export const blogPosts: BlogPost[] = [
  {
    slug: "osteohondroz-shejnogo-otdela-simptomy",
    title: "Остеохондроз шейного отдела: 7 ранних симптомов",
    excerpt: "Шейный остеохондроз — одна из самых частых причин головных болей и головокружений. Узнайте 7 ранних симптомов, которые нельзя игнорировать.",
    content: `<h2>Что такое остеохондроз шейного отдела</h2><p>...</p><h2>7 ранних симптомов</h2><ul><li><strong>Головные боли в затылке</strong></li><li><strong>Головокружение при резких движениях</strong></li></ul>`,
    keywords: ["остеохондроз шейного отдела", "симптомы остеохондроза"],
    type: "seo",
    publishedAt: "2026-07-29",
    updatedAt: "2026-07-29",
    readTime: 8,
  },
];

const redis = new Redis({
  url: process.env.KV_REST_API_URL || "",
  token: process.env.KV_REST_API_TOKEN || "",
});

// Все статьи: из KV + статичные (без дубликатов по slug)
export async function getAllPosts(): Promise<BlogPost[]> {
  const staticPosts = blogPosts;

  if (!process.env.KV_REST_API_URL) {
    return staticPosts;
  }

  try {
    const indexRaw = await redis.get("posts:index");
    let index: string[] = [];
    try {
      index = indexRaw ? (typeof indexRaw === "string" ? JSON.parse(indexRaw) : indexRaw) : [];
    } catch { index = []; }
    if (!Array.isArray(index)) index = [];

    const kvPosts: BlogPost[] = [];
    for (const slug of index) {
      try {
        const postRaw = await redis.get(`post:${slug}`);
        if (postRaw) {
          const post = typeof postRaw === "string" ? JSON.parse(postRaw) : postRaw;
          if (post && post.slug && post.title) {
            kvPosts.push(post);
          }
        }
      } catch {}
    }

    const allSlugs = new Set(kvPosts.map(p => p.slug));
    return [...kvPosts, ...staticPosts.filter(p => !allSlugs.has(p.slug))];
  } catch (error) {
    console.error("getAllPosts error:", error);
    return staticPosts;
  }
}

export async function getPostBySlug(slug: string): Promise<BlogPost | undefined> {
  // Сначала KV
  if (process.env.KV_REST_API_URL) {
    try {
      const postRaw = await redis.get(`post:${slug}`);
      if (postRaw) {
        const post = typeof postRaw === "string" ? JSON.parse(postRaw) : postRaw;
        if (post && post.slug) return post;
      }
    } catch {}
  }

  // Fallback на статичные
  return blogPosts.find((post) => post.slug === slug);
}

// Синхронные версии для обратной совместимости (если нужны)
export function getStaticPosts(): BlogPost[] {
  return blogPosts;
}

export function getStaticPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug);
}
