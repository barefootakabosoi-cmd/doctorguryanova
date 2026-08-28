# DOCTORGURYANOVA — PROJECT STATE

## CHECKPOINT 0

### Git
- branch: main
- HEAD: e5ae18e
- origin/main: e5ae18e
- working tree: clean (перед созданием этого файла)

### Build
- результат npm run build: Успешно (Compiled successfully)

### Product
Премиальный медицинский лендинг для онлайн-консультаций врача-невролога Гурьяновой В.А. Основная задача — продажа онлайн-консультаций, расшифровка МРТ и второе мнение через видеосвязь.

### Current homepage
Фактические секции главной страницы (`src/app/page.tsx`) по порядку:
1. `<Navbar />`
2. `<Hero />`
3. `<Methods />`
4. `<About />`
5. `<BookingForm />`
6. `<Reviews />`
7. `<SEOSections />`
8. Блок "Последние статьи блога" (встроен в `page.tsx`)
9. `<Footer />`

### Current Hero
Реализация в `src/components/Hero.tsx`:
- Текст: "Валентина Андреевна Гурьянова", H1 "Онлайн-консультация невролога с 49-летним опытом", описание про разбор симптомов и МРТ.
- CTA: Две кнопки ("Записаться на консультацию" -> `/#booking`, "Узнать о враче" -> `#about`).
- Фото: `/images/doctor-hero.jpg` с классом `object-top` для правильного кропа.
- Proof points (Блок доказательств): Сетка из 4 пунктов (49 лет, Высшая категория, 1-й МГМУ, Онлайн).
- Responsive: На мобиле 1 колонка (текст центрирован, фото под ним), на десктопе 2 колонки (текст слева, фото справа).

### Current About
Реализация в `src/components/About.tsx`:
- Фото `/images/doctor-about.jpg` в портретной пропорции.
- Текст с регалиями и сетка 2x2 с плашками (Врач высшей категории, 49 лет практики, Онлайн-приём, 1-й МГМУ).

### Current Blog
- Список (`/blog`): Читает статьи через `getAllPosts()` (Redis KV + fallback на статику).
- Статья (`/blog/[slug]`): Читает конкретную статью через `getPostBySlug()`. Выводит контент, keywords, баннер записи.
- Автор: В коде статьи (`src/app/blog/[slug]/page.tsx`) **фактически отсутствует** фото `doctor-author.jpg`. Там стоит старый DIV с буквой "Г" (`bg-charcoal flex items-center justify-center text-gold`). Замена в коммите `2ff2e1f` не применилась из-за несовпадения строк.

### Current images
Существенные изображения в `public/images/`:
- `doctor-hero.jpg` — используется в `Hero.tsx`.
- `doctor-about.jpg` — используется в `About.tsx`.
- `doctor-author.jpg` — существует, но НИГДЕ не используется (блог не подтягивает его).

### SEO
Фактически реализовано:
- metadata в `layout.tsx` (title, description, openGraph, canonical, metadataBase).
- Динамический sitemap в `src/app/sitemap.ts` (тянет статьи из базы).
- `robots.txt` в `public/robots.txt`.
- JSON-LD (Structured data): `Physician` в `layout.tsx` и `src/app/page.tsx`.
- Внутренние ссылки в Header/Footer и блоке статей.

### Booking / Payment
Фактический путь пользователя:
1. Главная -> CTA "Записаться" -> скролл к `BookingForm`.
2. Форма (2 шага): выбор направления/даты/времени -> ввод ФИО/телефона/email.
3. POST `/api/booking` (проверка слотов в Redis, honeypot, rate-limit).
4. POST `/api/payment/create` (создание платежа ЮKassa, генерация Jitsi-ссылки).
5. Редирект на ЮKassa -> оплата.
6. Webhook ЮKassa -> `/api/payment/webhook` (отправка email пациенту, уведомление в Telegram врачу).

### Integrations
Только то, что подтверждено кодом:
- Redis/KV: Upstash Redis (слоты, статьи, идемпотентность).
- ЮKassa: API создания платежа и вебхук.
- Telegram: Bot API (уведомления врачу, ИИ-триаж, webhook с `secret-token`).
- Jitsi: Генерация ссылок `https://meet.jit.si/guryanova-${bookingId}`.
- SMTP: Nodemailer (настроен, требует боевых кредов).
- GigaChat: API для ИИ-генерации статей и триажа.
- Yandex Metrika: Счётчик в `layout.tsx`.

### Critical — DO NOT TOUCH
Части системы, которые нельзя случайно затрагивать при работе над UI/контентом:
- Платёжную систему (`/api/payment/*`, `services.ts`).
- API бронирования (`/api/booking`, логику Redis KV).
- Интеграции Telegram и Webhook (`/api/telegram/*`).
- Логику генерации Jitsi.
- SEO-инфраструктуру (`layout.tsx` metadata, `sitemap.ts`).
- Аналитику (Yandex Metrika).

### Known issues
Только подтверждённые проблемы:
- В блоге (`/blog/[slug]`) блок автора использует букву "Г" вместо реального фото `doctor-author.jpg`.
- В `src/app/blog/[slug]/page.tsx` используется `dangerouslySetInnerHTML`; необходимо отдельно проверить, гарантируется ли санитизация всего контента до рендера. В проекте присутствует `sanitize-html`, но в рамках текущего checkpoint это отдельно не проверялось.

### Recent commits
- `ee607dc`: Добавление кнопок для Дзена/VC и генерации 3 заголовков.
- `2ff2e1f`: Добавление реальных фото врача в Hero и About. **Важно:** скрипт сообщил, что блок автора в блоге не найден, и фото `doctor-author.jpg` в блог не добавлено.
- `51e1138`: Переписывание Hero по концепции ChatGPT (оффер, 2 кнопки, блок доказательств).
- `e5ae18e`: Корректировка Hero (компактность, класс `object-top` для фото, уменьшение отступов).

### Current development goal

CHECKPOINT 1 — HOMEPAGE V2

Цель следующего этапа:
улучшить главную страницу как коммерческую посадочную страницу врача, сохранив существующую рабочую инфраструктуру, SEO и интеграции.

Пока этот этап НЕ реализован.

### Rules for AI agents
1. Сначала читать PROJECT_STATE.md.
2. Затем смотреть фактический код.
3. Не считать документацию доказательством работоспособности.
4. Не менять несвязанные части проекта.
5. Перед изменением критической инфраструктуры получать отдельное задание.
6. После законченного этапа запускать build.
7. Проверять git diff.
8. Один законченный этап — один осмысленный commit.
9. Обновлять PROJECT_STATE.md после принятого checkpoint.
10. Не делать push без явного задания пользователя.
