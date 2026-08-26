#!/usr/bin/env python3
"""Получение токена Яндекс.Метрики одним запуском.

  python3 yandex-token.py СЕКРЕТ

Сам откроет браузер, примет адрес после «Разрешить» и обменяет код.
Токен появится на экране и сохранится в ~/metrika_token.txt
"""
import json
import os
import re
import stat
import sys
import urllib.parse
import urllib.request
import webbrowser

CLIENT_ID = "a7f50f538d3c41f5b749b93734573fe4"
TOKEN_URL = "https://oauth.yandex.ru/token"
AUTH_URL = (
    "https://oauth.yandex.ru/authorize"
    f"?response_type=code&client_id={CLIENT_ID}&force_confirm=yes"
)
OUT_FILE = os.path.expanduser("~/metrika_token.txt")


def fail(msg):
    print(f"\n[ОШИБКА] {msg}")
    print("Просто запусти скрипт заново — он выдаст свежую ссылку.")
    sys.exit(1)


def extract_code(raw):
    raw = raw.strip()
    m = re.search(r"[?&#]code=([A-Za-z0-9_\-]+)", raw)
    if m:
        return m.group(1)
    if re.fullmatch(r"[A-Za-z0-9_\-]{10,}", raw):
        return raw
    fail(f"Не нашёл код в вставленном тексте: {raw[:120]!r}")


def main():
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(2)
    secret = sys.argv[1].strip()

    print("Открываю браузер для авторизации...")
    print(f"(если не открылся — открой вручную:\n{AUTH_URL})\n")
    webbrowser.open(AUTH_URL)

    print("После нажатия «Разрешить» браузер уйдёт на страницу,")
    print("которая НЕ ЗАГРУЗИТСЯ, — это нормально.")
    print("Скопируй ВЕСЬ адрес из адресной строки, вставь сюда и нажми Enter:")
    raw = input("\n> ")
    code = extract_code(raw)

    data = urllib.parse.urlencode({
        "grant_type": "authorization_code",
        "code": code,
        "client_id": CLIENT_ID,
        "client_secret": secret,
    }).encode()
    req = urllib.request.Request(
        TOKEN_URL, data=data,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            payload = json.loads(resp.read().decode())
    except Exception as e:
        body = b""
        try:
            body = e.read()
        except Exception:
            pass
        fail(f"Яндекс не выдал токен. {e}\n{body.decode(errors='replace')[:400]}")

    token = payload.get("access_token")
    if not token:
        fail(f"В ответе нет access_token: {str(payload)[:400]}")

    with open(OUT_FILE, "w") as f:
        f.write(token)
    os.chmod(OUT_FILE, stat.S_IRUSR | stat.S_IWUSR)

    print("\n================ ТОКЕН ПОЛУЧЕН ================")
    print(token)
    print("===============================================")
    print(f"\nТакже сохранён в {OUT_FILE} (доступ только у тебя).")
    print("Дальше:")
    print("  Vercel -> Environment Variables ->")
    print("    YANDEX_METRIKA_TOKEN      = этот токен")
    print("    YANDEX_METRIKA_COUNTER_ID = 111827325")
    print("  -> Redeploy -> открыть /api/cron/semantic-digest")


if __name__ == "__main__":
    main()
