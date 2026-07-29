# 🤖 AGENTS_LOG — doctorguryanova.ru
# Формат: Дата | Агент | Действие | Результат | Следующий шаг
# Правило: каждый агент пишет сюда ПОСЛЕ завершения работы

## 2026-07-28 | Kimi K2.6 | Разведка + агентские файлы

**Контекст:** Пользователь попросил систематизировать проект, создать канбаны и агентские файлы по аналогии с bar-management.

**Что сделано:**
1. Просмотрен репозиторий github.com/barefootakabosoi-cmd/doctorguryanova
2. Просмотрен живой сайт doctorguryanova.ru
3. Созданы файлы:
   - TASKS_KANBAN.md (P0-P3 задачи)
   - FEATURES_KANBAN.md (Epics: deployed / in-dev / planned / on-hold)
   - TESTS_KANBAN.md (S1-S4 баги)
   - docs/ARCHITECTURE.md (стек, структура, потоки данных)
   - docs/API.md (эндпоинты, схемы, env vars)
   - docs/DEPLOYMENT.md (Vercel, VPS, env vars, SSL)
   - docs/AGENTS_ONBOARDING.md (правила работы агентов)
   - .env.example (шаблон переменных окружения)
   - Makefile (команды: dev, build, lint, test, deploy)
4. Сгенерирован OG-image 1200×630 с правильным именем (Валентина Андреевна)

**Ключевые находки:**
- Врач: Гурьянова Валентина Андреевна, невролог/рефлексотерапевт/гирудотерапевт
- 49 лет практики, 1-й МГМУ им. Сеченова 1977
- Сайт деплоен на Vercel, домен doctorguryanova.ru
- Telegram-бот: @Docguryanovabot, chat_id -1003816509786
- SMTP: Yandex, но SMTP_PASS не задан (email не работает)
- ЮKassa: в процессе модерации (SHOP_ID/SECRET_KEY не заданы)
- OG-image отсутствует или заглушка
- Фото врача — заглушка
- Отзывы — тестовые данные
- README на GitHub частично устарел (говорит про static export, но export убран)

**Следующий шаг:**
- Пользователь должен скопировать файлы из output/ в репозиторий
- Приоритет: SMTP_PASS → ЮKassa env vars → OG-image → фото врача

---

## Шаблон для новых записей

```
## YYYY-MM-DD | Имя агента | Краткое описание

**Контекст:** Зачем делалось

**Что сделано:**
1. ...
2. ...

**Ключевые находки / проблемы:**
- ...

**Следующий шаг:**
- ...
```

## 2026-07-29 | Kimi | Интеграция GigaChat API

**Контекст:** Подключение GigaChat для генерации медицинского контента.

**Что сделано:**
1. Создан src/lib/gigachat.ts — клиент для GigaChat API
2. Созданы API routes: /api/ai/generate, /api/ai/status
3. Создан scripts/test-gigachat.js
4. Найден и исправлен баг: Sber выдаёт Client Secret в base64, ID/Secret перепутаны в Basic Auth
5. Деплой на Vercel, проверка на проде: /api/ai/status возвращает configured: true

**Ключевые находки:**
- Sber Client Secret закодирован в base64, нужно декодировать
- Для Basic Auth порядок: decoded_secret : client_id (перепутан!)
- На macOS Node.js 18 требует rejectUnauthorized: false для ngw.devices.sberbank.ru:9443

**Следующий шаг:**
- Первая тестовая генерация статьи через /api/ai/generate
- Подключение PubMed API для автоматического поиска научных статей
