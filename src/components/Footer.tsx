import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-neutral-900 text-neutral-400 mt-20">
      <div className="max-w-6xl mx-auto px-6 py-12 grid md:grid-cols-3 gap-8">
        <div>
          <h3 className="font-serif text-xl text-white mb-2">Гурьянова В.А.</h3>
          <p className="text-sm">Врач-невролог, рефлексотерапевт, гирудотерапевт. 49 лет практики.</p>
        </div>
        <div>
          <h4 className="font-serif text-lg text-amber-600 mb-3">Навигация</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/nevrologiya" className="hover:text-amber-500 transition-colors">Неврология</Link></li>
            <li><Link href="/refleksoterapiya" className="hover:text-amber-500 transition-colors">Рефлексотерапия</Link></li>
            <li><Link href="/girudoterapiya" className="hover:text-amber-500 transition-colors">Гирудотерапия</Link></li>
            <li><Link href="/osteopatiya" className="hover:text-amber-500 transition-colors">Остеопатия</Link></li>
            <li><Link href="/blog" className="hover:text-amber-500 transition-colors">Блог</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-serif text-lg text-amber-600 mb-3">Контакты</h4>
          <ul className="space-y-2 text-sm">
            <li>Телефон: <a href="tel:+79161004053" className="hover:text-amber-500 transition-colors">+7 (916) 100-40-53</a></li>
            <li>Email: <a href="mailto:info@doctorguryanova.ru" className="hover:text-amber-500 transition-colors">info@doctorguryanova.ru</a></li>
            <li><Link href="/privacy" className="hover:text-amber-500 transition-colors">Политика конфиденциальности</Link></li>
            <li><Link href="/requisites" className="hover:text-amber-500 transition-colors">Реквизиты</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-neutral-800 py-6 text-center text-xs text-neutral-500">
        © {new Date().getFullYear()} doctorguryanova.ru. Все права защищены.
      </div>
    </footer>
  );
}
