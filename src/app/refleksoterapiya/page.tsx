import type { Metadata } from "next"
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"

export const metadata: Metadata = {
  title: "Иглоукалывание (акупунктура) в Москве — Гурьянова В.А.",
  description: "Рефлексотерапия и иглоукалывание по методике традиционной китайской медицины. Лечение болей, бессонницы, мигреней. 49 лет опыта. Запись онлайн.",
  keywords: "иглоукалывание москва, акупунктура, рефлексотерапия, иглотерапия, лечение иглами, ткм",
  alternates: { canonical: "https://doctorguryanova.ru/refleksoterapiya/" },
}

export default function RefleksoterapiyaPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-teal-50/30">
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 pt-20 pb-16">
        <p className="text-xs font-semibold text-teal-600 uppercase tracking-widest mb-3">Направление</p>
        <h1 className="text-4xl font-bold text-slate-900 mb-6">Рефлексотерапия (иглоукалывание)</h1>
        <div className="prose prose-slate max-w-none">
          <p className="text-lg text-slate-600 leading-relaxed mb-6">
            Рефлексотерапия — метод лечения, основанный на раздражении биологически активных точек организма. Гурьянова Валентина Андреевна применяет классическую акупунктуру, лазерную акупунктуру и аурикулотерапию.
          </p>
          <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">Показания</h2>
          <ul className="space-y-2 text-slate-600">
            <li>• Хронические боли в спине, шее, суставах</li>
            <li>• Бессонница, депрессия, хронический стресс</li>
            <li>• Мигрени и головокружения</li>
            <li>• Нарушения пищеварения, метаболизма</li>
            <li>• Восстановление после инсультов</li>
            <li>• Бесплодие (в комплексной терапии)</li>
          </ul>
          <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">Как проходит сеанс</h2>
          <p className="text-slate-600 mb-4">После диагностики и определения активных точек врач вводит стерильные одноразовые иглы. Сеанс длится 30–60 минут. Курс обычно составляет 8–12 процедур.</p>
          <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">Стоимость</h2>
          <p className="text-2xl font-bold text-teal-700 mb-2">4 000 ₽</p>
          <p className="text-sm text-slate-500 mb-8">Сеанс рефлексотерапии, 60 минут</p>
          <a href="/#booking" className="inline-block bg-slate-900 text-white px-7 py-3.5 rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all duration-300 shadow-lg shadow-slate-900/10">
            Записаться на приём
          </a>
        </div>
      </div>
      <Footer />
    </main>
  )
}
