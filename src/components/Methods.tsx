export default function Methods() {
  const methods = [
    { title: "Неврология", desc: "Диагностика и лечение заболеваний нервной системы: мигрени, остеохондроз, невралгии.", href: "/nevrologiya" },
    { title: "Рефлексотерапия", desc: "Иглоукалывание и точечный массаж для снятия боли и восстановления тонуса.", href: "/refleksoterapiya" },
    { title: "Гирудотерапия", desc: "Лечение медицинскими пиявками: улучшение кровообращения, снятие воспалений.", href: "/girudoterapiya" },
    { title: "Остеопатия", desc: "Мягкие мануальные техники для восстановления подвижности суставов и позвоночника.", href: "/osteopatiya" },
  ];

  return (
    <section className="max-w-6xl mx-auto px-6 py-16">
      <h2 className="text-3xl font-serif text-center mb-12 text-charcoal">Методы лечения</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {methods.map((m) => (
          <a 
            key={m.title} 
            href={m.href} 
            className="group p-6 bg-cream rounded-xl border border-gold/20 hover:border-gold hover:shadow-lg transition-all duration-300"
          >
            <h3 className="text-xl font-serif text-charcoal mb-3 group-hover:text-gold transition-colors">{m.title}</h3>
            <p className="text-sm text-charcoal/70">{m.desc}</p>
            <span className="inline-block mt-4 text-xs uppercase tracking-wider text-gold font-semibold">Подробнее →</span>
          </a>
        ))}
      </div>
    </section>
  );
}
