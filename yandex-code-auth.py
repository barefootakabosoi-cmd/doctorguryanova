#!/usr/bin/env python3
"""Токен API Яндекс.Метрики, authorization code flow, БЕЗ интерактива.

Использование (два шага):

  Шаг 1 — получить ссылку авторизации:
    python3 yandex-code-auth.py start <CLIENT_ID> <CLIENT_SECRET>

  Шаг 2 — обменять код из редиректа на токен:
    python3 yandex-code-auth.py finish <CLIENT_ID> <CLIENT_SECRET> '<URL_или_КОД>'

    В шаге 2 вставь весь адрес вида http://localhost/?code=y0_xxx...
    (в кавычках, т.к. в нём есть ? и &).
"""
import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

TOKEN_URL = "https://oauth.yandex.ru/token"


def exchange(client_id: str, client_secret: str, code: str) -> None:
    data = urllib.parse.urlencode({
        "grant_type": "authorization_code",
        "code": code,
        "client_id": client_id,
        "client_secret": client_secret,
    }).encode()
    req = urllib.request.Request(
        TOKEN_URL, data=data,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            payload = json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors="replace")[:300]
        sys.exit(f"Яндекс ответил {e.code}: {detail}\n"
                 "Если 'bad_code'/'code has expired' — код одноразовый: "
                 "получи новый через 'start' и повтори 'finish'.")
    except Exception as e:
        sys.exit(f"Сеть/прокси: {e}")

    if "access_token" not in payload:
        sys.exit(f"Ответ без токена: {json.dumps(payload)[:300]}")

    print("\n=== ГОТОВО ===")
    print("access_token -> в Vercel как YANDEX_METRIKA_TOKEN:")
    print(payload["access_token"])
    if payload.get("refresh_token"):
        print("\nrefresh_token (сохрани на случай перевыпуска):")
        print(payload["refresh_token"])
    if payload.get("expires_in"):
        print(f"\nЖивёт ~{int(payload['expires_in']) // 86400} дн.")
    print("\nДальше: Vercel -> YANDEX_METRIKA_TOKEN + YANDEX_METRIKA_COUNTER_ID"
          "=111827325 -> Redeploy -> /api/cron/semantic-digest")


def main() -> None:
    args = sys.argv[1:]
    if len(args) >= 2 and args[0] == "start":
        _, client_id, client_secret = args[0], args[1], args[2] if len(args) > 2 else ""
        if not client_secret:
            sys.exit("Использование: start <CLIENT_ID> <CLIENT_SECRET>")
        url = "https://oauth.yandex.ru/authorize?" + urllib.parse.urlencode({
            "response_type": "code",
            "client_id": client_id,
            "redirect_uri": "http://localhost",
            "force_confirm": "yes",
        })
        print("\nОткрой в браузере под аккаунтом с Метрикой:\n")
        print(url)
        print("\nПосле «Разрешить» браузер уйдёт на http://localhost/?code=...\n"
              "Страница НЕ загрузится — так и надо. Скопируй адрес целиком.\n\n"
              "Затем выполни:\n"
              f"  python3 yandex-code-auth.py finish {client_id} <SECRET> '<АДРЕС>'")
        return

    if len(args) >= 2 and args[0] == "finish":
        _, client_id, client_secret, target = args[0], args[1], args[2], args[3]
        m = re.search(r"[?&]code=([^&\s]+)", target)
        code = m.group(1) if m else target.strip()
        if not code or code.startswith("http"):
            sys.exit("Не нашёл код. Нужен адрес http://localhost/?code=... или сам код.")
        exchange(client_id, client_secret, code)
        return

    sys.exit(__doc__)


if __name__ == "__main__":
    main()
