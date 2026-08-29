"use client"

import { useSearchParams } from "next/navigation"
import { Suspense, useState, useEffect } from "react"

function SuccessContent() {
  const searchParams = useSearchParams()
  const bookingId = searchParams.get("bookingId")
  const [jitsiLink, setJitsiLink] = useState<string | null>(null)
  const [status, setStatus] = useState<"loading" | "pending" | "paid" | "timeout">("loading")

  useEffect(() => {
    if (!bookingId) {
      setStatus("timeout")
      return
    }

    let attempts = 0
    const maxAttempts = 20 // 60 секунд (3s * 20)

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/payment/status?bookingId=${bookingId}`)
        const data = await res.json()

        if (data.status === "paid" && data.jitsiLink) {
          setJitsiLink(data.jitsiLink)
          setStatus("paid")
          return true
        }
      } catch (e) {
        console.error("Status check failed", e)
      }

      attempts++
      if (attempts >= maxAttempts) {
        setStatus("timeout")
        return true
      }

      return false
    }

    const interval = setInterval(async () => {
      const done = await checkStatus()
      if (done) clearInterval(interval)
    }, 3000)

    // Первая проверка сразу
    checkStatus().then(done => {
      if (done) clearInterval(interval)
    })

    return () => clearInterval(interval)
  }, [bookingId])

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-teal-50/30 flex items-center justify-center px-6">
      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/30 border border-slate-100 p-10 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          {status === "paid" ? (
            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-8 h-8 text-slate-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
        </div>

        {status === "paid" && (
          <>
            <h1 className="text-2xl font-bold text-slate-900 mb-3">Оплата подтверждена!</h1>
            <p className="text-slate-500 mb-2">Запись создана. Подтверждение отправлено на email.</p>
            {bookingId && <p className="text-xs text-slate-400 mb-6 font-mono">ID брони: {bookingId}</p>}
          </>
        )}

        {(status === "loading" || status === "pending") && (
          <>
            <h1 className="text-2xl font-bold text-slate-900 mb-3">Обработка платежа...</h1>
            <p className="text-slate-500 mb-6">Мы ожидаем подтверждения оплаты. Это может занять до минуты.</p>
          </>
        )}

        {status === "timeout" && (
          <>
            <h1 className="text-2xl font-bold text-slate-900 mb-3">Платёж обрабатывается</h1>
            <p className="text-slate-500 mb-6">
              Если вы оплатили консультацию, ссылка придёт на вашу почту в ближайшее время.
              Если возникли вопросы, напишите нам в Telegram <a href="https://t.me/Docguryanovabot" className="text-teal-600 hover:underline">@Docguryanovabot</a>.
            </p>
          </>
        )}

        {jitsiLink && (
          <div className="bg-teal-50 rounded-xl p-5 text-left space-y-3 text-sm mb-6 border border-teal-100">
            <p className="text-teal-800 font-medium">🔗 Ссылка на консультацию:</p>
            <a
              href={jitsiLink}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-teal-600 text-white text-center px-6 py-3 rounded-xl font-semibold hover:bg-teal-700 transition-all break-all"
            >
              Присоединиться к консультации
            </a>
            <p className="text-teal-600 text-xs">Откройте за 5 минут до начала. Разрешите доступ к камере и микрофону.</p>
          </div>
        )}

        <a href="/" className="inline-block bg-slate-900 text-white px-7 py-3 rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all">
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
        <div className="text-slate-400">Загрузка...</div>
      </main>
    }>
      <SuccessContent />
    </Suspense>
  )
}
