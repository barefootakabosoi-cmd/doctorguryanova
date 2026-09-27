import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"
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
    <>
    <Navbar />
    <main className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-4xl font-serif text-charcoal mb-2">Блог невролога</h1>
      <p className="text-charcoal/60 mb-10">
        Полезные статьи о неврологии, рефлексотерапии, гирудотерапии и остеопатии
        от <strong>Гурьяновой Валентины Андреевны</strong> — врача-невролога с{" "}
        <strong>49-летним стажем</strong>.
      </p>

      <div className="grid gap-6">
        {posts.map((post) => (
          <article
            key={post.slug}
            className="bg-white p-6 rounded-xl border border-charcoal/10 hover:border-gold/30 hover:shadow-lg transition-all duration-300"
          >
            <div className="flex items-center gap-2 text-sm text-charcoal/50 mb-2">
              <span className="bg-gold/10 text-gold-dark px-2 py-0.5 rounded font-medium">
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
              <h2 className="text-2xl font-serif text-charcoal group-hover:text-gold transition-colors mb-2">
                {post.title}
              </h2>
              <p className="text-charcoal/70">{post.excerpt}</p>
            </Link>

            <div className="flex flex-wrap gap-2 mt-4">
              {post.keywords.slice(0, 3).map((kw) => (
                <span key={kw} className="text-xs text-charcoal/50 bg-charcoal/5 px-2 py-1 rounded">
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
    <Footer />
    </>
  );
}
