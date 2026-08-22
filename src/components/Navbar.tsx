import Link from "next/link";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-100">
      <nav className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl text-slate-900">
          Гурьянова <span className="text-teal-600">В.А.</span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <Link href="/nevrologiya" className="hover:text-teal-600 transition-colors">Неврология</Link>
          <Link href="/refleksoterapiya" className="hover:text-teal-600 transition-colors">Рефлексотерапия</Link>
          <Link href="/girudoterapiya" className="hover:text-teal-600 transition-colors">Гирудотерапия</Link>
          <Link href="/osteopatiya" className="hover:text-teal-600 transition-colors">Остеопатия</Link>
          <Link href="/blog" className="hover:text-teal-600 transition-colors">Блог</Link>
        </div>

        <a 
          href="/#booking" 
          className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-teal-600 transition-all duration-300"
        >
          Записаться
        </a>
      </nav>
    </header>
  );
}
