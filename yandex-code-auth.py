#!/usr/bin/env python3
"""Токен API Яндекс.Метрики через authorization code flow.

Почему не response_type=token: Яндекс отдаёт ошибку 400 — имплицитный
поток для приложений отключён. Поэтому: получаем КОД в браузере,
обмениваем его на токен здесь же (oauth.yandex.ru доступен и через прокси).

Скрипт ничего не хранит: секрет и токен живут только в этом терминале.
"""
import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

TOKEN_URL = "https://oauth.yandex.ru/token"


def main() -> None:
    print("== Токен API Яндекс.Метрики (код -> обмен) ==\n")

    client_id = input("1) Client ID (страница приложения на oauth.yandex.ru): ").strip()
    client_secret = input("2) Client Secret (Настройки -> Секреты -> Подставить в код): ").strip()
    if not client_id or not client_secret:
        sys.exit("Нужны оба значения: ID и секрет.")

    redirect_uri = "http://localhost"
    auth_url = "https://oauth.yandex.ru/authorize?" + urllib.parse.urlencode(
        {
            "response_type": "code",
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "force_confirm": "yes",
        }
    )

    print(
        "\n3) Открой ссылку в браузере под аккаунтом, где Метрика:\n\n"
        f"{auth_url}\n\n"
        "4) Нажми «Разрешить». Браузер перейдёт на http://localhost/?code=...\n"
        "   Страница не загрузится — ТАК И НАДО. Скопируй адрес целиком\n"
        "   (или только сам код после code=) и вставь ниже.\n"
    )

    pasted = input("Адрес или код: ").strip()
    m = re.search(r"[?&]code=([^&\s]+)", pasted)
    code = m.group(1) if m else pasted.strip()
    if not code:
        sys.exit("Код не найден во введённой строке.")

    data = urllib.parse.urlencode(
        {
            "grant_type": "authorization_code",
            "code": code,
            "client_id": client_id,
            "client_secret": client_secret,
        }
    ).encode()
    req = urllib.request.Request(
        TOKEN_URL,
        data=data,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            payload = json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors="replace")[:300]
        sys.exit(f"\nЯндекс ответил {e.code}: {detail}\n"
                 "Чаще всего код одноразовый/устарел — просто запусти скрипт заново.")
    except Exception as e:  # сеть/прокси
        sys.exit(f"\nСеть: {e}\nПопробуй временно выключить прокси и повторить.")

    if "access_token" not in payload:
        sys.exit(f"\nОтвет без токена: {json.dumps(payload)[:300]}")

    print("\n=== ГОТОВО ===")
    print("access_token (в Vercel -> YANDEX_METRIKA_TOKEN):")
    print(payload["access_token"])
    if payload.get("refresh_token"):
        print("\nrefresh_token (сохрани на случай перевыпуска):")
        print(payload["refresh_token"])
    if payload.get("expires_in"):
        days = int(payload["expires_in"]) // 86400
        print(f"\nЖивёт ~{days} дн. Дальше просто повтори эти шаги.")
    print("\nОсталось: добавить YANDEX_METRIKA_TOKEN и YANDEX_METRIKA_COUNTER_ID=111827325")
    print("в Vercel -> Redeploy -> открыть /api/cron/semantic-digest с админ-логином.")


if __name__ == "__main__":
    main()
