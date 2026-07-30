#!/usr/bin/env python3
# fix-admin-safe.py - bezopasno dobavlyaet adminku v src/app/admin/
# - layout.tsx bez <html>/<body>
# - page.tsx s pravilnym JSX
# - middleware.ts s atob() dlya Edge Runtime

import os
import subprocess
import sys

def run(cmd, check=True):
    print(f"$ {cmd}")
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.stdout:
        print(result.stdout, end="")
    if result.stderr:
        print(result.stderr, end="", file=sys.stderr)
    if check and result.returncode != 0:
        print(f"❌ Ошибка: код {result.returncode}")
        sys.exit(1)
    return result

def main():
    if not os.path.isdir(".git"):
        print("❌ Запускай из корня репозитория doctorguryanova")
        sys.exit(1)

    os.makedirs("src/app/admin/ai", exist_ok=True)

    layout = """import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Админка - Генератор контента",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-gray-50">{children}</div>;
}
"""
    with open("src/app/admin/layout.tsx", "w", encoding="utf-8") as f:
        f.write(layout)
    print("✅ src/app/admin/layout.tsx")

    page = """'use client';

import { useState, useEffect, useCallback } from 'react';

type Template = 'blog' | 'telegram' | 'seo';

type HistoryItem = {
  id: string;
  template: Template;
  topic: string;
  content: string;
  createdAt: string;
};

const TEMPLATE_LABELS: Record<Template, string> = {
  blog: '📝 Статья в блог',
  telegram: '📱 Пост в Telegram',
  seo: '🔍 SEO-описание',
};

export default function AiAdminPage() {
  const [template, setTemplate] = useState<Template>('blog');
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem('gigachat-history');
    if (raw) {
      try {
        setHistory(JSON.parse(raw));
      } catch {}
    }
  }, []);

  const saveToHistory = useCallback((item: HistoryItem) => {
    setHistory((prev) => {
      const next = [item, ...prev].slice(0, 50);
      localStorage.setItem('gigachat-history', JSON.stringify(next));
      return next;
    });
  }, []);

  const generate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setResult('');
    setCopied(false);

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), template }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка');

      setResult(data.content);

      saveToHistory({
        id: crypto.randomUUID(),
        template,
        topic: topic.trim(),
        content: data.content,
        createdAt: new Date().toISOString(),
      });
    } catch (err: any) {
      setResult(`❌ Ошибка: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!result || result.startsWith('❌')) return;
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadMd = () => {
    if (!result || result.startsWith('❌')) return;
    const blob = new Blob([result], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toISOString().slice(0, 10);
    a.download = `${template}-${date}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const deleteHistoryItem = (id: string) => {
    setHistory((prev) => {
      const next = prev.filter((h) => h.id !== id);
      localStorage.setItem('gigachat-history', JSON.stringify(next));
      return next;
    });
  };

  const loadFromHistory = (item: HistoryItem) => {
    setTemplate(item.template);
    setTopic(item.topic);
    setResult(item.content);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearHistory = () => {
    if (!confirm('Очистить всю историю?')) return;
    setHistory([]);
    localStorage.removeItem('gigachat-history');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">🤖 Генератор контента</h1>

        <div className="flex gap-2 flex-wrap">
          {(Object.keys(TEMPLATE_LABELS) as Template[]).map((t) => (
            <button
              key={t}
              onClick={() => setTemplate(t)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                template === t
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-white text-gray-700 border hover:bg-gray-100'
              }`}
            >
              {TEMPLATE_LABELS[t]}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow p-4 space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Тема или запрос
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && generate()}
            placeholder={
              template === 'blog'
                ? 'Например: Мигрень и магний'
                : template === 'telegram'
                ? 'Например: 5 признаков, что пора к неврологу'
                : 'Например: Консультация невролога с ЭЭГ'
            }
            className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
          <button
            onClick={generate}
            disabled={loading || !topic.trim()}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? '⏳ Генерация...' : 'Сгенерировать'}
          </button>
        </div>

        {result && (
          <div className="bg-white rounded-xl shadow p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">
                {TEMPLATE_LABELS[template]} — {new Date().toLocaleString('ru-RU')}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={copyToClipboard}
                  className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50 transition"
                >
                  {copied ? '✅ Скопировано!' : '📋 Копировать'}
                </button>
                <button
                  onClick={downloadMd}
                  className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50 transition"
                >
                  ⬇️ Скачать .md
                </button>
              </div>
            </div>
            <div className="prose max-w-none bg-gray-50 rounded-lg p-4 overflow-auto max-h-[600px]">
              <pre className="whitespace-pre-wrap font-sans text-gray-800 text-sm leading-relaxed">
                {result}
              </pre>
            </div>
          </div>
        )}

        {history.length > 0 && (
          <div className="bg-white rounded-xl shadow p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">📚 История ({history.length})</h2>
              <button
                onClick={clearHistory}
                className="text-sm text-red-600 hover:underline"
              >
                Очистить всё
              </button>
            </div>
            <div className="space-y-2 max-h-96 overflow-auto">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => loadFromHistory(item)}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                        {item.template}
                      </span>
                      <span className="text-gray-500">
                        {new Date(item.createdAt).toLocaleDateString('ru-RU')}
                      </span>
                    </div>
                    <p className="text-gray-900 font-medium truncate mt-1">
                      {item.topic}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteHistoryItem(item.id);
                    }}
                    className="text-gray-400 hover:text-red-600 px-2"
                    title="Удалить"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
"""
    with open("src/app/admin/ai/page.tsx", "w", encoding="utf-8") as f:
        f.write(page)
    print("✅ src/app/admin/ai/page.tsx")

    middleware = """import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/admin')) {
    const auth = req.headers.get('authorization');

    if (!auth) {
      return new NextResponse('Authentication required', {
        status: 401,
        headers: { 'WWW-Authenticate': 'Basic realm="Admin"' },
      });
    }

    const [scheme, encoded] = auth.split(' ');
    if (scheme !== 'Basic' || !encoded) {
      return new NextResponse('Invalid auth', { status: 401 });
    }

    const decoded = atob(encoded);
    const [user, pass] = decoded.split(':');

    const adminUser = process.env.ADMIN_USER || 'admin';
    const adminPass = process.env.ADMIN_PASS || 'changeme';

    if (user !== adminUser || pass !== adminPass) {
      return new NextResponse('Invalid credentials', { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
"""
    with open("src/middleware.ts", "w", encoding="utf-8") as f:
        f.write(middleware)
    print("✅ src/middleware.ts (atob dlya Edge Runtime)")

    run("git add -A")
    run('git commit -m "fix(admin): safe admin layout + page + middleware with atob"')
    run("git push origin main")

    print("\n🚀 Gotovo! Teper zaydi v Vercel Dashboard → Redeploy (snimi galochku Use existing Build Cache)")
    print("\n⚠️  Prover snachala glavnuyu stranitsu doctorguryanova.ru - ona dolzhna rabotat.")
    print("   Potom prover /admin/ai (login: admin / changeme)")

if __name__ == "__main__":
    main()
