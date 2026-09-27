
type QA = { q: string; a: string };

const BASE_QA: QA[] = [
  {
    q: "Как записаться на приём?",
    a: "Выберите дату и время в форме записи на главной странице, укажите имя, телефон и email. После оплаты вы получите подтверждение на почту со ссылкой на видеовстречу (для онлайн-приёма).",
  },
  {
    q: "Как проходит онлайн-консультация?",
    a: "В назначенное время вы переходите по ссылке из письма — видеовстреча проходит в браузере, без установки программ. Врач беседует с вами, уточняет жалобы и анамнез, составляет план лечения.",
  },
  {
    q: "Нужны ли документы или результаты обследований?",
    a: "Если у вас есть заключения, снимки или результаты анализов — подготовьте их к консультации: это поможет врачу точнее оценить ситуацию. Специальная подготовка не требуется.",
  },
  {
    q: "Можно ли перенести запись?",
    a: "Да, напишите в Telegram-чат клиники или ответьте на письмо с подтверждением — мы подберём другое время.",
  },
];

export default function ServiceFaq({ serviceName }: { serviceName: string }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: BASE_QA.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <section className="mt-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <h2 className="text-2xl font-bold text-charcoal mb-6">
        Частые вопросы — {serviceName}
      </h2>
      <div className="space-y-4">
        {BASE_QA.map((item) => (
          <details
            key={item.q}
            className="group border border-slate-200 rounded-lg p-4 open:bg-slate-50"
          >
            <summary className="font-medium text-charcoal cursor-pointer list-none flex justify-between items-center">
              {item.q}
              <span className="text-charcoal/40 group-open:rotate-45 transition-transform text-xl leading-none">
                +
              </span>
            </summary>
            <p className="mt-3 text-charcoal/70">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
