import Link from "next/link";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 bg-cream/90 backdrop-blur-md border-b border-gold/20">
      <nav className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-serif text-xl text-charcoal">
          Гурьянова <span className="text-gold">В.А.</span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-charcoal/70">
          <Link href="/nevrologiya" className="hover:text-gold transition-colors">Неврология</Link>
          <Link href="/refleksoterapiya" className="hover:text-gold transition-colors">Рефлексотерапия</Link>
          <Link href="/girudoterapiya" className="hover:text-gold transition-colors">Гирудотерапия</Link>
          <Link href="/osteopatiya" className="hover:text-gold transition-colors">Остеопатия</Link>
          <Link href="/blog" className="hover:text-gold transition-colors">Блог</Link>
        </div>

        <a 
          href="/#booking" 
          className="bg-charcoal text-cream px-4 py-2 md:px-5 md:py-2.5 rounded-full text-sm font-medium hover:bg-gold transition-all duration-300"
        >
          Записаться
        </a>
      </nav>
    </header>
  );
}
