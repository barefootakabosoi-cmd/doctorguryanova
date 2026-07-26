import type { Metadata } from "next"
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"

export const metadata: Metadata = {
  title: "Невролог в Москве — Гурьянова Валентина Андреевна | Онлайн-консультация",
  description: "Приём невролога с 49-летним стажем. Лечение головных болей, мигреней, остеохондроза, невралгий. Онлайн-консультация. Запись на приём.",
  keywords: "невролог москва, невролог онлайн, головные боли лечение, мигрень лечение, остеохондроз, невралгия, приём невролога",
  alternates: { canonical: "https://doctorguryanova.ru/nevrologiya/" },
}

export default function NevrologiyaPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-teal-50/30">
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 pt-20 pb-16">
        <p className="text-xs font-semibold text-teal-600 uppercase tracking-widest mb-3">Направление</p>
        <h1 className="text-4xl font-bold text-slate-900 mb-6">Неврология</h1>
        <div className="prose prose-slate max-w-none">
          <p className="text-lg text-slate-600 leading-relaxed mb-6">
            Неврология — раздел медицины, изучающий заболевания нервной системы. Гурьянова Валентина Андреевна специализируется на диагностике и лечении хронических болевых синдромов, мигреней, последствий травм и инсультов.
          </p>
          <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">Что лечит невролог</h2>
          <ul className="space-y-2 text-slate-600">
            <li>• Головные боли и мигрени любой этиологии</li>
            <li>• Остеохондроз позвоночника, межпозвоночные грыжи</li>
            <li>• Невралгии тройничного нерва, пояснично-крестцовый радикулит</li>
            <li>• Нарушения сна, хроническая усталость, тревожность</li>
            <li>• Последствия черепно-мозговых травм и инсультов</li>
            <li>• Вегето-сосудистая дистония</li>
          </ul>
          <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">Методы диагностики</h2>
          <p className="text-slate-600 mb-4">На первичной консультации проводится неврологический осмотр, оценка рефлексов, координации, чувствительности. При необходимости назначается МРТ, КТ, ЭЭГ, допплерография сосудов.</p>
          <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">Стоимость приёма</h2>
          <p className="text-2xl font-bold text-teal-700 mb-2">3 500 ₽</p>
          <p className="text-sm text-slate-500 mb-8">Первичная консультация, 45 минут</p>
          <a href="/#booking" className="inline-block bg-slate-900 text-white px-7 py-3.5 rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all duration-300 shadow-lg shadow-slate-900/10">
            Записаться на приём
          </a>
        </div>
      </div>
      <Footer />
    </main>
  )
}
