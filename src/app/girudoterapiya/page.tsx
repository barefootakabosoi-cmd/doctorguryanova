import { Metadata } from "next";
import Link from "next/link";
import ServiceFaq from "@/components/ServiceFaq";

export const metadata: Metadata = {
  title: 'Гирудотерапия (лечение пиявками)',
  description: 'Гирудотерапия онлайн: консультация по лечению пиявками. Показания, противопоказания, схема сеансов. Опытный гирудотерапевт. Запись на приём.',
  openGraph: {
    title: 'Гирудотерапия (лечение пиявками)',
    description: 'Гирудотерапия онлайн: консультация по лечению пиявками. Показания, противопоказания, схема сеансов. Опытный гирудотерапевт. Запись на приём.',
  },
};

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <article className="prose prose-slate max-w-none">
        <h1 className="text-3xl font-bold text-charcoal mb-6">Гирудотерапия (лечение пиявками)</h1>
        
        <div className="article-content" dangerouslySetInnerHTML={{ __html: '<p>Гирудотерапия — это метод лечения с использованием медицинских пиявок. Слюна пиявки содержит более 100 биологически активных веществ, которые оказывают противовоспалительное, противоотёчное и иммуномодулирующее действие.</p><h2>Показания к гирудотерапии</h2><ul><li><strong>Сосудистые патологии:</strong> варикозное расширение вен, тромбофлебит.</li><li><strong>Неврология:</strong> мигрень, последствия инсульта, невралгии.</li><li><strong>Суставы:</strong> артрозы, артриты, остеохондроз.</li></ul><h2>Преимущества онлайн-консультации</h2><p>Постановка пиявок — это медицинская процедура, требующая очного визита. Однако онлайн-консультация гирудотерапевта важна для оценки показаний, исключения противопоказаний и составления схемы лечения, с которым вы пойдёте к специалисту в своём городе.</p>' }} />

        <div className="mt-10 p-6 bg-gold/5 rounded-lg text-center">
          <h2 className="text-xl font-bold text-charcoal mb-2">Нужна консультация?</h2>
          <p className="text-charcoal/60 mb-4">Запишитесь на онлайн-приём к врачу с 49-летним стажем.</p>
          <Link href="/#booking" className="inline-block bg-teal-600 text-cream px-6 py-3 rounded-lg font-medium hover:bg-teal-700 transition-colors">
            Записаться на приём
          </Link>
        </div>

        <ServiceFaq serviceName="Гирудотерапии" />
      </article>
    </main>
  );
}
