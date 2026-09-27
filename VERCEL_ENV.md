# Vercel Environment Variables — doctorguryanova.ru
# Добавить вручную: https://vercel.com/dashboard → Projects → doctorguryanova → Settings → Environment Variables

## Шаг 1: Открой Vercel Dashboard
1. Перейди на https://vercel.com/dashboard
2. Выбери проект doctorguryanova
3. Вверху вкладка "Settings"
4. Слева меню "Environment Variables"

## Шаг 2: Добавь переменные (по одной)

| Name | Value | Комментарий |
|------|-------|-------------|
| TELEGRAM_BOT_TOKEN | ТВОЙ_ТОКЕН | Из @BotFather |
| TELEGRAM_CHAT_ID | -1003816509786 | Группа "Уведомления с сайта" |
| YANDEX_VERIFICATION_CODE | 4d3ba462f450909b | Из Яндекс.Вебмастер |

## Шаг 3: Redeploy
После добавления всех переменных:
1. Вверху нажми "Deployments"
2. Найди последний деплой
3. Нажми три точки → "Redeploy"

## Шаг 4: Проверь
```bash
curl -s https://doctorguryanova.ru | grep -o '4d3ba462f450909b'
# Должно вернуть: 4d3ba462f450909b
```

## Шаг 5: Подтверди в Яндекс.Вебмастер
1. Открой https://webmaster.yandex.ru
2. Нажми "Подтвердить"
3. Готово!
