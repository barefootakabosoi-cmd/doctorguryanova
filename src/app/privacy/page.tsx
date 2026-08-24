export const metadata = {
  title: "Политика конфиденциальности — Гурьянова В.А.",
  description: "Политика обработки персональных данных в соответствии с 152-ФЗ РФ",
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-teal-50/30 py-16 px-6">
      <div className="max-w-3xl mx-auto bg-cream rounded-3xl shadow-xl shadow-slate-200/30 border border-charcoal/5 p-10">
        <h1 className="text-3xl font-bold text-charcoal mb-6">Политика конфиденциальности</h1>
        <div className="space-y-4 text-sm text-charcoal/60 leading-relaxed">
          <p>Настоящая Политика регулирует обработку персональных данных на сайте doctorguryanova.ru в соответствии с ФЗ № 152-ФЗ.</p>
          <h2 className="text-lg font-bold text-charcoal mt-6">1. Оператор</h2>
          <p>Гурьянова Валентина Андреевна, самозанятый. Контакт: info@doctorguryanova.ru</p>
          <h2 className="text-lg font-bold text-charcoal mt-6">2. Какие данные собираем</h2>
          <p>ФИО, телефон, email, сведения о состоянии здоровья (жалобы, симптомы), дата/время записи.</p>
          <h2 className="text-lg font-bold text-charcoal mt-6">3. Цели обработки</h2>
          <p>Запись на консультацию, уведомления, оказание консультационных услуг, налоговая отчётность.</p>
          <h2 className="text-lg font-bold text-charcoal mt-6">4. Хранение</h2>
          <p>Данные хранятся на серверах Vercel (HTTPS/TLS). Срок — 3 года или до отзыва согласия.</p>
          <h2 className="text-lg font-bold text-charcoal mt-6">5. Третьи лица</h2>
          <p>Передаются только: ЮKassa (оплата), Jitsi Meet (видео), Telegram (уведомления врачу).</p>
          <h2 className="text-lg font-bold text-charcoal mt-6">6. Ваши права</h2>
          <p>Вы вправе запросить доступ, исправление или удаление данных — info@doctorguryanova.ru</p>
          <h2 className="text-lg font-bold text-charcoal mt-6">7. Cookies</h2>
          <p>Технические cookies работают по умолчанию. Аналитика включается только после согласия.</p>
          <p className="text-charcoal/40 mt-8">Обновлено: 27 июля 2026 г.</p>
        </div>
      </div>
    </main>
  )
}
