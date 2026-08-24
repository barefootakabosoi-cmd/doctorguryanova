export default function About() {
  return (
    <section id="about" className="max-w-4xl mx-auto px-6 py-16">
      <div className="bg-white rounded-2xl border border-charcoal/10 p-8 md:p-12 shadow-sm">
        <h2 className="text-3xl font-serif text-charcoal mb-6">О враче</h2>
        <p className="text-charcoal/70 mb-4 leading-relaxed">
          <strong>Гурьянова Валентина Андреевна</strong> — врач-невролог высшей категории, рефлексотерапевт, гирудотерапевт. 
          Стаж клинической практики — 49 лет. Выпускница 1-го МГМУ им. И.М. Сеченова (1977 г.).
        </p>
        <div className="flex flex-col gap-3 mt-6 text-charcoal/80">
          <div className="flex items-center gap-3">
            <span className="text-gold text-xl">●</span> 
            <span>Принимает онлайн (видеосвязь Jitsi)</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-gold text-xl">●</span>
            <span>Выезд на дом по Москве (по запросу)</span>
          </div>
        </div>
      </div>
    </section>
  );
}
