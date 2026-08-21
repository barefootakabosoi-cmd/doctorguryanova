export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Декоративный фоновый градиент */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#C5A059]/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#1A1A1A]/5 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-4xl mx-auto px-6 pt-24 pb-16 text-center">
        <span className="inline-block text-xs uppercase tracking-[0.2em] text-[#C5A059] font-semibold mb-6">
          Врач высшей категории · 49 лет практики
        </span>
        
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif text-[#1A1A1A] mb-6 leading-tight">
          Неврология и рефлексотерапия<br/>
          <span className="text-[#C5A059]">без боли и таблеток</span>
        </h1>

        <p className="text-lg md:text-xl text-[#4A4A4A] max-w-2xl mx-auto mb-10 leading-relaxed">
          Онлайн-консультации опытного невролога. Индивидуальный подход к лечению мигреней, остеохондроза и сосудистых патологий.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a 
            href="/#booking" 
            className="bg-[#1A1A1A] text-[#FAF9F6] px-8 py-4 rounded-full text-base font-medium hover:bg-[#C5A059] transition-all duration-300 shadow-lg w-full sm:w-auto"
          >
            Записаться на приём
          </a>
          <a 
            href="/blog" 
            className="border border-[#1A1A1A]/20 text-[#1A1A1A] px-8 py-4 rounded-full text-base font-medium hover:border-[#C5A059] hover:text-[#C5A059] transition-all duration-300 w-full sm:w-auto"
          >
            Читать блог
          </a>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-3 gap-8 mt-20 max-w-2xl mx-auto pt-10 border-t border-[#1A1A1A]/10">
          <div>
            <div className="text-3xl font-serif text-[#C5A059] mb-1">49</div>
            <div className="text-xs text-[#4A4A4A] uppercase tracking-wider">Лет опыта</div>
          </div>
          <div>
            <div className="text-3xl font-serif text-[#C5A059] mb-1">1-й МГМУ</div>
            <div className="text-xs text-[#4A4A4A] uppercase tracking-wider">Им. Сеченова</div>
          </div>
          <div>
            <div className="text-3xl font-serif text-[#C5A059] mb-1">Online</div>
            <div className="text-xs text-[#4A4A4A] uppercase tracking-wider">Приём</div>
          </div>
        </div>
      </div>
    </section>
  );
}
