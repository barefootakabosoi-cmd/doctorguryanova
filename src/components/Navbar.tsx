import Link from "next/link";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-[#FAF9F6]/80 border-b border-[#C5A059]/20">
      <nav className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-serif text-xl text-[#1A1A1A] tracking-tight">
          Гурьянова <span className="text-[#C5A059]">В.А.</span>
        </Link>
        
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#4A4A4A]">
          <Link href="/nevrologiya" className="hover:text-[#C5A059] transition-colors">Неврология</Link>
          <Link href="/refleksoterapiya" className="hover:text-[#C5A059] transition-colors">Рефлексотерапия</Link>
          <Link href="/girudoterapiya" className="hover:text-[#C5A059] transition-colors">Гирудотерапия</Link>
          <Link href="/osteopatiya" className="hover:text-[#C5A059] transition-colors">Остеопатия</Link>
          <Link href="/blog" className="hover:text-[#C5A059] transition-colors">Блог</Link>
        </div>

        <a 
          href="/#booking" 
          className="hidden md:inline-block bg-[#1A1A1A] text-[#FAF9F6] px-5 py-2.5 rounded-full text-sm font-medium hover:bg-[#C5A059] transition-all duration-300 shadow-sm"
        >
          Записаться
        </a>
      </nav>
    </header>
  );
}
