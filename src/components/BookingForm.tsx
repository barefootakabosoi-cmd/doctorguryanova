"use client"

import { useState } from "react"

const times = ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"]
const today = new Date().toISOString().split("T")[0]

export default function BookingForm() {
  const [step, setStep] = useState(1)
  const [direction, setDirection] = useState("")
  const [date, setDate] = useState(today)
  const [time, setTime] = useState("")
  const [symptoms, setSymptoms] = useState("")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [price, setPrice] = useState("")
  const [loading, setLoading] = useState(false)

  const prices: Record<string, number> = {
    nevro: 3500,
    reflex: 4000,
    girudo: 3800,
    manual: 3200,
    osteopat: 4200,
    complex: 5000,
  }

  const directionNames: Record<string, string> = {
    nevro: "Неврология",
    reflex: "Рефлексотерапия",
    girudo: "Гирудотерапия",
    manual: "Мануальная терапия",
    osteopat: "Остеопатия",
    complex: "Комплексная консультация",
  }

  const handleDirectionChange = (v: string) => {
    setDirection(v)
    if (prices[v]) setPrice(prices[v].toLocaleString("ru-RU") + " ₽")
    else setPrice("")
  }

  const canProceed = direction && date && time

  const submit = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/booking/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction, date, time, symptoms, name, phone, email, price }),
      })
      if (res.ok) setStep(3)
      else alert("Ошибка отправки. Попробуйте позже.")
    } catch {
      alert("Ошибка сети. Попробуйте позже.")
    }
    setLoading(false)
  }

  const reset = () => {
    setStep(1)
    setDirection("")
    setDate(today)
    setTime("")
    setSymptoms("")
    setName("")
    setPhone("")
    setEmail("")
    setPrice("")
  }

  return (
    <section id="booking" className="max-w-3xl mx-auto px-6 py-16">
      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/30 border border-slate-100 overflow-hidden">
        <div className="bg-slate-900 p-8 text-white">
          <p className="text-xs font-semibold text-teal-400 uppercase tracking-widest mb-2">Запись на приём</p>
          <h3 className="text-2xl font-bold mb-2">Выберите удобное время</h3>
          <p className="text-slate-400 text-sm">Подтверждение придёт в SMS и Telegram</p>
        </div>
        <div className="p-8">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Направление</label>
                <select value={direction} onChange={(e) => handleDirectionChange(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all duration-200 bg-white text-sm">
                  <option value="">Выберите направление</option>
                  <option value="nevro">Неврология — первичная консультация</option>
                  <option value="reflex">Рефлексотерапия (иглоукалывание)</option>
                  <option value="girudo">Гирудотерапия</option>
                  <option value="manual">Мануальная терапия</option>
                  <option value="osteopat">Остеопатия</option>
                  <option value="complex">Комплексная консультация</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Дата</label>
                  <input type="date" value={date} min={today} onChange={(e) => setDate(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all duration-200 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Время</label>
                  <select value={time} onChange={(e) => setTime(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all duration-200 bg-white text-sm">
                    <option value="">Выберите время</option>
                    {times.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Опишите симптомы</label>
                <textarea value={symptoms} onChange={(e) => setSymptoms(e.target.value)} rows={3} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all duration-200 resize-none text-sm" placeholder="Например: головные боли в затылке, шум в ушах..."></textarea>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Стоимость</p>
                  <p className="text-3xl font-bold text-slate-900">{price || "—"}</p>
                </div>
                <button onClick={() => setStep(2)} disabled={!canProceed} className={`px-8 py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${canProceed ? "bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/10 active:scale-[0.98]" : "bg-slate-100 text-slate-400 cursor-not-allowed"}`}>
                  Продолжить
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Имя</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all duration-200 text-sm" placeholder="Имя" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Телефон</label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all duration-200 text-sm" placeholder="+7 (999) 000-00-00" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all duration-200 text-sm" placeholder="email@example.com" />
              </div>
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                <p className="text-sm text-amber-800">После оплаты вы получите ссылку на видеоконсультацию. За 15 минут до приёма придёт SMS-напоминание.</p>
              </div>
              <div className="flex items-center justify-between pt-4">
                <button onClick={() => setStep(1)} className="text-slate-500 hover:text-slate-800 font-medium text-sm transition-colors duration-300">← Назад</button>
                <button onClick={submit} disabled={loading || !name || !phone} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-semibold text-sm hover:bg-slate-800 transition-all duration-300 shadow-lg shadow-slate-900/10 active:scale-[0.98] disabled:opacity-50">
                  {loading ? "Отправка..." : "Оплатить и записаться"}
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
              </div>
              <h4 className="text-xl font-bold text-slate-900 mb-2">Запись подтверждена</h4>
              <p className="text-slate-500 text-sm mb-6">Подтверждение отправлено на указанный телефон</p>
              <div className="bg-slate-50 rounded-xl p-5 max-w-sm mx-auto text-left space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Направление:</span><span className="font-medium text-slate-900">{directionNames[direction]}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Дата:</span><span className="font-medium text-slate-900">{new Date(date).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Время:</span><span className="font-medium text-slate-900">{time}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Стоимость:</span><span className="font-bold text-teal-700">{price}</span></div>
              </div>
              <button onClick={reset} className="mt-6 text-teal-700 font-medium text-sm hover:underline">Записаться ещё</button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
