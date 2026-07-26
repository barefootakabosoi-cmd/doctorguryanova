"use client"

import { useState } from "react"

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  const scrollTo = (id: string) => {
    setMobileOpen(false)
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-slate-100/80">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <a href="/" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-600 to-emerald-700 flex items-center justify-center text-white font-bold text-sm tracking-tight shadow-sm">ВГ</div>
          <div>
            <h1 className="font-semibold text-slate-900 text-base leading-tight tracking-tight">Валентина Гурьянова</h1>
            <p className="text-xs text-slate-400 font-medium tracking-wide uppercase">Невролог · Рефлексотерапевт</p>
          </div>
        </a>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-500">
          <button onClick={() => scrollTo("about")} className="hover:text-teal-700 transition-colors duration-300">О враче</button>
          <button onClick={() => scrollTo("methods")} className="hover:text-teal-700 transition-colors duration-300">Методы</button>
          <button onClick={() => scrollTo("booking")} className="hover:text-teal-700 transition-colors duration-300">Запись</button>
          <button onClick={() => scrollTo("reviews")} className="hover:text-teal-700 transition-colors duration-300">Отзывы</button>
        </div>
        <button onClick={() => scrollTo("booking")} className="hidden md:block bg-slate-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 transition-all duration-300 shadow-sm hover:shadow-md">
          Записаться
        </button>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 text-slate-600">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>
      </div>
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white/95 backdrop-blur-xl px-6 py-4 space-y-3">
          <button onClick={() => scrollTo("about")} className="block w-full text-left text-sm font-medium text-slate-600 hover:text-teal-700">О враче</button>
          <button onClick={() => scrollTo("methods")} className="block w-full text-left text-sm font-medium text-slate-600 hover:text-teal-700">Методы</button>
          <button onClick={() => scrollTo("booking")} className="block w-full text-left text-sm font-medium text-slate-600 hover:text-teal-700">Запись</button>
          <button onClick={() => scrollTo("reviews")} className="block w-full text-left text-sm font-medium text-slate-600 hover:text-teal-700">Отзывы</button>
        </div>
      )}
    </nav>
  )
}
