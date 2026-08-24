import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: 'Мануальная терапия',
  description: 'Консультация мануального терапевта онлайн. Снятие острых болей в спине и шее. Безопасные техники, врач с 49-летним стажем. Запись на видеоприём.',
  openGraph: {
    title: 'Мануальная терапия',
    description: 'Консультация мануального терапевта онлайн. Снятие острых болей в спине и шее. Безопасные техники, врач с 49-летним стажем. Запись на видеоприём.',
  },
};

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <article className="prose prose-slate max-w-none">
        <h1 className="text-3xl font-bold text-charcoal mb-6">Мануальная терапия</h1>
        
        <div className="article-content" dangerouslySetInnerHTML={{ __html: '<p>Мануальная терапия — это метод лечения заболеваний опорно-двигательного аппарата с помощью рук врача. Применяется для восстановления подвижности суставов, снятия мышечных блоков и устранения острых болевых синдромов.</p><h2>Когда необходима мануальная терапия</h2><ul><li>Острая боль в пояснице (люмбаго, ишиас).</li><li>Боли в шее, отдающие в руку (цервикалгия).</li><li>Защемление седалищного нерва.</li><li>Мышечные спазмы, ограничение движений.</li></ul><h2>Лечение онлайн</h2><p>В условиях удалённого приёма врач снимет диагноз, назначит медикаментозную поддержку и покажет техники постизометрической релаксации (ПИР) — специальные мягкие движения, которые вы сделаете сами под руководством врача, чтобы снять спазм прямо во время звонка.</p>' }} />

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
