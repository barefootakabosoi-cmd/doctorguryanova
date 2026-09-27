# 🚀 FEATURES_KANBAN — doctorguryanova.ru
# Формат: [ ] PLANNED | [~] IN_DEV | [x] DEPLOYED | [!] ON_HOLD
# Каждая фича = Epic, внутри — задачи

## ✅ DEPLOYED

### Epic: SEO Foundation
- [x] SSR-страницы (Next.js App Router)
- [x] Schema.org: Physician, MedicalBusiness
- [x] Open Graph meta tags
- [x] Twitter Card
- [x] Canonical URLs
- [x] robots.txt
- [x] Sitemap (9 страниц)
- [x] Favicon (icon.tsx + apple-icon.tsx)

### Epic: Legal Compliance
- [x] Политика конфиденциальности (/privacy/) — 152-ФЗ
- [x] Оферта (/requisites/) — консультационные услуги, ИНН 770943003
- [x] Дисклеймер ФЗ-323 (не медуслуги, нет лицензии)
- [x] Cookie-баннер (CookieBanner.tsx)
- [x] Чекбокс согласия на ПДн в форме

### Epic: Booking Form
- [x] react-hook-form + zod валидация
- [x] 2 шага: направление → данные
- [x] Валидация телефона, email
- [x] POST /api/booking → Telegram + SMTP

### Epic: Notifications
- [x] Telegram-бот (@Docguryanovabot)
- [x] SMTP через Yandex (nodemailer)
- [x] Уведомления врачу и пациенту

### Epic: Payment (частично)
- [x] API создания платежа ЮKassa (/api/payment/create)
- [x] Webhook обработка (/api/payment/webhook)
- [x] Jitsi Meet ссылка после оплаты
- [x] Страница успеха (/payment/success)

## 🚧 IN_DEV

### Epic: Dashboard / Admin Panel
- [~] Макет админ-панели
- [ ] Авторизация (NextAuth / Clerk)
- [ ] Таблица записей
- [ ] Фильтры по дате, статусу
- [ ] Экспорт в Excel

## 📋 PLANNED

### Epic: Analytics
- [ ] Google Analytics 4
- [ ] Яндекс.Метрика
- [ ] Цели: отправка формы, оплата, просмотр страницы

### Epic: Content
- [ ] Блог: /blog/[slug]
- [ ] Статьи по неврологии, рефлексотерапии, гирудотерапии
- [ ] Видео-консультации (запись, хостинг)

### Epic: AI Assistant
- [ ] Чат-виджет на сайте
- [ ] Интеграция GigaChat / YandexGPT
- [ ] Сбор анамнеза перед приёмом
- [ ] Рекомендации по подготовке к консультации

### Epic: CRM
- [ ] PostgreSQL + Prisma
- [ ] Модель Booking (запись)
- [ ] Модель Patient (пациент)
- [ ] Модель Payment (платёж)
- [ ] API CRUD для записей

### Epic: SMS
- [ ] Интеграция SMS.ru / smsc.ru
- [ ] Напоминание за 24ч
- [ ] Подтверждение записи

## ⏸️ ON_HOLD

### Epic: iOS / Android App
- [ ] React Native / Expo
- [ ] Push-уведомления
- [ ] Блокер: нет ресурсов, низкий приоритет

### Epic: Интеграция с МИС
- [ ] ЭМИАС / ЕГИСЗ
- [ ] Блокер: требуется лицензия, сложная бюрократия

---
*Последнее обновление: 28 июля 2026*
