# 🏗️ ARCHITECTURE — doctorguryanova.ru

## Общая информация

| Параметр | Значение |
|----------|----------|
| Домен | doctorguryanova.ru |
| Репозиторий | github.com/barefootakabosoi-cmd/doctorguryanova |
| Локальный путь | ~/Projects/doctorguryanova-site |
| Деплой | Vercel (авто при git push origin main) |
| Врач | Гурьянова Валентина Андреевна |
| Специализация | Невролог, рефлексотерапевт, гирудотерапевт |

## Стек технологий

| Слой | Технология |
|------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Forms | react-hook-form + zod |
| Email | nodemailer (SMTP Yandex) |
| Payments | ЮKassa (REST API) |
| Video | Jitsi Meet (автоссылки) |
| Notifications | Telegram Bot API |
| Hosting | Vercel |
| DNS | doctorguryanova.ru → Vercel |

## Структура проекта

```
doctorguryanova/
├── public/
│   ├── robots.txt              # индексация
│   └── og-image.jpg            # OG-image для соцсетей
├── src/
│   ├── app/
│   │   ├── layout.tsx          # SEO, Schema.org, CookieBanner
│   │   ├── page.tsx            # главная (Hero, Methods, BookingForm, Reviews)
│   │   ├── sitemap.ts          # карта сайта (9 страниц)
│   │   ├── icon.tsx            # favicon SVG
│   │   ├── apple-icon.tsx      # Apple touch icon
│   │   ├── not-found.tsx       # (TODO) кастомная 404
│   │   ├── privacy/
│   │   │   └── page.tsx        # политика 152-ФЗ
│   │   ├── requisites/
│   │   │   └── page.tsx        # оферта, ИНН 770943003
│   │   ├── payment/
│   │   │   └── success/
│   │   │       └── page.tsx    # страница успеха оплаты
│   │   └── api/
│   │       ├── booking/
│   │       │   └── route.ts    # POST: валидация → Telegram + SMTP
│   │       └── payment/
│   │           ├── create/
│   │           │   └── route.ts    # POST: создание платежа ЮKassa
│   │           └── webhook/
│   │               └── route.ts    # POST: webhook → Jitsi + email + Telegram
│   └── components/
│       ├── BookingForm.tsx     # форма записи (2 шага, валидация)
│       ├── CookieBanner.tsx    # баннер cookies
│       ├── Navbar.tsx          # навигация
│       ├── Footer.tsx          # телефон, email, ссылки
│       ├── Hero.tsx            # (предполагается) Hero-блок
│       ├── Methods.tsx         # (предполагается) методы лечения
│       └── Reviews.tsx         # (предполагается) отзывы
├── next.config.js              # конфиг Next.js (без output: 'export')
├── package.json                # зависимости
├── .env.example                # шаблон env vars
├── tsconfig.json               # TypeScript конфиг
├── tailwind.config.ts          # Tailwind конфиг
├── Makefile                    # команды разработки
├── TASKS_KANBAN.md           # задачи
├── FEATURES_KANBAN.md        # фичи
├── TESTS_KANBAN.md           # баги/тесты
└── AGENTS_LOG.md             # логи агентов
```

## Потоки данных

### 1. Запись на консультацию (без оплаты)
```
Пациент → BookingForm → POST /api/booking
                                    ↓
                            ┌───────┴───────┐
                            ↓               ↓
                        Telegram        SMTP (Yandex)
                        (группа)        info@doctorguryanova.ru
                        -1003816509786  + DOCTOR_EMAIL
```

### 2. Запись с оплатой
```
Пациент → BookingForm → POST /api/payment/create
                                    ↓
                            ЮKassa (редирект)
                                    ↓
                            Пациент оплачивает
                                    ↓
                            POST /api/payment/webhook
                                    ↓
                            ┌───────┼───────┐
                            ↓       ↓       ↓
                         Jitsi   SMTP    Telegram
                         ссылка  email   группа
```

### 3. SEO / Индексация
```
Google / Yandex → robots.txt → sitemap.xml → страницы (SSR)
                        ↓
                Schema.org (Physician, MedicalBusiness)
                Open Graph, Twitter Card
```

## Ключевые модели данных

### Booking (запись)
```typescript
interface Booking {
  name: string;           // имя пациента
  phone: string;          // телефон
  email?: string;         // email (опционально)
  direction: string;      // направление (неврология, рефлексотерапия...)
  date: string;           // дата приёма
  time: string;           // время приёма
  symptoms?: string;      // описание симптомов
  consent: boolean;       // согласие на ПДн
}
```

### Payment (платёж)
```typescript
interface Payment {
  id: string;             // ID платежа ЮKassa
  amount: number;         // сумма в рублях
  description: string;      // описание
  status: 'pending' | 'succeeded' | 'canceled';
  bookingId?: string;       // связь с записью
  jitsiLink?: string;       // ссылка на Jitsi
  createdAt: Date;
}
```

## Безопасность

| Угроза | Мера |
|--------|------|
| Утечка токенов | Только в Vercel env, не в коде/гите |
| CSRF | Next.js App Router обрабатывает автоматически |
| XSS | react-hook-form + zod валидация на сервере |
| Спам в форме | Rate limiting (TODO) |
| DDoS | Vercel Edge Network (встроено) |

## Производительность

| Метрика | Цель | Статус |
|---------|------|--------|
| LCP (Largest Contentful Paint) | < 2.5s | Не измерено |
| FID (First Input Delay) | < 100ms | Не измерено |
| CLS (Cumulative Layout Shift) | < 0.1 | Не измерено |
| TTFB (Time to First Byte) | < 600ms | Vercel Edge |

---
*Последнее обновление: 28 июля 2026*
