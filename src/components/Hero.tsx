"use client"

export default function Hero() {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <section className="max-w-5xl mx-auto px-6 pt-20 pb-16">
      <div className="grid lg:grid-cols-5 gap-12 items-start">
        <div className="lg:col-span-3 space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 bg-teal-50 text-teal-700 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase border border-teal-100/60">
              <span className="w-1.5 h-1.5 bg-teal-500 rounded-full"></span>
              Онлайн-консультации
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 leading-[1.1] tracking-tight">
              Неврология,<br />
              <span className="text-teal-700">рефлексотерапия</span><br />
              и гирудотерапия
            </h2>
            <p className="text-lg text-slate-500 leading-relaxed max-w-lg">
              49 лет практики. Интегративный подход — доказательная медицина плюс традиционные методики. Индивидуальные программы лечения.
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <button onClick={() => scrollTo("booking")} className="bg-slate-900 text-white px-7 py-3.5 rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all duration-300 shadow-lg shadow-slate-900/10 hover:shadow-xl hover:shadow-slate-900/15 active:scale-[0.98]">
              Записаться на приём
            </button>
            <button onClick={() => scrollTo("methods")} className="bg-white text-slate-700 px-7 py-3.5 rounded-xl text-sm font-semibold border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all duration-300">
              Методы лечения
            </button>
          </div>
          <div className="flex items-center gap-6 pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-900">49</p>
              <p className="text-xs text-slate-400 uppercase tracking-wide">лет стажа</p>
            </div>
            <div className="w-px h-10 bg-slate-200"></div>
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-900">9.9</p>
              <p className="text-xs text-slate-400 uppercase tracking-wide">рейтинг</p>
            </div>
            <div className="w-px h-10 bg-slate-200"></div>
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-900">45+</p>
              <p className="text-xs text-slate-400 uppercase tracking-wide">лет практики</p>
            </div>
          </div>
        </div>
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center text-2xl">👩‍⚕️</div>
              <div>
                <p className="font-bold text-slate-900">Гурьянова Валентина Андреевна</p>
                <p className="text-sm text-slate-500">Врач высшей категории</p>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-slate-50">
                <span className="text-slate-500">Образование</span>
                <span className="font-medium text-slate-700 text-right">1-й МГМУ им. Сеченова, 1977</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-50">
                <span className="text-slate-500">Специальности</span>
                <span className="font-medium text-slate-700 text-right">Невролог, рефлексотерапевт</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-50">
                <span className="text-slate-500">Методы</span>
                <span className="font-medium text-slate-700 text-right">Акупунктура, гирудотерапия</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-500">Стоимость</span>
                <span className="font-bold text-teal-700">от 3 000 ₽</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
