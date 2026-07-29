// src/app/blog/[slug]/page.tsx
// Страница отдельной статьи блога

import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostBySlug, getAllPosts } from "@/lib/blog-data";

interface Props {
  params: { slug: string };
}

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const post = getPostBySlug(params.slug);
  if (!post) return { title: "Статья не найдена" };

  return {
    title: `${post.title} | Блог невролога`,
    description: post.excerpt,
    keywords: post.keywords,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: ["Гурьянова Валентина Андреевна"],
    },
  };
}

export default function ArticlePage({ params }: Props) {
  const post = getPostBySlug(params.slug);
  if (!post) notFound();

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      {/* Breadcrumbs */}
      <nav className="text-sm text-slate-500 mb-6">
        <Link href="/" className="hover:text-emerald-700">Главная</Link>
        <span className="mx-2">/</span>
        <Link href="/blog" className="hover:text-emerald-700">Блог</Link>
        <span className="mx-2">/</span>
        <span className="text-slate-800">{post.title}</span>
      </nav>

      {/* Meta */}
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
        <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-xs">
          {post.type === "seo" && "Статья"}
          {post.type === "research" && "Научный обзор"}
          {post.type === "faq" && "FAQ"}
        </span>
        <span>•</span>
        <span>{post.readTime} мин чтения</span>
        <span>•</span>
        <span>Обновлено: {new Date(post.updatedAt).toLocaleDateString("ru-RU")}</span>
      </div>

      <h1 className="text-3xl font-bold text-slate-900 mb-4">{post.title}</h1>

      {/* Author block */}
      <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-lg mb-8">
        <div className="w-12 h-12 bg-emerald-700 rounded-full flex items-center justify-center text-white font-bold">
          ВГ
        </div>
        <div>
          <p className="font-medium text-slate-900">Гурьянова Валентина Андреевна</p>
          <p className="text-sm text-slate-600">
            Врач-невролог, 49 лет практики, 1-й МГМУ им. Сеченова, 1977
          </p>
        </div>
      </div>

      {/* Content */}
      <div
        className="prose prose-slate max-w-none"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />

      {/* Keywords */}
      <div className="mt-8 pt-6 border-t border-slate-200">
        <p className="text-sm text-slate-500 mb-2">Ключевые слова:</p>
        <div className="flex flex-wrap gap-2">
          {post.keywords.map((kw) => (
            <span key={kw} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
              {kw}
            </span>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="mt-8 bg-emerald-50 border border-emerald-200 rounded-lg p-6 text-center">
        <h3 className="text-lg font-semibold text-emerald-900 mb-2">
          Нужна консультация невролога?
        </h3>
        <p className="text-emerald-800 mb-4">
          Гурьянова Валентина Андреевна проведёт онлайн-консультацию и ответит на все вопросы.
        </p>
        <Link
          href="/"
          className="inline-block bg-emerald-700 text-white px-6 py-2 rounded-lg hover:bg-emerald-800 transition-colors"
        >
          Записаться на консультацию
        </Link>
        <p className="text-sm text-emerald-700 mt-2">+7 (916) 100-40-53</p>
      </div>

      {/* Disclaimer */}
      <div className="mt-6 bg-amber-50 border-l-4 border-amber-400 p-4">
        <p className="text-sm text-amber-800">
          <strong>Важно:</strong> Информация на сайте носит образовательный характер и не является
          медицинской услугой. Диагностика и назначение лечения возможны только после очной или
          онлайн-консультации врача.
        </p>
      </div>

      {/* Navigation */}
      <div className="mt-8 flex justify-between">
        <Link href="/blog" className="text-emerald-700 hover:underline">
          ← Все статьи
        </Link>
        <Link href="/" className="text-emerald-700 hover:underline">
          На главную →
        </Link>
      </div>
    </main>
  );
}
