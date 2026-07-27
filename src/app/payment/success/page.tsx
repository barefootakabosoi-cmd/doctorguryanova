"use client"

import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

function SuccessContent() {
  const searchParams = useSearchParams()
  const paymentId = searchParams.get("paymentId")

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-teal-50/30 flex items-center justify-center px-6">
      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/30 border border-slate-100 p-10 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-3">Оплата прошла успешно!</h1>
        <p className="text-slate-500 mb-2">Ваша запись подтверждена.</p>
        {paymentId && (
          <p className="text-xs text-slate-400 mb-6 font-mono">ID платежа: {paymentId}</p>
        )}
        <div className="bg-slate-50 rounded-xl p-5 text-left space-y-3 text-sm mb-6">
          <p className="text-slate-600">📧 Подтверждение со <b>ссылкой на видеоконсультацию</b> отправлено на ваш email</p>
          <p className="text-slate-600">⏰ Напоминание придёт за 15 минут до приёма</p>
          <p className="text-slate-600">💻 Для консультации нужен браузер Chrome/Firefox и стабильный интернет</p>
        </div>
        <a href="/" className="inline-block bg-slate-900 text-white px-7 py-3 rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all">
          На главную
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
