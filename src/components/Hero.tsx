export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-cream">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gold/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-charcoal/5 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <span className="inline-block text-xs uppercase tracking-[0.2em] text-gold font-semibold mb-6">
          Врач высшей категории · 49 лет практики
        </span>

        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif text-charcoal mb-6 leading-tight">
          Неврология и рефлексотерапия <br className="hidden md:block" /><span className="text-gold">без боли и таблеток</span>
        </h1>

        <p className="text-base sm:text-lg md:text-xl text-charcoal/60 max-w-2xl mx-auto mb-10 leading-relaxed">
          Онлайн-консультации опытного невролога. Индивидуальный подход к лечению мигреней, остеохондроза и сосудистых патологий.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a 
            href="/#booking" 
            className="bg-charcoal text-cream px-8 py-4 rounded-full text-base font-medium hover:bg-gold transition-all duration-300 shadow-lg w-full sm:w-auto"
          >
            Записаться на приём
          </a>
          <a 
            href="/blog" 
            className="border border-charcoal/20 text-charcoal px-8 py-4 rounded-full text-base font-medium hover:border-gold hover:text-gold transition-all duration-300 w-full sm:w-auto"
          >
            Читать блог
          </a>
        </div>
      </div>
    </section>
  );
}
