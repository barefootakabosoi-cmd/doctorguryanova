# doctorguryanova.ru

Сайт для онлайн-консультаций врача-невролога **Гурьяновой Валентины Андреевны**.

## О враче

- **Специализация:** неврология, рефлексотерапия, гирудотерапия
- **Стаж:** 49 лет практики
- **Образование:** 1-й МГМУ им. Сеченова, 1977
- **Сайт:** [doctorguryanova.ru](https://doctorguryanova.ru)

## Стек

- **Next.js 14** (App Router, SSR для SEO)
- **TypeScript**
- **Tailwind CSS**
- **react-hook-form + zod** (валидация форм)
- **nodemailer** (SMTP Yandex)
- **ЮKassa** (онлайн-оплата)
- **Jitsi Meet** (видеоконсультации)
- **Telegram Bot API** (уведомления)

## Быстрый старт

```bash
# 1. Клонировать
 git clone https://github.com/barefootakabosoi-cmd/doctorguryanova.git
 cd doctorguryanova

# 2. Установить зависимости
 npm install

# 3. Скопировать env и заполнить
 cp .env.example .env.local

# 4. Запустить локально
 make dev
 # Открыть http://localhost:3000
```

## Деплой

Автодеплой на Vercel при `git push origin main`.

См. [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) для подробностей.

## Документация

| Файл | Описание |
|------|----------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Архитектура, стек, структура |
| [docs/API.md](docs/API.md) | REST API, env vars, внешние API |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Деплой, DNS, SSL |
| [docs/AGENTS_ONBOARDING.md](docs/AGENTS_ONBOARDING.md) | Правила работы агентов |
| [TASKS_KANBAN.md](TASKS_KANBAN.md) | Текущие задачи |
| [FEATURES_KANBAN.md](FEATURES_KANBAN.md) | Roadmap фич |
| [TESTS_KANBAN.md](TESTS_KANBAN.md) | Баги и тесты |
| [AGENTS_LOG.md](AGENTS_LOG.md) | Логи агентов |

## Лицензия

Проприетарный проект. Все права защищены.
