#!/bin/bash
# setup.sh — doctorguryanova.ru
# Интерактивная настройка env vars
# Запуск: chmod +x setup.sh && ./setup.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🚀 Настройка doctorguryanova.ru"
echo "================================"

# Проверка .gitignore
if ! grep -q ".env.local" .gitignore 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Добавляю .env.local в .gitignore...${NC}"
    echo ".env.local" >> .gitignore
    echo ".env" >> .gitignore
    echo "node_modules/" >> .gitignore
    echo ".next/" >> .gitignore
    echo "✅ .gitignore обновлён"
fi

# Проверка существующего .env.local
if [ -f .env.local ]; then
    echo -e "${YELLOW}⚠️  .env.local уже существует. Перезаписать? (y/N)${NC}"
    read -r overwrite
    if [[ ! "$overwrite" =~ ^[Yy]$ ]]; then
        echo "❌ Отменено. Редактируй .env.local вручную."
        exit 0
    fi
fi

echo ""
echo "🔐 Введи секреты (оставь пустым — будет placeholder):"
echo ""

# Telegram
read -rp "TELEGRAM_BOT_TOKEN (получить у @BotFather): " tg_token
read -rp "TELEGRAM_CHAT_ID (default: -1003816509786): " tg_chat
tg_chat=${tg_chat:--1003816509786}

# SMTP
read -rp "SMTP_PASS (пароль приложения Яндекс.Почты): " smtp_pass

# ЮKassa
read -rp "YOOKASSA_SHOP_ID (из кабинета ЮKassa): " yk_shop
read -rp "YOOKASSA_SECRET_KEY (из кабинета ЮKassa): " yk_secret

# SEO
read -rp "YANDEX_VERIFICATION_CODE (из Яндекс.Вебмастер): " ya_code
read -rp "GOOGLE_VERIFICATION_CODE (из Search Console): " g_code

# Записываем .env.local
cat > .env.local <<EOF
# ⚠️ ЭТОТ ФАЙЛ НЕ КОММИТИТЬ! Он в .gitignore

# === ЮKassa ===
YOOKASSA_SHOP_ID=${yk_shop}
YOOKASSA_SECRET_KEY=${yk_secret}

# === Telegram ===
TELEGRAM_BOT_TOKEN=${tg_token}
TELEGRAM_CHAT_ID=${tg_chat}

# === SMTP (Yandex) ===
SMTP_HOST=smtp.yandex.ru
SMTP_PORT=465
SMTP_USER=info@doctorguryanova.ru
SMTP_PASS=${smtp_pass}

# === Email врача ===
DOCTOR_EMAIL=info@doctorguryanova.ru

# === SEO ===
YANDEX_VERIFICATION_CODE=${ya_code}
GOOGLE_VERIFICATION_CODE=${g_code}
EOF

echo ""
echo -e "${GREEN}✅ .env.local создан${NC}"

# Проверка Telegram-бота
if [ -n "$tg_token" ]; then
    echo ""
    echo "🤖 Проверяю Telegram-бота..."
    response=$(curl -s "https://api.telegram.org/bot${tg_token}/getMe")
    if echo "$response" | grep -q '"ok":true'; then
        bot_name=$(echo "$response" | grep -o '"username":"[^"]*"' | cut -d'"' -f4)
        echo -e "${GREEN}✅ Бот работает: @${bot_name}${NC}"

        echo "📨 Отправляю тестовое сообщение в группу..."
        msg_text="🧪 Тестовое сообщение от setup.sh\nСайт: doctorguryanova.ru\nВремя: $(date)"
        msg_response=$(curl -s -X POST "https://api.telegram.org/bot${tg_token}/sendMessage" \
            -d "chat_id=${tg_chat}" \
            -d "text=${msg_text}" \
            -d "parse_mode=HTML")

        if echo "$msg_response" | grep -q '"ok":true'; then
            echo -e "${GREEN}✅ Сообщение в группу отправлено${NC}"
        else
            echo -e "${RED}❌ Не удалось отправить в группу. Проверь, что бот админ в группе ${tg_chat}${NC}"
        fi
    else
        echo -e "${RED}❌ Токен невалидный. Проверь у @BotFather${NC}"
    fi
fi

# Проверка SMTP
if [ -n "$smtp_pass" ]; then
    echo ""
    echo "📧 Проверяю SMTP (Yandex)..."
    node -e "
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
    host: 'smtp.yandex.ru',
    port: 465,
    secure: true,
    auth: { user: 'info@doctorguryanova.ru', pass: '${smtp_pass}' }
});
transporter.verify().then(() => {
    console.log('\x1b[32m✅ SMTP подключение OK\x1b[0m');
}).catch(err => {
    console.log('\x1b[31m❌ SMTP ошибка:', err.message, '\x1b[0m');
});
" 2>/dev/null || echo -e "${YELLOW}⚠️  Не удалось проверить SMTP (nodemailer не установлен?)${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Настройка завершена!${NC}"
echo ""
echo "Следующие шаги:"
echo "  1. make dev          → запустить локально"
echo "  2. make health       → проверить продакшн"
echo "  3. git add .env.local НЕ ДЕЛАЙ — он в .gitignore"
echo "  4. Добавь env vars в Vercel Dashboard → Settings → Environment Variables"
echo ""
