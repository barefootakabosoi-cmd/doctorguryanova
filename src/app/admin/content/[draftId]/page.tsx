"use client"

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

export default function EditDraftPage() {
  const params = useParams();
  const draftId = params.draftId as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [keywords, setKeywords] = useState("");
  const [telegramPost, setTelegramPost] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch(`/api/content/draft?draftId=${draftId}`)
      .then(r => r.json())
      .then(data => {
        setTitle(data.post?.title || "");
        setExcerpt(data.post?.excerpt || "");
        setContent(data.post?.content || "");
        setKeywords(data.post?.keywords?.join(", ") || "");
        setTelegramPost(data.telegramPost || "");
        setLoading(false);
      })
      .catch(e => {
        setError("Ошибка загрузки черновика");
        setLoading(false);
      });
  }, [draftId]);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/content/draft?draftId=${draftId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post: { title, excerpt, content, keywords: keywords.split(",").map(k => k.trim()) },
          telegramPost,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSuccess("✓ Сохранено");
      setTimeout(() => setSuccess(""), 3000);
    } catch (e) {
      setError("Ошибка сохранения");
    }
    setSaving(false);
  };

  const handlePublish = async () => {
    setPublishing(true);
    setError("");
    try {
      const res = await fetch("/api/content/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftId,
          post: { title, excerpt, content, keywords: keywords.split(",").map(k => k.trim()) },
          telegramPost,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Publish failed");
      setSuccess("✓ Опубликовано на сайт + в Telegram-канал");
      setTimeout(() => window.location.href = "/blog", 2000);
    } catch (e: any) {
      setError(e.message);
    }
    setPublishing(false);
  };

  if (loading) return <div className="p-8">Загрузка...</div>;

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Редактирование статьи</h1>
      
      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded mb-4">{error}</div>}
      {success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded mb-4">{success}</div>}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Заголовок</label>
          <input value={title} onChange={e => setTitle(e.target.value)} className="w-full border rounded p-2 text-sm" />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Excerpt (описание)</label>
          <textarea value={excerpt} onChange={e => setExcerpt(e.target.value)} rows={2} className="w-full border rounded p-2 text-sm" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Ключевые слова (через запятую)</label>
          <input value={keywords} onChange={e => setKeywords(e.target.value)} className="w-full border rounded p-2 text-sm" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Содержание (HTML)</label>
          <textarea value={content} onChange={e => setContent(e.target.value)} rows={20} className="w-full border rounded p-2 text-sm font-mono" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Telegram-пост</label>
          <textarea value={telegramPost} onChange={e => setTelegramPost(e.target.value)} rows={6} className="w-full border rounded p-2 text-sm" />
        </div>

        <div className="flex gap-4 pt-4">
          <button onClick={handleSave} disabled={saving} className="bg-slate-200 text-slate-700 px-6 py-2 rounded font-medium hover:bg-slate-300 disabled:opacity-50">
            {saving ? "Сохранение..." : "Сохранить"}
          </button>
          <button onClick={handlePublish} disabled={publishing} className="bg-emerald-600 text-cream px-6 py-2 rounded font-medium hover:bg-emerald-700 disabled:opacity-50">
            {publishing ? "Публикация..." : "Опубликовать на сайт + в Telegram"}
          </button>
          <a href="/admin/content" className="px-6 py-2 text-charcoal/60 hover:text-charcoal">← Назад</a>
        </div>
      </div>
    </main>
  );
}
