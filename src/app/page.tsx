import Link from "next/link";

export const revalidate = 300;

import { SITE_URL } from "@/lib/site"
import { getAllPosts } from "@/lib/blog-data";
import Navbar from "@/components/Navbar"
import Hero from "@/components/Hero"
import Methods from "@/components/Methods"
import About from "@/components/About"
import BookingForm from "@/components/BookingForm"
import Reviews from "@/components/Reviews"
import HowItWorks from "@/components/HowItWorks"
import FinalCTA from "@/components/FinalCTA"
import SEOSections from "@/components/SEOSections"
import Footer from "@/components/Footer"

const physicianJsonLd = {
  "@context": "https://schema.org",
  "@type": "Physician",
  name: "Гурьянова Валентина Андреевна",
  description: "Невролог, рефлексотерапевт. 49 лет практики. Онлайн-консультации.",
  url: SITE_URL,
  telephone: "+7 (916) 100-40-53",
  medicalSpecialty: ["Неврология", "Рефлексотерапия", "Иглорефлексотерапия", "Гирудотерапия", "Остеопатия"],
  address: { "@type": "PostalAddress", addressCountry: "RU", addressLocality: "Москва" },
  priceRange: "3200-5000 RUB",
}

export default async function Home() {
  const posts = await getAllPosts();
  return (
    <main className="min-h-screen bg-cream text-charcoal">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(physicianJsonLd) }}
      />
      <Navbar />
      <Hero />
      <Methods />
      <About />
      <HowItWorks />
      <BookingForm />
      <Reviews />
      <SEOSections />
      
    
      {/* Последние статьи блога */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-2">Блог невролога</h2>
        <p className="text-charcoal/60 text-center mb-10">Полезные статьи о здоровье, основанные на научных исследованиях</p>
        <div className="grid md:grid-cols-2 gap-6">
          {posts.slice(0, 4).map((post) => (
            <Link href={`/blog/${post.slug}`} key={post.slug} className="border border-charcoal/10 rounded-lg p-6 hover:shadow-md transition-shadow">
              <h3 className="text-xl font-semibold text-charcoal mb-2">{post.title}</h3>
              <p className="text-charcoal/60 text-sm">{post.excerpt}</p>
            </Link>
          ))}
        </div>
        <div className="text-center mt-8">
          <Link href="/blog" className="inline-block bg-charcoal text-cream px-6 py-3 rounded-xl font-semibold hover:bg-charcoal/80 transition-colors">
            Все статьи
          </Link>
        </div>
      </section>
    
    
      <FinalCTA />
      <Footer /></main>
  )
}
