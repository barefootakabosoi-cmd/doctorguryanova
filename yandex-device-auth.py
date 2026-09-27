import urllib.request, urllib.parse, json, os, time, sys

# ID приложения из oauth.yandex.ru (кнопка "ID приложения" на странице приложения)
# Запуск: YANDEX_CLIENT_ID=<id> python3 yandex-device-auth.py
CLIENT_ID = os.environ.get("YANDEX_CLIENT_ID", "")
if not CLIENT_ID:
    sys.exit("Ошибка: задай ID приложения. Пример:\n  YANDEX_CLIENT_ID=abc123... python3 yandex-device-auth.py\nСоздать приложение: https://oauth.yandex.ru -> \"Создать приложение\" -> платформа \"Веб-сервисы\", доступ Метрика -> Получение статистики")
SCOPE = "metrika:read"

def request_device_code():
    data = urllib.parse.urlencode({"client_id": CLIENT_ID, "scope": SCOPE}).encode()
    req = urllib.request.Request("https://oauth.yandex.ru/device/code", data=data, headers={"Content-Type": "application/x-www-form-urlencoded"}, method="POST")
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode())

def poll_for_token(device_code, interval=5, expires_in=600):
    data = urllib.parse.urlencode({"grant_type": "urn:ietf:params:oauth:grant-type:device_code", "device_code": device_code, "client_id": CLIENT_ID}).encode()
    req = urllib.request.Request("https://oauth.yandex.ru/token", data=data, headers={"Content-Type": "application/x-www-form-urlencoded"}, method="POST")
    start = time.time()
    while time.time() - start < expires_in:
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                return json.loads(resp.read().decode())
        except urllib.error.HTTPError as e:
            body = json.loads(e.read().decode())
            err = body.get("error", "")
            if err == "authorization_pending":
                print(f"⏳ Ждём подтверждения... {int(time.time()-start)} сек")
                time.sleep(interval)
                continue
            elif err == "slow_down":
                time.sleep(interval + 5)
                continue
            elif err == "expired_token":
                print("❌ Код истёк. Запусти заново.")
                sys.exit(1)
            elif err == "access_denied":
                print("❌ Доступ отклонён.")
                sys.exit(1)
            else:
                print(f"❌ Ошибка: {body}")
                sys.exit(1)
    print("❌ Таймаут.")
    sys.exit(1)

def save_token(token):
    path = os.path.join(os.getcwd(), ".env.local")
    lines = []
    if os.path.exists(path):
        with open(path, "r") as f:
            lines = f.readlines()
    lines = [l for l in lines if not l.startswith("YANDEX_METRIKA_TOKEN=")]
    lines.append(f"YANDEX_METRIKA_TOKEN={token}\n")
    with open(path, "w") as f:
        f.writelines(lines)
    print(f"\n✅ Токен сохранён в .env.local: {token[:20]}...")

def main():
    print("🚀 Запрашиваем код подтверждения...\n")
    d = request_device_code()
    print("=" * 55)
    print(f"📱 Открой: {d.get('verification_url', 'https://ya.ru/device')}")
    print(f"⌨️  Введи: {d['user_code']}")
    print("=" * 55)
    print(f"⏳ Ждём {d.get('expires_in', 600) // 60} минут...\n")
    t = poll_for_token(d["device_code"], d.get("interval", 5), d.get("expires_in", 600))
    print("\n🎉 Токен получен!")
    save_token(t["access_token"])
    print("\n📋 Добавь в Vercel Dashboard → Environment Variables:")
    print("   YANDEX_METRIKA_TOKEN = (скопируй из .env.local)")
    print("   YANDEX_METRIKA_COUNTER_ID = 111827325")

if __name__ == "__main__":
    main()
