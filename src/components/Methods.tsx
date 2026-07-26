"use client"

const methodsList = [
  { title: "Неврология", desc: "Диагностика и лечение заболеваний нервной системы", price: "3 500 ₽", time: "45 мин", icon: "🧠", color: "from-slate-700 to-slate-800", href: "/nevrologiya/" },
  { title: "Рефлексотерапия", desc: "Иглоукалывание по методике ТКМ", price: "4 000 ₽", time: "60 мин", icon: "📍", color: "from-teal-600 to-emerald-700", href: "/refleksoterapiya/" },
  { title: "Гирудотерапия", desc: "Лечение медицинскими пиявками", price: "3 800 ₽", time: "50 мин", icon: "🩸", color: "from-rose-600 to-pink-700", href: "/girudoterapiya/" },
  { title: "Мануальная терапия", desc: "Восстановление подвижности позвоночника", price: "3 200 ₽", time: "40 мин", icon: "🙌", color: "from-violet-600 to-purple-700", href: "/manualnaya-terapiya/" },
  { title: "Остеопатия", desc: "Мягкое воздействие на костно-мышечную систему", price: "4 200 ₽", time: "60 мин", icon: "🦴", color: "from-amber-600 to-orange-700", href: "/osteopatiya/" },
  { title: "Комплекс", desc: "Комплексная консультация с диагностикой", price: "5 000 ₽", time: "90 мин", icon: "✨", color: "from-teal-600 to-cyan-700", href: "#booking" },
]

export default function Methods() {
  const scrollToBooking = () => {
    const el = document.getElementById("booking")
    if (el) el.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <section id="methods" className="max-w-5xl mx-auto px-6 py-16">
      <div className="text-center mb-12">
        <p className="text-xs font-semibold text-teal-600 uppercase tracking-widest mb-3">Методы лечения</p>
        <h3 className="text-3xl font-bold text-slate-900">Направления работы</h3>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {methodsList.map((m) => (
          <a
            key={m.title}
            href={m.href.startsWith("/") ? m.href : undefined}
            onClick={!m.href.startsWith("/") ? scrollToBooking : undefined}
            className="group bg-white rounded-2xl p-6 border border-slate-100 hover:border-teal-200 hover:shadow-lg hover:shadow-teal-100/30 transition-all duration-300 cursor-pointer active:scale-[0.98] block"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${m.color} flex items-center justify-center text-xl shadow-md`}>{m.icon}</div>
              <span className="text-base font-bold text-slate-900">{m.price}</span>
            </div>
            <h4 className="font-bold text-slate-900 mb-1.5 group-hover:text-teal-700 transition-colors duration-300">{m.title}</h4>
            <p className="text-sm text-slate-500 mb-3">{m.desc}</p>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              {m.time}
            </div>
          </a>
        ))}
      </div>
    </section>
  )
}
