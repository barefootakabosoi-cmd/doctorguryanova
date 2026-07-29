# 🚀 DEPLOYMENT — doctorguryanova.ru

## Vercel (основной)

### Автодеплой
1. Push в `main` → Vercel собирает и деплоит автоматически
2. URL: https://doctorguryanova.ru

### Environment Variables
Добавить в Vercel Dashboard → Project → Settings → Environment Variables:

```
YOOKASSA_SHOP_ID=            # из кабинета ЮKassa
YOOKASSA_SECRET_KEY=         # из кабинета ЮKassa
TELEGRAM_BOT_TOKEN=          # токен @BotFather (НЕ коммитить!)
TELEGRAM_CHAT_ID=-1003816509786
SMTP_HOST=smtp.yandex.ru
SMTP_PORT=465
SMTP_USER=info@doctorguryanova.ru
SMTP_PASS=                   # пароль приложения Яндекс (создать в настройках)
DOCTOR_EMAIL=info@doctorguryanova.ru
YANDEX_VERIFICATION_CODE=    # из Яндекс.Вебмастер
GOOGLE_VERIFICATION_CODE=    # из Google Search Console
```

### Проверка деплоя
```bash
make health          # или curl https://doctorguryanova.ru/api/health
```

---

## Локальная разработка

### Установка
```bash
git clone https://github.com/barefootakabosoi-cmd/doctorguryanova.git
cd doctorguryanova
npm install
```

### Запуск
```bash
make dev             # npm run dev → http://localhost:3000
```

### Сборка
```bash
make build           # npm run build
```

### Линтинг
```bash
make lint            # next lint
```

---

## Деплой на VPS (альтернатива Vercel)

### Сборка статики
```bash
npm run build
# Статические файлы в .next/static/
# Но без output: 'export' нужен Node.js сервер
```

### Docker (TODO)
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Nginx (reverse proxy)
```nginx
server {
    listen 80;
    server_name doctorguryanova.ru www.doctorguryanova.ru;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name doctorguryanova.ru;

    ssl_certificate /etc/letsencrypt/live/doctorguryanova.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/doctorguryanova.ru/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### SSL (Let's Encrypt)
```bash
sudo certbot --nginx -d doctorguryanova.ru -d www.doctorguryanova.ru
```

---

## DNS

| Тип | Имя | Значение |
|-----|-----|----------|
| A | @ | 76.76.21.21 (Vercel) |
| CNAME | www | cname.vercel-dns.com |

---

## Rollback

Если деплой сломался:
1. Vercel Dashboard → Deployments
2. Выбрать предыдущий рабочий деплой
3. "Promote to Production"

---
*Последнее обновление: 28 июля 2026*
