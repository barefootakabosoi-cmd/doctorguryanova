#!/bin/bash
# do-it-all.sh — doctorguryanova.ru
# ⚠️ В России api.telegram.org заблокирован — локальная проверка Telegram пропущена
# Проверка Telegram будет через Vercel после деплоя
# Запуск: chmod +x do-it-all.sh && ./do-it-all.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  doctorguryanova.ru — деплой Telegram + Вебмастер          ║"
echo "║  (локальная проверка Telegram пропущена — РФ, нет VPN)     ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# 1. Проверка .gitignore
echo "📁 Проверяю .gitignore..."
if ! grep -q ".env.local" .gitignore 2>/dev/null; then
    echo ".env.local" >> .gitignore
    echo ".env" >> .gitignore
    echo "node_modules/" >> .gitignore
    echo ".next/" >> .gitignore
    echo -e "${GREEN}✅ .gitignore обновлён${NC}"
else
    echo -e "${GREEN}✅ .gitignore в порядке${NC}"
fi

# 2. Создание .env.local
echo ""
echo "🔐 Настройка окружения"
echo ""

read -rp "TELEGRAM_BOT_TOKEN (у @BotFather): " tg_token
read -rp "TELEGRAM_CHAT_ID [default: -1003816509786]: " tg_chat
tg_chat=${tg_chat:--1003816509786}

cat > .env.local <<EOF
TELEGRAM_BOT_TOKEN=${tg_token}
TELEGRAM_CHAT_ID=${tg_chat}
YANDEX_VERIFICATION_CODE=4d3ba462f450909b
EOF

echo -e "${GREEN}✅ .env.local создан${NC}"

# 3. Проверка Telegram — пропущена (РФ, нет VPN)
echo ""
echo -e "${YELLOW}⚠️  Проверка Telegram пропущена — api.telegram.org заблокирован в РФ${NC}"
echo -e "${YELLOW}   После деплоя на Vercel (серверы за границей) Telegram будет работать.${NC}"

# 4. Инструкция по layout.tsx
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}⚠️  ВАЖНО: вставь код в src/app/layout.tsx${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Найди объект metadata и добавь внутрь:"
echo ""
echo -e "${BLUE}  verification: {${NC}"
echo -e "${BLUE}    yandex: '4d3ba462f450909b',${NC}"
echo -e "${BLUE}    google: process.env.GOOGLE_VERIFICATION_CODE || '',${NC}"
echo -e "${BLUE}  },${NC}"
echo ""
echo "Также проверь, что в openGraph.images есть:"
echo -e "${BLUE}  images: [{ url: '/og-image.jpg', width: 1200, height: 630 }],${NC}"
echo ""
echo -e "${YELLOW}После правки нажми Enter...${NC}"
read -r

# 5. Git
echo ""
echo "📦 Git commit + push..."
git add .gitignore .env.local src/app/layout.tsx public/og-image.jpg 2>/dev/null || true
git add . 2>/dev/null || true
git commit -m "feat: yandex verification, telegram env, og-image" || echo -e "${YELLOW}⚠️  Нечего коммитить${NC}"
git push origin main

echo -e "${GREEN}✅ Код запушен!${NC}"

# 6. Инструкция по Vercel
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 Теперь добавь env vars в Vercel и redeploy:${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "1. Открой: https://vercel.com/dashboard"
echo "2. Выбери проект doctorguryanova → Settings → Environment Variables"
echo "3. Добавь:"
echo ""
[ -n "$tg_token" ] && echo "   TELEGRAM_BOT_TOKEN = ${tg_token:0:20}..."
echo "   TELEGRAM_CHAT_ID   = ${tg_chat}"
echo "   YANDEX_VERIFICATION_CODE = 4d3ba462f450909b"
echo ""
echo "4. Нажми 'Redeploy'"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🧪 Проверка Telegram ПОСЛЕ деплоя (через Vercel):${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "После redeploy выполни:"
echo ""
echo -e "${BLUE}  curl -X POST https://doctorguryanova.ru/api/booking \\${NC}"
echo -e "${BLUE}    -H 'Content-Type: application/json' \\${NC}"
echo -e "${BLUE}    -d '{"name":"Тест","phone":"+79991234567","direction":"nevrologiya","date":"2026-08-01","time":"14:00","consent":true}'${NC}"
echo ""
echo "Или просто заполни форму на сайте — сообщение придёт в Telegram-группу."
echo ""
echo -e "${YELLOW}📧 Почта (SMTP через WebHOST1) — на завтра${NC}"
