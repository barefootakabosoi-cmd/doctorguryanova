#!/bin/bash
# deploy.sh — doctorguryanova.ru
# Быстрый деплой: git add → commit → push → Vercel redeploy
# Запуск: ./deploy.sh "описание коммита"

set -e

MSG="${1:-chore: update site}"

echo "🚀 Деплой doctorguryanova.ru"
echo "============================="

# Проверка .env.local в .gitignore
if grep -q ".env.local" .gitignore 2>/dev/null; then
    echo "✅ .env.local в .gitignore"
else
    echo "⚠️  Добавляю .env.local в .gitignore..."
    echo ".env.local" >> .gitignore
    echo ".env" >> .gitignore
fi

# Git
echo ""
echo "📦 Git commit + push..."
git add .
git commit -m "$MSG" || echo "⚠️  Нечего коммитить"
git push origin main

echo ""
echo -e "[0;32m✅ Код запушен! Vercel деплоит автоматически...[0m"
echo ""
echo "Следующие шаги:"
echo "  1. Жди 30-60 секунд"
echo "  2. Открой https://doctorguryanova.ru"
echo "  3. Проверь Яндекс.Вебмастер → нажми 'Подтвердить'"
echo ""
echo "Проверить деплой:"
echo "  curl -s https://doctorguryanova.ru | grep yandex-verification"
