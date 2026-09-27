"use client"
import { useState, useEffect } from "react"
import Link from "next/link"

export default function CookieBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem("cookieConsent")) {
      setShow(true)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem("cookieConsent", "true")
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-2xl bg-charcoal/95 backdrop-blur-md text-cream p-6 rounded-2xl shadow-2xl border border-slate-700 flex flex-col sm:flex-row items-center gap-4">
      <p className="text-sm text-slate-300 flex-1 text-center sm:text-left">
        Мы используем cookies для улучшения работы сайта и анализа трафика. Подробнее в{" "}
        <Link href="/privacy" className="underline text-amber-400 hover:text-amber-300 transition-colors">
          политике конфиденциальности
        </Link>.
      </p>
      <button 
        onClick={handleAccept}
        className="bg-amber-600 hover:bg-amber-500 text-cream px-6 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors shadow-sm"
      >
        Принять
      </button>
    </div>
  )
}
