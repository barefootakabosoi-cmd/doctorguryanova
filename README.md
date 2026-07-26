# doctorguryanova.ru

Сайт для онлайн-консультаций врача-невролога Гурьяновой Валентины Андреевны.

## Стек

- **Next.js 14** (App Router, SSR для SEO)
- **TypeScript**
- **Tailwind CSS**
- **Static Export** (для деплоя на любой хостинг)

## Быстрый старт

```bash
# 1. Клонируй репозиторий
git clone https://github.com/USERNAME/doctorguryanova.git
cd doctorguryanova

# 2. Установи зависимости
npm install

# 3. Запусти локально
npm run dev
# Открой http://localhost:3000

# 4. Собери для продакшена
npm run build
# Статические файлы в папке dist/
```

## Деплой на Vercel

1. Залей код на GitHub
2. Зайди на [vercel.com](https://vercel.com) → Import Project → выбери репозиторий
3. В настройках проекта добавь Environment Variables (см. .env.example)
4. Нажми Deploy

## Деплой на свой VPS

```bash
# Собери статику
npm run build

# Заливаешь папку dist/ на сервер через SCP или FTP
scp -r dist/* user@your-server:/var/www/doctorguryanova.ru/

# Настраиваешь Nginx (см. nginx.conf ниже)
```

### Пример nginx.conf

```nginx
server {
    listen 80;
    server_name doctorguryanova.ru www.doctorguryanova.ru;
    root /var/www/doctorguryanova.ru;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # SSL (Let's Encrypt)
    # listen 443 ssl;
    # ssl_certificate /etc/letsencrypt/live/doctorguryanova.ru/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/doctorguryanova.ru/privkey.pem;
}
```

## SEO

- SSR-страницы под каждое направление (`/nevrologiya/`, `/refleksoterapiya/` и т.д.)
- Schema.org разметка (Physician, MedicalBusiness)
- Open Graph для соцсетей
- Канонические URL
- Sitemap (сгенерировать через `next-sitemap`)

## Интеграции (TODO)

- [ ] **ЮKassa** — оплата онлайн
- [ ] **Telegram-бот** — уведомления о записях
- [ ] **PostgreSQL** — хранение записей через Prisma
- [ ] **Email (SMTP)** — подтверждение записи
- [ ] **ИИ-ассистент** — первичная консультация (GigaChat / YandexGPT)

## Контакты

- Сайт: https://doctorguryanova.ru
- Email: info@doctorguryanova.ru
