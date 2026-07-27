"use client"

import { useState, useEffect } from "react"

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem("cookie-consent")) setVisible(true)
  }, [])

  const accept = () => {
    localStorage.setItem("cookie-consent", "true")
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-900 text-white p-4 z-50">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-slate-300">
          Мы используем cookies для корректной работы сайта. Продолжая использовать сайт, вы соглашаетесь с{" "}
          <a href="/privacy/" className="text-teal-400 hover:underline">политикой конфиденциальности</a>.
        </p>
        <button onClick={accept} className="bg-teal-600 hover:bg-teal-500 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap">
          Понятно
        </button>
      </div>
    </div>
  )
}
