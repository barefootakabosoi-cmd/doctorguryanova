export default function SEOSections() {
  return (
    <section className="max-w-5xl mx-auto px-6 py-16">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-cream rounded-2xl p-6 border border-charcoal/5">
          <h4 className="font-bold text-charcoal mb-4">Что лечит невролог</h4>
          <ul className="space-y-2.5 text-sm text-charcoal/60">
            <li className="flex items-start gap-2.5"><span className="w-1 h-1 bg-teal-400 rounded-full mt-2 flex-shrink-0"></span>Головные боли и мигрени</li>
            <li className="flex items-start gap-2.5"><span className="w-1 h-1 bg-teal-400 rounded-full mt-2 flex-shrink-0"></span>Остеохондроз, грыжи позвоночника</li>
            <li className="flex items-start gap-2.5"><span className="w-1 h-1 bg-teal-400 rounded-full mt-2 flex-shrink-0"></span>Невралгии, невриты, радикулиты</li>
            <li className="flex items-start gap-2.5"><span className="w-1 h-1 bg-teal-400 rounded-full mt-2 flex-shrink-0"></span>Нарушения сна, тревожность</li>
            <li className="flex items-start gap-2.5"><span className="w-1 h-1 bg-teal-400 rounded-full mt-2 flex-shrink-0"></span>Последствия инсультов и ЧМТ</li>
          </ul>
        </div>
        <div className="bg-cream rounded-2xl p-6 border border-charcoal/5">
          <h4 className="font-bold text-charcoal mb-4">Показания к рефлексотерапии</h4>
          <ul className="space-y-2.5 text-sm text-charcoal/60">
            <li className="flex items-start gap-2.5"><span className="w-1 h-1 bg-emerald-400 rounded-full mt-2 flex-shrink-0"></span>Хронические боли в спине и суставах</li>
            <li className="flex items-start gap-2.5"><span className="w-1 h-1 bg-emerald-400 rounded-full mt-2 flex-shrink-0"></span>Бессонница, депрессия, стресс</li>
            <li className="flex items-start gap-2.5"><span className="w-1 h-1 bg-emerald-400 rounded-full mt-2 flex-shrink-0"></span>Мигрени и головокружения</li>
            <li className="flex items-start gap-2.5"><span className="w-1 h-1 bg-emerald-400 rounded-full mt-2 flex-shrink-0"></span>Нарушения пищеварения</li>
            <li className="flex items-start gap-2.5"><span className="w-1 h-1 bg-emerald-400 rounded-full mt-2 flex-shrink-0"></span>Восстановление после инсульта</li>
          </ul>
        </div>
      </div>
    </section>
  )
}
