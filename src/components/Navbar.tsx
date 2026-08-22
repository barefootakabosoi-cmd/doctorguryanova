import Link from "next/link";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-[#faf9f6]/80 border-b border-amber-700/20">
      <nav className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-serif text-xl text-neutral-900 tracking-tight">
          Гурьянова <span className="text-amber-700">В.А.</span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-neutral-600">
          <Link href="/nevrologiya" className="hover:text-amber-700 transition-colors">Неврология</Link>
          <Link href="/refleksoterapiya" className="hover:text-amber-700 transition-colors">Рефлексотерапия</Link>
          <Link href="/girudoterapiya" className="hover:text-amber-700 transition-colors">Гирудотерапия</Link>
          <Link href="/osteopatiya" className="hover:text-amber-700 transition-colors">Остеопатия</Link>
          <Link href="/blog" className="hover:text-amber-700 transition-colors">Блог</Link>
        </div>

        <a 
          href="/#booking" 
          className="hidden md:inline-block bg-neutral-900 text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-amber-700 transition-all duration-300 shadow-sm"
        >
          Записаться
        </a>
      </nav>
    </header>
  );
}
