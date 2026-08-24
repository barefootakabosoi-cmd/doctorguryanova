// src/app/blog/page.tsx
import { Metadata } from "next";
import Link from "next/link";
import { getAllPosts } from "@/lib/blog-data";

export const metadata: Metadata = {
  title: "Блог невролога — статьи о здоровье | Гурьянова В.А.",
  description: "Полезные статьи о неврологии, рефлексотерапии, гирудотерапии и остеопатии от врача с 49-летним стажем.",
};

export const dynamic = "force-dynamic";

export default async function BlogPage() {
  const posts = await getAllPosts();

  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">Блог невролога</h1>
      <p className="text-charcoal/60 mb-8">
        Полезные статьи о неврологии, рефлексотерапии, гирудотерапии и остеопатии
        от <strong>Гурьяновой Валентины Андреевны</strong> — врача-невролога с{" "}
        <strong>49-летним стажем</strong>.
      </p>

      <div className="grid gap-6">
        {posts.map((post) => (
          <article
            key={post.slug}
            className="border border-charcoal/10 rounded-lg p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-2 text-sm text-charcoal/50 mb-2">
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

            <Link href={`/blog/${post.slug}`} className="block group">
              <h2 className="text-xl font-semibold text-charcoal group-hover:text-emerald-700 mb-2">
                {post.title}
              </h2>
              <p className="text-charcoal/60">{post.excerpt}</p>
            </Link>

            <div className="flex flex-wrap gap-2 mt-3">
              {post.keywords.slice(0, 3).map((kw) => (
                <span key={kw} className="text-xs text-charcoal/50 bg-slate-100 px-2 py-1 rounded">
                  {kw}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>

      {posts.length === 0 && (
        <p className="text-charcoal/50 text-center py-12">Статьи скоро появятся.</p>
      )}
    </main>
  );
}
