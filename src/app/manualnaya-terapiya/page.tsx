import type { Metadata } from "next"
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"

export const metadata: Metadata = {
  title: "Мануальная терапия в Москве — Гурьянова Валентина Андреевна",
  description: "Мануальная терапия позвоночника и суставов. Лечение остеохондроза, сколиоза, грыж. 49 лет опыта. Онлайн-консультация и запись.",
  keywords: "мануальная терапия москва, мануальный терапевт, лечение позвоночника, остеохондроз мануальная терапия",
  alternates: { canonical: "https://doctorguryanova.ru/manualnaya-terapiya/" },
}

export default function ManualnayaTerapiyaPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-teal-50/30">
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 pt-20 pb-16">
        <p className="text-xs font-semibold text-teal-600 uppercase tracking-widest mb-3">Направление</p>
        <h1 className="text-4xl font-bold text-slate-900 mb-6">Мануальная терапия</h1>
        <div className="prose prose-slate max-w-none">
          <p className="text-lg text-slate-600 leading-relaxed mb-6">
            Мануальная терапия — метод лечения заболеваний опорно-двигательного аппарата ручными техниками. Гурьянова Валентина Андреевна применяет мягкие и безопасные методы воздействия на позвоночник и суставы.
          </p>
          <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">Показания</h2>
          <ul className="space-y-2 text-slate-600">
            <li>• Остеохондроз шейного, грудного, поясничного отделов</li>
            <li>• Межпозвоночные грыжи без осложнений</li>
            <li>• Сколиоз, кифоз, нарушения осанки</li>
            <li>• Боли в спине, шее, пояснице</li>
            <li>• Нарушения подвижности суставов</li>
          </ul>
          <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">Стоимость</h2>
          <p className="text-2xl font-bold text-teal-700 mb-2">3 200 ₽</p>
          <p className="text-sm text-slate-500 mb-8">Сеанс мануальной терапии, 40 минут</p>
          <a href="/#booking" className="inline-block bg-slate-900 text-white px-7 py-3.5 rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all duration-300 shadow-lg shadow-slate-900/10">
            Записаться на приём
          </a>
        </div>
      </div>
      <Footer />
    </main>
  )
}
