import Navbar from "@/components/Navbar"
import Hero from "@/components/Hero"
import Methods from "@/components/Methods"
import About from "@/components/About"
import BookingForm from "@/components/BookingForm"
import Reviews from "@/components/Reviews"
import SEOSections from "@/components/SEOSections"
import Footer from "@/components/Footer"

export default function Home() {
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
    </main>
  )
}
