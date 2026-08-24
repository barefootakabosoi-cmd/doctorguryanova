const reviews = [
  { name: "Анна М.", date: "Март 2026", text: "Валентина Андреевна - врач от Бога. Головные боли, которые мучили годами, прошли после курса иглоукалывания. Очень благодарна!" },
  { name: "Игорь В.", date: "Февраль 2026", text: "Обратился по поводу остеохондроза. Очень грамотный подход, всё подробно объяснила. Рекомендую!" },
  { name: "Елена С.", date: "Январь 2026", text: "Проходила гирудотерапию. Было немного страшно, но врач всё делала профессионально. Результат отличный!" },
];

export default function Reviews() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-16">
      <h2 className="text-3xl font-serif text-center mb-12 text-charcoal">Отзывы пациентов</h2>

      <div className="grid md:grid-cols-3 gap-6">
        {reviews.map((r, i) => (
          <div key={i} className="bg-white p-6 rounded-xl border border-charcoal/10 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex gap-1 text-gold text-lg">
                ★★★★★
              </div>
              <span className="text-xs text-gold-dark bg-gold/10 px-2 py-1 rounded-full font-medium">
                Проверенный отзыв
              </span>
            </div>
            <p className="text-charcoal/80 text-sm mb-4 italic flex-1">"{r.text}"</p>
            <div className="border-t border-charcoal/10 pt-3 mt-auto">
              <p className="text-charcoal font-medium text-sm">{r.name}</p>
              <p className="text-charcoal/50 text-xs">{r.date}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center mt-10">
        <a 
          href="https://docdoc.ru/doctor/Guryanova_Valentina" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-charcoal text-cream px-8 py-4 rounded-full text-base font-medium hover:bg-gold transition-all duration-300 shadow-lg"
        >
          Смотреть все отзывы на DocDoc
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
            <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
          </svg>
        </a>
      </div>
    </section>
  );
}
