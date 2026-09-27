#!/bin/bash
# test-telegram.sh — быстрая проверка Telegram-бота
# Запуск: ./test-telegram.sh
# Или с другим chat_id: ./test-telegram.sh -1003816509786

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Загружаем токен из .env.local
if [ -f .env.local ]; then
    export $(grep -v '^#' .env.local | xargs)
fi

if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    echo -e "${RED}❌ TELEGRAM_BOT_TOKEN не найден${NC}"
    echo "   Запусти ./setup.sh или добавь в .env.local"
    exit 1
fi

CHAT_ID="${1:-$TELEGRAM_CHAT_ID}"
if [ -z "$CHAT_ID" ]; then
    CHAT_ID="-1003816509786"
fi

echo "🤖 Проверка Telegram-бота..."
echo "   Token: ${TELEGRAM_BOT_TOKEN:0:20}..."
echo "   Chat:  $CHAT_ID"
echo ""

# Проверка бота
echo "1️⃣  Проверяю getMe..."
me=$(curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe")
if echo "$me" | grep -q '"ok":true'; then
    name=$(echo "$me" | grep -o '"first_name":"[^"]*"' | cut -d'"' -f4)
    username=$(echo "$me" | grep -o '"username":"[^"]*"' | cut -d'"' -f4)
    echo -e "${GREEN}✅ Бот жив: ${name} (@${username})${NC}"
else
    echo -e "${RED}❌ Бот не отвечает. Проверь токен.${NC}"
    echo "$me"
    exit 1
fi

# Отправка тестового сообщения
echo ""
echo "2️⃣  Отправляю тестовое сообщение в группу..."
msg="🧪 <b>Тест doctorguryanova.ru</b>\nВремя: $(date '+%Y-%m-%d %H:%M:%S')\nСтатус: ✅ Работает"
resp=$(curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -d "chat_id=${CHAT_ID}" \
    -d "text=${msg}" \
    -d "parse_mode=HTML")

if echo "$resp" | grep -q '"ok":true'; then
    msg_id=$(echo "$resp" | grep -o '"message_id":[0-9]*' | head -1 | cut -d':' -f2)
    echo -e "${GREEN}✅ Сообщение отправлено (message_id: ${msg_id})${NC}"
else
    echo -e "${RED}❌ Ошибка отправки${NC}"
    echo "$resp"
    echo ""
    echo -e "${YELLOW}💡 Проверь:${NC}"
    echo "   • Бот добавлен в группу $CHAT_ID"
    echo "   • Бот является администратором группы"
    echo "   • Группа не приватная (или используй invite link)"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 Telegram работает!${NC}"
