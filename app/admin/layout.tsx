import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Админка — Генератор контента",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className="bg-white text-gray-900">{children}</body>
    </html>
  );
}
