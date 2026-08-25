import { Metadata } from "next";
import Link from "next/link";
import ServiceFaq from "@/components/ServiceFaq";

export const metadata: Metadata = {
  title: 'Рефлексотерапия (иглоукалывание)',
  description: 'Лечение иглоукалыванием online и offline. Рефлексотерапевт с 49-летним стажем. Снятие боли, лечение остеохондроза, мигрени. Запись на консультацию.',
  openGraph: {
    title: 'Рефлексотерапия (иглоукалывание)',
    description: 'Лечение иглоукалыванием online и offline. Рефлексотерапевт с 49-летним стажем. Снятие боли, лечение остеохондроза, мигрени. Запись на консультацию.',
  },
};

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <article className="prose prose-slate max-w-none">
        <h1 className="text-3xl font-bold text-charcoal mb-6">Рефлексотерапия (иглоукалывание)</h1>
        
        <div className="article-content" dangerouslySetInnerHTML={{ __html: '<p>Рефлексотерапия (акупунктура, иглоукалывание) — это древний и доказанный метод лечения, основанный на воздействии на биологически активные точки организма. Метод широко применяется в неврологии для снятия боли, восстановления нервной системы и улучшения кровообращения.</p><h2>При каких заболеваниях помогает рефлексотерапия</h2><ul><li><strong>Болевые синдромы:</strong> мигрень, головная боль напряжения, боли в спине и шее, невралгия тройничного нерва.</li><li><strong>Заболевания позвоночника:</strong> остеохондроз, грыжи дисков, радикулопатии.</li><li><strong>Неврологические нарушения:</strong> вегето-сосудистая дистония (ВСД), нарушения сна, панические атаки.</li></ul><h2>Онлайн-консультация по рефлексотерапии</h2><p>На онлайн-приёме врач определит показания к процедуре, составит индивидуальный план лечения и подберёт точки для воздействия. Врач также может обучить вас техникам точечного массажа (акупрессуры) для самостоятельного снятия боли.</p>' }} />

        <div className="mt-10 p-6 bg-gold/5 rounded-lg text-center">
          <h2 className="text-xl font-bold text-charcoal mb-2">Нужна консультация?</h2>
          <p className="text-charcoal/60 mb-4">Запишитесь на онлайн-приём к врачу с 49-летним стажем.</p>
          <Link href="/#booking" className="inline-block bg-teal-600 text-cream px-6 py-3 rounded-lg font-medium hover:bg-teal-700 transition-colors">
            Записаться на приём
          </Link>
        </div>

        <ServiceFaq serviceName="Рефлексотерапии" />
      </article>
    </main>
  );
}
