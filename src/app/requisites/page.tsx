import type { Metadata } from "next"
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"

export const metadata: Metadata = {
  title: "Реквизиты и оферта — Гурьянова Валентина Андреевна",
  description: "Реквизиты самозанятого Гурьяновой В.А. для оплаты медицинских услуг. Публичная оферта.",
  robots: { index: true, follow: true },
}

export default function RequisitesPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-teal-50/30">
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 pt-20 pb-16">
        <h1 className="text-3xl font-bold text-slate-900 mb-8">Реквизиты и публичная оферта</h1>

        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 mb-8">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Данные исполнителя</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-slate-50">
              <span className="text-slate-500">ФИО</span>
              <span className="font-medium text-slate-900">Гурьянова Валентина Андреевна</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-50">
              <span className="text-slate-500">Статус</span>
              <span className="font-medium text-slate-900">Самозанятый (НПД)</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-50">
              <span className="text-slate-500">ИНН</span>
              <span className="font-medium text-slate-900">[УКАЖИТЕ ИНН]</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-50">
              <span className="text-slate-500">Телефон</span>
              <span className="font-medium text-slate-900">+7 (999) 123-45-67</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-500">Email</span>
              <span className="font-medium text-slate-900">info@doctorguryanova.ru</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 mb-8">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Публичная оферта</h2>
          <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
            <p>Настоящий документ является публичной офертой (предложением) физического лица, применяющего специальный налоговый режим «Налог на профессиональный доход» (самозанятый), именуемого в дальнейшем «Исполнитель», заключить договор об оказании медицинских услуг с любым физическим лицом, именуемым в дальнейшем «Заказчик».</p>

            <h3 className="font-bold text-slate-900 mt-4">1. Предмет договора</h3>
            <p>1.1. Исполнитель обязуется оказать Заказчику медицинские консультационные услуги (неврология, рефлексотерапия, гирудотерапия, мануальная терапия, остеопатия), а Заказчик обязуется оплатить эти услуги.</p>
            <p>1.2. Услуги оказываются дистанционно (онлайн-консультация по видеосвязи) или очно по адресу: г. Москва, ЛДЦ на Вернадского.</p>

            <h3 className="font-bold text-slate-900 mt-4">2. Стоимость и порядок оплаты</h3>
            <p>2.1. Стоимость услуг указана на сайте doctorguryanova.ru и формируется автоматически при выборе направления консультации.</p>
            <p>2.2. Оплата производится через платёжный сервис ЮKassa банковской картой или иными доступными способами.</p>
            <p>2.3. Услуга считается оплаченной с момента зачисления денежных средств на расчётный счёт Исполнителя.</p>

            <h3 className="font-bold text-slate-900 mt-4">3. Порядок оказания услуг</h3>
            <p>3.1. Заказчик заполняет форму записи на сайте, выбирая дату, время и направление консультации.</p>
            <p>3.2. После оплаты Заказчик получает подтверждение на указанный email и/или телефон.</p>
            <p>3.3. Ссылка на видеоконсультацию отправляется за 15 минут до назначенного времени.</p>

            <h3 className="font-bold text-slate-900 mt-4">4. Отмена и возврат</h3>
            <p>4.1. Заказчик вправе отменить запись не позднее чем за 24 часа до назначенного времени.</p>
            <p>4.2. При отмене за 24+ часов — полный возврат средств. При отмене менее чем за 24 часа — удерживается 50% стоимости. При неявке — возврат не производится.</p>

            <h3 className="font-bold text-slate-900 mt-4">5. Ответственность сторон</h3>
            <p>5.1. Исполнитель не несёт ответственности за технические сбои со стороны Заказчика (отсутствие интернета, неисправность оборудования).</p>
            <p>5.2. Исполнитель обязуется сохранять конфиденциальность медицинских данных Заказчика.</p>

            <h3 className="font-bold text-slate-900 mt-4">6. Заключительные положения</h3>
            <p>6.1. Настоящая оферта действует бессрочно до момента её отзыва Исполнителем.</p>
            <p>6.2. Исполнитель вправе вносить изменения в условия оферты. Изменения вступают в силу с момента публикации на сайте.</p>
            <p>6.3. Оплата услуг Заказчиком является акцептом (принятием) условий настоящей оферты.</p>
          </div>
        </div>

        <div className="bg-amber-50 rounded-xl p-5 border border-amber-100">
          <p className="text-sm text-amber-800">
            <strong>Важно:</strong> Перед оплатой ознакомьтесь с условиями оферты. Совершая оплату, вы подтверждаете согласие с условиями оказания услуг.
          </p>
        </div>
      </div>
      <Footer />
    </main>
  )
}
