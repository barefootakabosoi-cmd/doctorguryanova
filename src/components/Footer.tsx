export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 py-12">
      <div className="max-w-5xl mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-8 text-sm">
          <div>
            <h5 className="text-white font-bold mb-3">Валентина Гурьянова</h5>
            <p className="leading-relaxed">Врач-невролог, рефлексотерапевт, гирудотерапевт. 49 лет практики.</p>
          </div>
          <div>
            <h5 className="text-white font-semibold mb-3">Направления</h5>
            <ul className="space-y-2">
              <li><a href="/nevrologiya/" className="hover:text-white transition-colors duration-300">Неврология</a></li>
              <li><a href="/refleksoterapiya/" className="hover:text-white transition-colors duration-300">Рефлексотерапия</a></li>
              <li><a href="/girudoterapiya/" className="hover:text-white transition-colors duration-300">Гирудотерапия</a></li>
              <li><a href="/osteopatiya/" className="hover:text-white transition-colors duration-300">Остеопатия</a></li>
            </ul>
          </div>
          <div>
            <h5 className="text-white font-semibold mb-3">Информация</h5>
            <ul className="space-y-2">
              <li><a href="#about" className="hover:text-white transition-colors duration-300">О враче</a></li>
              <li><a href="#methods" className="hover:text-white transition-colors duration-300">Методы</a></li>
              <li><a href="#booking" className="hover:text-white transition-colors duration-300">Цены</a></li>
              <li><a href="#" className="hover:text-white transition-colors duration-300">Политика конфиденциальности</a></li>
            </ul>
          </div>
          <div>
            <h5 className="text-white font-semibold mb-3">Контакты</h5>
            <p className="mb-1">+7 (999) 123-45-67</p>
            <p className="mb-1">info@doctorguryanova.ru</p>
            <p>Telegram: @guryanova_doc</p>
          </div>
        </div>
        <div className="border-t border-slate-800 mt-10 pt-6 text-xs text-slate-500">
          © 2026 Гурьянова В.А. Информация на сайте не является публичной офертой.
        </div>
      </div>
    </footer>
  )
}
