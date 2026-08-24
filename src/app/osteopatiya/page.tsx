import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: 'Остеопатия',
  description: 'Консультация остеопата онлайн. Лечение болей в спине, шее, суставах мягкими техниками. Опытный врач-невролог, остеопат. Запись на консультацию.',
  openGraph: {
    title: 'Остеопатия',
    description: 'Консультация остеопата онлайн. Лечение болей в спине, шее, суставах мягкими техниками. Опытный врач-невролог, остеопат. Запись на консультацию.',
  },
};

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <article className="prose prose-slate max-w-none">
        <h1 className="text-3xl font-bold text-charcoal mb-6">Остеопатия</h1>
        
        <div className="article-content" dangerouslySetInnerHTML={{ __html: '<p>Остеопатия — это целостный подход к диагностике и лечению нарушений в организме через работу с мышечно-скелетной системой. Врач-остеопат ищет первопричину боли, а не просто снимает симптомы.</p><h2>Что лечит остеопат</h2><ul><li>Боли в позвоночнике (остеохондроз, грыжи, протрузии).</li><li>Головные боли, мигрени, головокружения.</li><li>Ограничение подвижности суставов, скованность.</li><li>Вегетативные дисфункции (ВСД, панические атаки).</li></ul><h2>Как проходит онлайн-консультация</h2><p>Во время видеоприёма врач проводит сбор анамнеза и функциональный тест. Вы сможете показать, как двигаетесь, где чувствуете дискомфорт. Врач оценит вашу осанку, асимметрию тела и назначит план лечения.</p>' }} />

        <div className="mt-10 p-6 bg-gold/5 rounded-lg text-center">
          <h2 className="text-xl font-bold text-charcoal mb-2">Нужна консультация?</h2>
          <p className="text-charcoal/60 mb-4">Запишитесь на онлайн-приём к врачу с 49-летним стажем.</p>
          <Link href="/#booking" className="inline-block bg-teal-600 text-cream px-6 py-3 rounded-lg font-medium hover:bg-teal-700 transition-colors">
            Записаться на приём
          </Link>
        </div>
      </article>
    </main>
  );
}
