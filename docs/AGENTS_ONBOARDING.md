# 🤖 AGENTS_ONBOARDING — doctorguryanova.ru
# Правила работы агентов с проектом

## 1. Перед началом работы

- [ ] Прочитать TASKS_KANBAN.md — понять текущие приоритеты
- [ ] Прочитать FEATURES_KANBAN.md — понять roadmap
- [ ] Прочитать TESTS_KANBAN.md — избежать известных багов
- [ ] Прочитать AGENTS_LOG.md — понять, что делали предыдущие агенты
- [ ] Проверить `make health` (или curl сайта) — убедиться, что продакшн жив

## 2. Во время работы

- [ ] Работать в отдельной ветке: `feat/название` или `fix/название`
- [ ] Не коммитить секреты (API-ключи, токены, пароли) — использовать .env
- [ ] Проверять TypeScript: `npm run type-check` (если есть)
- [ ] Проверять линтер: `make lint`
- [ ] Тестировать локально: `make dev` → http://localhost:3000

## 3. После завершения работы

- [ ] Обновить канбаны (TASKS_KANBAN.md, FEATURES_KANBAN.md, TESTS_KANBAN.md)
- [ ] Написать в AGENTS_LOG.md — что сделано, ключевые находки, следующий шаг
- [ ] Проверить `make health` после изменений
- [ ] Сделать git commit с понятным сообщением (на русском или английском)
- [ ] Push в origin → Vercel автодеплой

## 4. Запрещено

- ❌ Коммитить `.env` файл
- ❌ Коммитить `node_modules/`
- ❌ Коммитить токены ботов, API-ключи, пароли
- ❌ Менять `next.config.js` без согласования (особенно `output: 'export'`)
- ❌ Удалять файлы без проверки зависимостей
- ❌ Пушить напрямую в `main` (если настроена защита ветки)

## 5. Секреты

Все секреты хранятся ТОЛЬКО в Vercel Environment Variables.

| Секрет | Где | Комментарий |
|--------|-----|-------------|
| TELEGRAM_BOT_TOKEN | Vercel env | НЕ в коде, НЕ в гите |
| YOOKASSA_SECRET_KEY | Vercel env | НЕ в коде, НЕ в гите |
| SMTP_PASS | Vercel env | Пароль приложения Яндекс |

## 6. Контакты

- Владелец: Александр Гурьянов
- Email: info@doctorguryanova.ru
- Telegram-группа: "Уведомления с сайта" (-1003816509786)
- Бот: @Docguryanovabot

## 7. Полезные ссылки

- [Vercel Dashboard](https://vercel.com/dashboard)
- [Яндекс.Вебмастер](https://webmaster.yandex.ru)
- [Google Search Console](https://search.google.com/search-console)
- [ЮKassa Кабинет](https://yookassa.ru/my)
- [BotFather](https://t.me/BotFather)

---
*Последнее обновление: 28 июля 2026*
