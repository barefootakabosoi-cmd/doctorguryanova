"use client"

import { useSearchParams } from "next/navigation"
import { Suspense, useState, useEffect } from "react"

function SuccessContent() {
  const searchParams = useSearchParams()
  const paymentId = searchParams.get("paymentId")
  const noPayment = searchParams.get("noPayment")
  const [jitsiLink, setJitsiLink] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem(`jitsi_${paymentId}`)
    if (stored) {
      setJitsiLink(stored)
      setLoading(false)
      return
    }

    const interval = setInterval(() => {
      const link = localStorage.getItem(`jitsi_${paymentId}`)
      if (link) {
        setJitsiLink(link)
        setLoading(false)
        clearInterval(interval)
      }
    }, 3000)

    const timeout = setTimeout(() => {
      clearInterval(interval)
      setLoading(false)
    }, 30000)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [paymentId])

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-teal-50/30 flex items-center justify-center px-6">
      <div className="bg-cream rounded-3xl shadow-xl shadow-slate-200/30 border border-charcoal/5 p-10 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-charcoal mb-3">
          {noPayment ? "Запись подтверждена!" : "Оплата подтверждена!"}
        </h1>
        <p className="text-charcoal/50 mb-2">
          {noPayment
            ? "Ваша запись создана. Мы свяжемся с вами для уточнения оплаты."
            : "Запись создано. Ссылка на видеоконсультацию — ниже на этой странице."}
        </p>
        {paymentId && (
          <p className="text-xs text-charcoal/40 mb-6 font-mono">ID брони: {paymentId}</p>
        )}

        {loading && !noPayment && (
          <div className="bg-slate-50 rounded-xl p-5 text-left space-y-3 text-sm mb-6">
            <p className="text-charcoal/60">⏳ Генерируем ссылку на видеоконсультацию...</p>
          </div>
        )}

        {jitsiLink && (
          <div className="bg-gold/5 rounded-xl p-5 text-left space-y-3 text-sm mb-6 border border-gold/10">
            <p className="text-gold-dark font-medium">🔗 Ссылка на консультацию:</p>
            <a
              href={jitsiLink}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-teal-600 text-cream text-center px-6 py-3 rounded-xl font-semibold hover:bg-teal-700 transition-all break-all"
            >
              Присоединиться к консультации
            </a>
            <p className="text-gold text-xs">
              Откройте за 5 минут до начала. Разрешите доступ к камере и микрофону.
            </p>
          </div>
        )}

        {!loading && !jitsiLink && !noPayment && (
          <div className="bg-amber-50 rounded-xl p-5 text-left space-y-3 text-sm mb-6 border border-amber-100">
            <p className="text-amber-800">
              ⚠️ Ссылка на консультацию доступна выше на этой странице в течение 24 часов.
              Если не видите — напишите нам в Telegram @Docguryanovabot.
            </p>
          </div>
        )}

        <a href="/" className="inline-block bg-charcoal text-cream px-7 py-3 rounded-xl text-sm font-semibold hover:bg-charcoal/80 transition-all">
          Вернуться на сайт
        </a>
      </div>
    </main>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-charcoal/40">Загрузка...</div>
      </main>
    }>
      <SuccessContent />
    </Suspense>
  )
}
