#!/bin/bash
# add-yandex-verify.sh — создаёт файл верификации Яндекса и пушит
# Запуск: chmod +x add-yandex-verify.sh && ./add-yandex-verify.sh

set -e

echo "🚀 Создаю файл верификации Яндекса..."

# Проверка, что мы в папке проекта
if [ ! -f "package.json" ]; then
    echo "❌ Ошибка: запусти из корня проекта doctorguryanova-site"
    exit 1
fi

# Создаём файл
mkdir -p public
cat > public/yandex_4d3ba462f450909b.html << 'EOF'
<html>
<head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"></head>
<body>Verification: 4d3ba462f450909b</body>
</html>
EOF

echo "✅ Файл создан: public/yandex_4d3ba462f450909b.html"

# Git
git add public/yandex_4d3ba462f450909b.html
git commit -m "feat: yandex verification file" || echo "⚠️  Нечего коммитить"
git push origin main

echo ""
echo "🎉 Готово! Жди 30 секунд пока Vercel задеплоит."
echo "Потом нажми 'Подтвердить' в Яндекс.Вебмастере."
echo ""
echo "Проверить файл: https://www.doctorguryanova.ru/yandex_4d3ba462f450909b.html"
