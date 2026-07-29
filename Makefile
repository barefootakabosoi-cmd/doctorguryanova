# Makefile — doctorguryanova.ru
# Команды для разработки и деплоя

.PHONY: dev build lint test health deploy clean

## Запуск локального сервера
dev:
	npm run dev

## Сборка для продакшена
build:
	npm run build

## Линтинг
lint:
	npm run lint

## Типизация (если настроено)
type-check:
	npx tsc --noEmit

## Проверка здоровья сайта
health:
	@echo "Checking doctorguryanova.ru..."
	@curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" https://doctorguryanova.ru
	@curl -s -o /dev/null -w "API /api/booking: %{http_code}\n" https://doctorguryanova.ru/api/booking

## Деплой (push → Vercel автодеплой)
deploy:
	git push origin main

## Очистка
 clean:
	rm -rf .next
	rm -rf node_modules
	rm -f package-lock.json

## Установка зависимостей
install:
	npm install

## Форматирование кода
format:
	npx prettier --write "src/**/*.{ts,tsx}"
