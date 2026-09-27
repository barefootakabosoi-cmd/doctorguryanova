#!/usr/bin/env python3
"""Токен Метрики без ручного копирования.

ОДИН раз добавь в приложении oauth.yandex.ru (раздел «Платформы» →
«Веб-сервисы» → Redirect URI) адрес:  http://localhost:8765

Затем запусти:
    python3 yandex-catch.py СЕКРЕТ

Скрипт сам откроет браузер, сам поймает код после «Разрешить»,
сам обменяет его на токен и сохранит в ~/metrika_token.txt
"""
import json
import os
import stat
import sys
import threading
import urllib.parse
import urllib.request
import webbrowser
from http.server import BaseHTTPRequestHandler, HTTPServer

CLIENT_ID = "a7f50f538d3c41f5b749b93734573fe4"
REDIRECT = "http://localhost:8765"
TOKEN_URL = "https://oauth.yandex.ru/token"
OUT_FILE = os.path.expanduser("~/metrika_token.txt")

result = {"token": None, "error": None}


class Catcher(BaseHTTPRequestHandler):
    def do_GET(self):
        q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        code = (q.get("code") or [None])[0]
        err = (q.get("error") or [None])[0]
        try:
            if not code:
                if not err:
                    self._reply("<h2>Перехватчик жив. Нажми «Разрешить» на странице Яндекса.</h2>")
                    return
                result["error"] = f"Яндекс вернул ошибку вместо кода: {err}"
                self._reply("<h2>Код не получен :( Смотри терминал.</h2>")
                return
            data = urllib.parse.urlencode({
                "grant_type": "authorization_code",
                "code": code,
                "client_id": CLIENT_ID,
                "client_secret": SECRET,
                "redirect_uri": REDIRECT,
            }).encode()
            req = urllib.request.Request(
                TOKEN_URL, data=data,
                headers={"Content-Type": "application/x-www-form-urlencoded"})
            with urllib.request.urlopen(req, timeout=30) as r:
                payload = json.loads(r.read().decode())
            tok = payload.get("access_token")
            if tok:
                result["token"] = tok
                self._reply("<h2>✅ Токен получен! Можно закрыть вкладку.</h2>")
            else:
                result["error"] = f"Ответ без access_token: {payload}"
                self._reply("<h2>Обмен не удался, смотри терминал.</h2>")
        except Exception as e:  # noqa: BLE001
            body = b""
            try:
                body = e.read()
            except Exception:
                pass
            result["error"] = f"{e} {body.decode(errors='replace')[:300]}"
            self._reply("<h2>Ошибка обмена, смотри терминал.</h2>")

    def _reply(self, html):
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        self.wfile.write(html.encode())

    def log_message(self, *a):  # тишина в консоли
        pass


def main():
    global SECRET
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(2)
    SECRET = sys.argv[1].strip()

    srv = HTTPServer(("127.0.0.1", 8765), Catcher)
    t = threading.Thread(target=srv.serve_forever, daemon=True)
    t.start()

    url = ("https://oauth.yandex.ru/authorize?response_type=code"
           f"&client_id={CLIENT_ID}&redirect_uri={urllib.parse.quote(REDIRECT)}"
           "&force_confirm=yes")
    print("Открываю браузер... (если не открылся, открой вручную):\n" + url)
    webbrowser.open(url)
    print("\nЖму «Разрешить» на странице Яндекса. Дальше всё произойдёт само.\n", flush=True)

    while not (result["token"] or result["error"]):
        threading.Event().wait(1)

    srv.shutdown()
    if result["error"]:
        print(f"[ОШИБКА] {result['error']}")
        sys.exit(1)

    with open(OUT_FILE, "w") as f:
        f.write(result["token"])
    os.chmod(OUT_FILE, stat.S_IRUSR | stat.S_IWUSR)
    print("================ ТОКЕН ПОЛУЧЕН ================")
    print(result["token"])
    print("===============================================")
    print(f"\nСохранён в {OUT_FILE}. Дальше:")
    print("  Vercel -> Environment Variables:")
    print("    YANDEX_METRIKA_TOKEN      = этот токен")
    print("    YANDEX_METRIKA_COUNTER_ID = 111827325")
    print("  -> Redeploy -> /api/cron/semantic-digest")


if __name__ == "__main__":
    main()
