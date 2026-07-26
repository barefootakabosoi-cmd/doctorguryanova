export default function About() {
  return (
    <section id="about" className="max-w-5xl mx-auto px-6 py-16">
      <div className="bg-white rounded-3xl p-8 lg:p-12 shadow-sm border border-slate-100">
        <div className="grid lg:grid-cols-2 gap-10">
          <div>
            <p className="text-xs font-semibold text-teal-600 uppercase tracking-widest mb-3">О враче</p>
            <h3 className="text-2xl font-bold text-slate-900 mb-6">Интегративный подход к лечению</h3>
            <div className="space-y-4 text-slate-600 leading-relaxed">
              <p>Валентина Андреевна окончила Первый Московский медицинский институт им. И.М. Сеченова в 1977 году. За 49 лет практики сочетает доказательные методы неврологии с традиционными техниками рефлексотерапии и гирудотерапии.</p>
              <p>Каждому пациенту подбирается индивидуальная программа лечения. Работа ведётся в тесном контакте с пациентом — с объяснением назначений и ожидаемых результатов.</p>
              <p>Специализация: лечение головных болей и мигреней, остеохондроза, невралгий, восстановление после инсультов, коррекция нарушений сна и тревожности.</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-5">
              <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-teal-500 rounded-full"></span>
                Образование и квалификация
              </h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>• 1-й МГМУ им. Сеченова, лечебный факультет, 1977</li>
                <li>• Специализация: неврология, рефлексотерапия</li>
                <li>• Гирудотерапия, мануальная терапия</li>
                <li>• Остеопатия, нутрициология</li>
              </ul>
            </div>
            <div className="bg-slate-50 rounded-xl p-5">
              <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                Где принимает
              </h4>
              <p className="text-sm text-slate-600">ЛДЦ на Вернадского, Москва</p>
              <p className="text-sm text-slate-500 mt-1">Онлайн-консультации — из любой точки мира</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
