import type { Metadata } from "next"
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"

export const metadata: Metadata = {
  title: "Гирудотерапия (лечение пиявками) — Гурьянова В.А. Москва",
  description: "Гирудотерапия медицинскими пиявками. Лечение варикоза, гипертонии, остеохондроза, головных болей. Опытный гирудотерапевт с 49-летним стажем. Запись онлайн.",
  keywords: "гирудотерапия москва, лечение пиявками, пиявки медицинские, гирудотерапевт, варикоз пиявки",
  alternates: { canonical: "https://doctorguryanova.ru/girudoterapiya/" },
}

export default function GirudoterapiyaPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-teal-50/30">
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 pt-20 pb-16">
        <p className="text-xs font-semibold text-teal-600 uppercase tracking-widest mb-3">Направление</p>
        <h1 className="text-4xl font-bold text-slate-900 mb-6">Гирудотерапия</h1>
        <div className="prose prose-slate max-w-none">
          <p className="text-lg text-slate-600 leading-relaxed mb-6">
            Гирудотерапия — метод лечения с использованием медицинских пиявок. Слюна пиявки содержит более 100 биологически активных веществ: гирудин, калликреин, коллагеназу, эластазу и другие ферменты.
          </p>
          <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">Показания</h2>
          <ul className="space-y-2 text-slate-600">
            <li>• Варикозное расширение вен, тромбофлебит</li>
            <li>• Гипертоническая болезнь</li>
            <li>• Остеохондроз, артроз, артрит</li>
            <li>• Головные боли, головокружения</li>
            <li>• Гинекологические заболевания</li>
            <li>• Косметология (целлюлит, отёки)</li>
          </ul>
          <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">Как проходит сеанс</h2>
          <p className="text-slate-600 mb-4">Врач определяет зоны постановки пиявок с учётом диагноза. Сеанс длится 40–60 минут. Курс — 5–10 процедур с интервалом 3–7 дней.</p>
          <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">Стоимость</h2>
          <p className="text-2xl font-bold text-teal-700 mb-2">3 800 ₽</p>
          <p className="text-sm text-slate-500 mb-8">Сеанс гирудотерапии, 50 минут</p>
          <a href="/#booking" className="inline-block bg-slate-900 text-white px-7 py-3.5 rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all duration-300 shadow-lg shadow-slate-900/10">
            Записаться на приём
          </a>
        </div>
      </div>
      <Footer />
    </main>
  )
}
