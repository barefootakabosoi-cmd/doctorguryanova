export default function About() {
  return (
    <section id="about" className="max-w-6xl mx-auto px-6 py-16">
      <div className="bg-white rounded-2xl border border-charcoal/10 p-8 md:p-12 shadow-sm grid md:grid-cols-3 gap-8 items-center">
        <div className="md:col-span-1 flex justify-center">
          <img 
            src="/images/doctor-about.jpg" 
            alt="Гурьянова В.А." 
            className="rounded-xl shadow-lg w-full max-w-xs object-cover aspect-[3/4] border-2 border-gold/20"
          />
        </div>
        <div className="md:col-span-2">
          <h2 className="text-3xl font-serif text-charcoal mb-4">О враче</h2>
          <p className="text-charcoal/80 mb-4 leading-relaxed">
            <strong>Гурьянова Валентина Андреевна</strong> — врач-невролог высшей категории, рефлексотерапевт, гирудотерапевт. 
            Окончила 1-й МГМУ им. И.М. Сеченова в 1977 году. Стаж клинической практики — 49 лет.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
            <div className="flex items-center gap-3 bg-cream p-3 rounded-lg border border-gold/10">
              <span className="text-gold text-xl">●</span> 
              <span className="text-charcoal/80 text-sm font-medium">Врач высшей категории</span>
            </div>
            <div className="flex items-center gap-3 bg-cream p-3 rounded-lg border border-gold/10">
              <span className="text-gold text-xl">●</span> 
              <span className="text-charcoal/80 text-sm font-medium">49 лет клинической практики</span>
            </div>
            <div className="flex items-center gap-3 bg-cream p-3 rounded-lg border border-gold/10">
              <span className="text-gold text-xl">●</span> 
              <span className="text-charcoal/80 text-sm font-medium">Онлайн-приём и расшифровка МРТ</span>
            </div>
            <div className="flex items-center gap-3 bg-cream p-3 rounded-lg border border-gold/10">
              <span className="text-gold text-xl">●</span> 
              <span className="text-charcoal/80 text-sm font-medium">1-й МГМУ им. И.М. Сеченова</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
