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
    <main className="max-w-3xl mx-auto px-6 py-12">
      <Link href="/blog" className="text-sm text-charcoal/50 hover:text-gold transition-colors mb-6 inline-block">
        ← Все статьи
      </Link>

      <article>
        <div className="flex items-center gap-2 text-sm text-charcoal/50 mb-4">
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

        <h1 className="text-4xl font-serif text-charcoal mb-4">{post.title}</h1>
        <p className="text-lg text-charcoal/60 mb-8">{post.excerpt}</p>

        <div
          className="prose prose-slate max-w-none article-content"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        <div className="flex flex-wrap gap-2 mt-8 pt-8 border-t border-charcoal/10">
          {post.keywords.map((kw) => (
            <span key={kw} className="text-xs text-charcoal/50 bg-charcoal/5 px-2 py-1 rounded">
              {kw}
            </span>
          ))}
        </div>

        <div className="mt-8 p-6 bg-gold/5 rounded-lg text-center border border-gold/20">
          <p className="text-charcoal mb-4">
            Нужна консультация невролога с 49-летним опытом?
          </p>
          <Link
            href="/#booking"
            className="inline-block bg-charcoal text-cream px-6 py-3 rounded-full font-medium hover:bg-gold transition-all duration-300"
          >
            Записаться на приём
          </Link>
        </div>

        <div className="mt-6 p-4 bg-charcoal/5 border-l-4 border-gold rounded">
          <p className="text-sm text-charcoal/70">
            <strong>Важно:</strong> Информация носит образовательный характер и не заменяет консультацию врача.
          </p>
        </div>
      </article>
    </main>
  );
}
