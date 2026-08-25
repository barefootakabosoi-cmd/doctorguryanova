#!/usr/bin/env python3
"""Проверка пары Client ID + Client Secret БЕЗ кода авторизации.

Шлёт заведомо фейковый код в /token и смотрит на ответ Яндекса:
- invalid_client («Wrong client secret») -> пара НЕВЕРНАЯ
- любой другой 400 (bad_code/invalid_grant) -> пара ВЕРНАЯ

Запуск: python3 yandex-check-creds.py <CLIENT_ID> <CLIENT_SECRET>
"""
import json
import sys
import urllib.error
import urllib.parse
import urllib.request


def main() -> None:
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    cid, sec = sys.argv[1].strip(), sys.argv[2].strip()
    data = urllib.parse.urlencode({
        "grant_type": "authorization_code", "code": "00000000-test",
        "client_id": cid, "client_secret": sec,
    }).encode()
    req = urllib.request.Request(
        "https://oauth.yandex.ru/token", data=data,
        headers={"Content-Type": "application/x-www-form-urlencoded"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            print(f"HTTP {r.code}: {r.read().decode()[:200]}")
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="replace")
        err = ""
        try:
            err = json.loads(body).get("error", "")
        except Exception:
            pass
        print(f"Яндекс: HTTP {e.code}: {body[:200]}")
        if e.code == 400 and err == "invalid_client":
            print("\n[FAIL] Пара неверная: секрет НЕ от этого Client ID.")
            print("  - ID и секрет должны быть из ОДНОГО приложения")
            print("  - oauth.yandex.ru -> Мои приложения -> открой приложение с этим ID")
            print("  - там же создай НОВЫЙ секрет (показывается один раз) и повтори")
        elif e.code == 400:
            print("\n[OK] ПАРА ВЕРНАЯ! Яндекс жалуется только на тестовый код — так и должно быть.")
            print("  Дальше: получи свежий код по ссылке authorize и СРАЗУ выполни finish.")
        else:
            print("\n[?] Неожиданный ответ — пришли его целиком.")


if __name__ == "__main__":
    main()
