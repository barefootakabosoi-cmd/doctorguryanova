import Link from "next/link";
import { getAllPosts } from "@/lib/blog-data";
import Navbar from "@/components/Navbar"
import Hero from "@/components/Hero"
import Methods from "@/components/Methods"
import About from "@/components/About"
import BookingForm from "@/components/BookingForm"
import Reviews from "@/components/Reviews"
import SEOSections from "@/components/SEOSections"
import Footer from "@/components/Footer"

export default async function Home() {
  const posts = await getAllPosts();
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-teal-50/30">
      <Navbar />
      <Hero />
      <Methods />
      <About />
      <BookingForm />
      <Reviews />
      <SEOSections />
      <Footer />
    
      {/* Последние статьи блога */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-2">Блог невролога</h2>
        <p className="text-slate-600 text-center mb-10">Полезные статьи о здоровье, основанные на научных исследованиях</p>
        <div className="grid md:grid-cols-2 gap-6">
          {posts.slice(0, 4).map((post) => (
            <Link href={`/blog/${post.slug}`} key={post.slug} className="border border-slate-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              <h3 className="text-xl font-semibold text-slate-900 mb-2">{post.title}</h3>
              <p className="text-slate-600 text-sm">{post.excerpt}</p>
            </Link>
          ))}
        </div>
        <div className="text-center mt-8">
          <Link href="/blog" className="inline-block bg-slate-900 text-white px-6 py-3 rounded-xl font-semibold hover:bg-slate-800 transition-colors">
            Все статьи
          </Link>
        </div>
      </section>
    
    </main>
  )
}
