# 🔌 API — doctorguryanova.ru

## REST Endpoints

### POST /api/booking
Создание записи на консультацию. Отправляет уведомления в Telegram и email.

**Request:**
```json
{
  "name": "Иван Иванов",
  "phone": "+7 (916) 123-45-67",
  "email": "ivan@example.com",
  "direction": "nevrologiya",
  "date": "2026-08-01",
  "time": "14:00",
  "symptoms": "Головные боли, бессонница",
  "consent": true
}
```

**Validation (zod):**
- `name`: min 2 chars
- `phone`: российский формат (+7 или 8)
- `email`: опционально, валидный email
- `direction`: enum ['nevrologiya', 'refleksoterapiya', 'girudoterapiya']
- `date`: строка, формат YYYY-MM-DD
- `time`: строка, формат HH:MM
- `symptoms`: опционально, max 1000 chars
- `consent`: boolean, must be true

**Response 200:**
```json
{
  "success": true,
  "message": "Запись создана"
}
```

**Response 400:**
```json
{
  "success": false,
  "errors": [
    { "field": "phone", "message": "Некорректный номер телефона" }
  ]
}
```

**Side effects:**
- POST к Telegram Bot API (sendMessage)
- SMTP отправка письма врачу и пациенту

---

### POST /api/payment/create
Создание платежа в ЮKassa.

**Request:**
```json
{
  "amount": 3000,
  "description": "Консультация невролога",
  "bookingId": "uuid-123"
}
```

**Response 200:**
```json
{
  "success": true,
  "paymentUrl": "https://yoomoney.ru/checkout/payments/...",
  "paymentId": "2a4b6c8d..."
}
```

**Response 500:**
```json
{
  "success": false,
  "message": "Ошибка создания платежа"
}
```

---

### POST /api/payment/webhook
Webhook от ЮKassa после оплаты.

**Request (from ЮKassa):**
```json
{
  "event": "payment.succeeded",
  "object": {
    "id": "2a4b6c8d...",
    "status": "succeeded",
    "amount": { "value": "3000.00", "currency": "RUB" },
    "description": "Консультация невролога",
    "metadata": { "bookingId": "uuid-123" }
  }
}
```

**Response 200:**
```json
{ "success": true }
```

**Side effects:**
- Генерация ссылки Jitsi Meet
- SMTP отправка ссылки пациенту и врачу
- Telegram уведомление в группу

---

## Environment Variables

| Переменная | Описание | Обязательная | Статус |
|------------|----------|--------------|--------|
| `YOOKASSA_SHOP_ID` | ID магазина ЮKassa | Да | ❌ Не задана |
| `YOOKASSA_SECRET_KEY` | Секретный ключ ЮKassa | Да | ❌ Не задана |
| `TELEGRAM_BOT_TOKEN` | Токен бота @Docguryanovabot | Да | ⚠️ Проверить, не в гите |
| `TELEGRAM_CHAT_ID` | ID группы уведомлений | Да | ✅ -1003816509786 |
| `SMTP_HOST` | SMTP сервер | Да | ✅ smtp.yandex.ru |
| `SMTP_PORT` | SMTP порт | Да | ✅ 465 |
| `SMTP_USER` | Логин SMTP | Да | ✅ info@doctorguryanova.ru |
| `SMTP_PASS` | Пароль приложения Яндекс | Да | ❌ Не задан |
| `DOCTOR_EMAIL` | Email врача | Да | ✅ info@doctorguryanova.ru |
| `YANDEX_VERIFICATION_CODE` | Код Яндекс.Вебмастер | Нет | ❌ Не задан |
| `GOOGLE_VERIFICATION_CODE` | Код Google Search Console | Нет | ❌ Не задан |

## Внешние API

### Telegram Bot API
- **Base URL:** `https://api.telegram.org/bot<TOKEN>/`
- **Method:** `sendMessage`
- **Params:** `chat_id`, `text`, `parse_mode=HTML`

### ЮKassa API
- **Base URL:** `https://api.yookassa.ru/v3/`
- **Auth:** Basic Auth (shopId:secretKey)
- **Endpoints:**
  - `POST /payments` — создание платежа
  - `POST /webhook` — установка webhook (не используем, ждём callback)

### Jitsi Meet
- **URL генерация:** `https://meet.jit.si/doctorguryanova-<bookingId>-<timestamp>`
- **No API key required**

### SMTP Yandex
- **Host:** smtp.yandex.ru
- **Port:** 465 (SSL)
- **Auth:** login + пароль приложения (не пароль от почты!)

---
*Последнее обновление: 28 июля 2026*
