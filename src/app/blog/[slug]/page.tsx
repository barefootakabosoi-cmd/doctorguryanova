// src/app/blog/[slug]/page.tsx
import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPostBySlug, getAllPosts } from "@/lib/blog-data";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { slug: string };
}

export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const post = await getPostBySlug(params.slug);
  if (!post) return { title: "Статья не найдена" };

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
    },
  };
}

export default async function PostPage({ params }: PageProps) {
  const post = await getPostBySlug(params.slug);

  if (!post) {
    notFound();
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <Link href="/blog" className="text-sm text-slate-500 hover:text-slate-700 mb-6 inline-block">
        ← Все статьи
      </Link>

      
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "MedicalWebPage",
              "headline": post.title,
              "description": post.excerpt,
              "datePublished": post.publishedAt,
              "dateModified": post.updatedAt,
              "author": {
                "@type": "Physician",
                "name": "Гурьянова Валентина Андреевна",
                "url": "https://doctorguryanova.ru"
              },
              "keywords": post.keywords.join(", "),
              "mainEntityOfPage": {
                "@type": "WebPage",
                "@id": `https://doctorguryanova.ru/blog/${post.slug}`
              }
            })
          }}
        />

      <article>
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
          <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
            {post.type === "seo" && "Статья"}
            {post.type === "research" && "Научный обзор"}
            {post.type === "faq" && "FAQ"}
          </span>
          <span>•</span>
          <span>{post.readTime} мин чтения</span>
          <span>•</span>
          <span>{post.publishedAt.split("-").reverse().join(".")}</span>
        </div>

        <h1 className="text-3xl font-bold text-slate-900 mb-4">{post.title}</h1>
        <p className="text-lg text-slate-600 mb-8">{post.excerpt}</p>

        <div
          className="prose prose-slate max-w-none article-content"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        <div className="flex flex-wrap gap-2 mt-8 pt-8 border-t">
          {post.keywords.map((kw) => (
            <span key={kw} className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
              {kw}
            </span>
          ))}
        </div>

        <div className="mt-8 p-6 bg-teal-50 rounded-lg text-center">
          <p className="text-slate-700 mb-4">
            Нужна консультация невролога с 49-летним опытом?
          </p>
          <Link
            href="/#booking"
            className="inline-block bg-teal-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-teal-700"
          >
            Записаться на приём
          </Link>
        </div>

        <div className="mt-6 p-4 bg-amber-50 border-l-4 border-amber-400 rounded">
          <p className="text-sm text-amber-800">
            <strong>Важно:</strong> Информация носит образовательный характер и не заменяет консультацию врача.
          </p>
        </div>
      </article>
    </main>
  );
}
