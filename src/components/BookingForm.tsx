"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

const times = ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"]


const bookingSchema = z.object({
  direction: z.string().min(1, "Выберите направление"),
  date: z.string().min(1, "Выберите дату"),
  time: z.string().min(1, "Выберите время"),
  symptoms: z.string().optional(),
  name: z.string().min(2, "Введите имя (минимум 2 символа)"),
  phone: z.string().min(10, "Введите телефон").refine((val) => {
    const digits = val.replace(/\D/g, "")
    return digits.length >= 10
  }, "Введите корректный номер телефона"),
  email: z.string().email("Введите корректный email").optional().or(z.literal("")),
  consent: z.boolean().refine((val) => val === true, {
    message: "Необходимо согласие на обработку персональных данных",
  }),
})

type BookingFormData = z.infer<typeof bookingSchema>

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

export default function BookingForm() {
  const [step, setStep] = useState(1)
  const [price, setPrice] = useState("")
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState("")
  const [bookedSlots, setBookedSlots] = useState<string[]>([])
  const [today, setToday] = useState("")


  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset: resetForm,
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      date: "",
      consent: false,
    },
  })


  const direction = watch("direction")
  const date = watch("date")
  const time = watch("time")
  const name = watch("name")
  const phone = watch("phone")

  useEffect(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    setToday(`${y}-${m}-${day}`);
  }, []);

  useEffect(() => {
    if (!date) return
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    fetch(`/api/booking/slots?date=${date}`, { signal: controller.signal })
      .then(r => r.json())
      .then(data => setBookedSlots(data.slots || []))
      .catch(() => setBookedSlots([]))
      .finally(() => clearTimeout(timeout))
    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [date])


  const handleDirectionChange = (v: string) => {
    setValue("direction", v)
    if (prices[v]) setPrice(prices[v].toLocaleString("ru-RU") + " ₽")
    else setPrice("")
  }

  const availableTimes = times.filter(t => !bookedSlots.includes(t))
  const canProceed = direction && date && time

  const onSubmit = async (data: BookingFormData) => {
    setLoading(true)
    setServerError("")
    
    // Отправка цели в Яндекс.Метрику
    if (typeof window !== "undefined" && (window as any).ym) {
      const ymId = process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID;
      if (ymId) (window as any).ym(ymId, 'reachGoal', 'booking_submit');
    }
    try {
      const bookingRes = await fetch("/api/booking/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!bookingRes.ok) {
        const err = await bookingRes.json()
        setServerError(err.error || "Ошибка при создании записи")
        if (bookingRes.status === 409) {
          setStep(1)
        }
        setLoading(false)
        return
      }

      const bookingData = await bookingRes.json()
      const bookingId = bookingData.id || Date.now().toString()

      // Цена подставляется на сервере из каталога услуг (src/lib/services.ts)
      const paymentRes = await fetch("/api/payment/create/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: data.direction,
          returnUrl: `${window.location.origin}/payment/success/?paymentId=${bookingId}`,
          bookingId,
          email: data.email,
        }),
      })

      const paymentData = await paymentRes.json()

      // Сохраняем Jitsi-ссылку для success-страницы (TEST_MODE)
      if (paymentData.jitsiLink) {
        localStorage.setItem(`jitsi_${bookingId}`, paymentData.jitsiLink)
      }

      if (!paymentRes.ok || !paymentData.paymentUrl) {
        setServerError(paymentData.error || "Ошибка при создании платежа")
        setLoading(false)
        return
      }

      window.location.href = paymentData.paymentUrl
    } catch {
      setServerError("Произошла ошибка. Попробуйте позже.")
      setLoading(false)
    }
  }

  const reset = () => {
    resetForm()
    setStep(1)
    setPrice("")
    setServerError("")
  }

  return (
    <section id="booking" className="max-w-3xl mx-auto px-6 py-16">
      <div className="bg-cream rounded-3xl shadow-xl shadow-slate-200/30 border border-charcoal/5 overflow-hidden">
        <div className="bg-charcoal p-8 text-cream rounded-t-3xl">
          <p className="text-xs font-semibold text-gold uppercase tracking-widest mb-2">Запись на приём</p>
          <h3 className="text-2xl font-bold mb-2">Запишитесь на онлайн-консультацию</h3>
          <p className="text-cream/60 text-sm">Подтверждение и ссылку на консультацию отправим на email</p>
        </div>
        <div className="p-8">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Направление</label>
                <select
                  value={direction}
                  onChange={(e) => handleDirectionChange(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-charcoal/10 focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none transition-all duration-200 bg-cream text-sm"
                >
                  <option value="">Выберите направление</option>
                  <option value="nevro">Неврология — головные боли, остеохондроз</option>
                  <option value="reflex">Рефлексотерапия (иглоукалывание)</option>
                  <option value="girudo">Гирудотерапия</option>
                  <option value="manual">Мануальная терапия</option>
                  <option value="osteopat">Остеопатия</option>
                  <option value="complex">Комплексная консультация</option>
                </select>
                {errors.direction && <p className="text-red-500 text-xs mt-1">{errors.direction.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Дата</label>
                  <input
                    type="date"
                    min={today || "1900-01-01"}
                    {...register("date")}
                    className="w-full px-4 py-3 rounded-xl border border-charcoal/10 focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none transition-all duration-200 text-sm"
                  />
                  {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Время</label>
                  <select
                    {...register("time")}
                    className="w-full px-4 py-3 rounded-xl border border-charcoal/10 focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none transition-all duration-200 bg-cream text-sm"
                  >
                    <option value="">Выберите время</option>
                    {availableTimes.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  {errors.time && <p className="text-red-500 text-xs mt-1">{errors.time.message}</p>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Опишите симптомы</label>
                <textarea
                  {...register("symptoms")}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-charcoal/10 focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none transition-all duration-200 resize-none text-sm"
                  placeholder="Например: головные боли в затылке, шум в ушах..."
                />
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-charcoal/5">
                <div>
                  <p className="text-xs text-charcoal/40 uppercase tracking-wide">Стоимость</p>
                  <p className="text-3xl font-bold text-charcoal">{price || "—"}</p>
                </div>
                <button
                  onClick={() => setStep(2)}
                  disabled={!canProceed}
                  className={`px-8 py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${
                    canProceed
                      ? "bg-charcoal text-cream hover:bg-charcoal/80 shadow-lg shadow-slate-900/10 active:scale-[0.98]"
                      : "bg-slate-100 text-charcoal/40 cursor-not-allowed"
                  }`}
                >
                  Продолжить
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Имя</label>
                  <input
                    type="text"
                    {...register("name")}
                    className="w-full px-4 py-3 rounded-xl border border-charcoal/10 focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none transition-all duration-200 text-sm"
                    placeholder="Имя"
                  />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Телефон</label>
                  <input
                    type="tel"
                    {...register("phone")}
                    className="w-full px-4 py-3 rounded-xl border border-charcoal/10 focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none transition-all duration-200 text-sm"
                    placeholder="+7 (999) 000-00-00"
                  />
                  {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                <input
                  type="email"
                  {...register("email")}
                  className="w-full px-4 py-3 rounded-xl border border-charcoal/10 focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none transition-all duration-200 text-sm"
                  placeholder="email@example.com"
                />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
              </div>

              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="consent"
                  {...register("consent")}
                  className="mt-1 w-4 h-4 rounded border-slate-300 text-gold focus:ring-teal-500"
                />
                <label htmlFor="consent" className="text-sm text-charcoal/60 leading-relaxed">
                  Я согласен на обработку персональных данных в соответствии с{" "}
                  <a href="/privacy/" className="text-gold hover:underline" target="_blank">
                    политикой конфиденциальности
                  </a>
                </label>
              </div>
              {errors.consent && <p className="text-red-500 text-xs mt-1">{errors.consent.message}</p>}

              <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                <p className="text-sm text-amber-800">
                  После нажатия кнопки вы будете перенаправлены на страницу безопасной оплаты ЮKassa.
                  После оплаты получите подтверждение на email и ссылку на видеоконсультацию.
                </p>
              </div>

              {serverError && (
                <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                  <p className="text-sm text-red-700">{serverError}</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-charcoal/50 hover:text-slate-800 font-medium text-sm transition-colors duration-300"
                >
                  ← Назад
                </button>
                <button
                  type="submit"
                  disabled={loading || !name || !phone}
                  className="bg-charcoal text-cream px-8 py-3 rounded-xl font-semibold text-sm hover:bg-charcoal/80 transition-all duration-300 shadow-lg shadow-slate-900/10 active:scale-[0.98] disabled:opacity-50"
                >
                  {loading ? "Создаём запись..." : "Записаться и оплатить"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
