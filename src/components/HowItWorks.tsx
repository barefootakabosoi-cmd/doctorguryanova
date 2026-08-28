const steps = [
  { num: "01", title: "Выбор времени", text: "Вы выбираете удобную дату и время для онлайн-встречи прямо на сайте." },
  { num: "02", title: "Оплата и данные", text: "Заполняете краткую форму с симптомами и оплачиваете консультацию." },
  { num: "03", title: "Ссылка на встречу", text: "После оплаты вы получаете ссылку на видеоконсультацию в Jitsi Meet." },
  { num: "04", title: "Консультация", text: "На встрече разбираем симптомы, результаты МРТ/КТ и составляем план действий." },
];

export default function HowItWorks() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-16">
      <h2 className="text-3xl font-serif text-center mb-12 text-charcoal">Как проходит онлайн-приём</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {steps.map((step) => (
          <div key={step.num} className="text-center">
            <div className="text-4xl font-serif text-gold/30 mb-2">{step.num}</div>
            <h3 className="text-lg font-medium text-charcoal mb-2">{step.title}</h3>
            <p className="text-sm text-charcoal/60 leading-relaxed">{step.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
