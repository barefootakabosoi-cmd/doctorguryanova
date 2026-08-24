const reviewsList = [
  { name: "Айназик", date: "Февраль 2026", text: "Валентина Андреевна ответила на все мои вопросы. Доктор очень вежливая, внимательная. Я очень осталась довольна.", rating: 5 },
  { name: "Аноним", date: "Март 2026", text: "Врач ознакомилась с результатами МРТ, выдала предписание с лечением и провела необходимые процедуры, чтобы снизить болевой синдром.", rating: 5 },
  { name: "Александр", date: "Март 2022", text: "Прекрасный и великолепный врач. Грамотный специалист. При необходимости придем еще.", rating: 5 },
]

export default function Reviews() {
  return (
    <section id="reviews" className="max-w-5xl mx-auto px-6 py-16">
      <div className="text-center mb-12">
        <p className="text-xs font-semibold text-gold uppercase tracking-widest mb-3">Отзывы пациентов</p>
        <h3 className="text-3xl font-bold text-charcoal">Что говорят пациенты</h3>
      </div>
      <div className="grid md:grid-cols-3 gap-5">
        {reviewsList.map((r) => (
          <div key={r.name} className="bg-cream rounded-2xl p-6 border border-charcoal/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center text-sm font-bold text-teal-700">{r.name[0]}</div>
              <div>
                <p className="font-semibold text-charcoal text-sm">{r.name}</p>
                <p className="text-xs text-charcoal/40">{r.date}</p>
              </div>
            </div>
            <div className="flex gap-0.5 mb-3">
              {Array.from({ length: r.rating }).map((_, i) => (
                <span key={i} className="text-amber-400 text-sm">★</span>
              ))}
            </div>
            <p className="text-sm text-charcoal/60 leading-relaxed">{r.text}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
