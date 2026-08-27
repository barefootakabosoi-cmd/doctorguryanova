export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-cream">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gold/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-charcoal/5 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-6xl mx-auto px-6 pt-20 pb-12">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="text-center md:text-left">
            <span className="block text-sm font-medium text-gold uppercase tracking-wider mb-4">
              Валентина Андреевна Гурьянова
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-charcoal mb-6 leading-tight">
              Онлайн-консультация <span className="text-gold">невролога</span>
            </h1>
            <p className="text-lg text-charcoal/60 max-w-xl mx-auto md:mx-0 mb-10 leading-relaxed">
              Разбор симптомов, результатов обследований и медицинских заключений. Помощь в выборе дальнейшей тактики.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <a 
                href="/#booking" 
                className="bg-charcoal text-cream px-8 py-4 rounded-full text-base font-medium hover:bg-gold transition-all duration-300 shadow-lg"
              >
                Записаться на консультацию
              </a>
              <a 
                href="#about" 
                className="border border-charcoal/20 text-charcoal px-8 py-4 rounded-full text-base font-medium hover:border-gold hover:text-gold transition-all duration-300"
              >
                Узнать о враче
              </a>
            </div>
          </div>

          <div className="relative flex justify-center md:justify-end">
            <div className="absolute inset-0 bg-gold/20 rounded-full blur-3xl transform translate-x-4 translate-y-4"></div>
            <img 
              src="/images/doctor-hero.jpg" 
              alt="Гурьянова Валентина Андреевна - невролог" 
              className="relative rounded-2xl shadow-2xl object-cover h-[450px] md:h-[550px] w-full max-w-md border-4 border-white"
            />
          </div>
        </div>

        {/* Блок доказательств (под первым экраном) */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 border-t border-charcoal/10 pt-10">
          <div className="text-center">
            <div className="text-3xl font-serif text-gold mb-1">49 лет</div>
            <div className="text-sm text-charcoal/60">клинической практики</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-serif text-gold mb-1">Высшая категория</div>
            <div className="text-sm text-charcoal/60">подтверждённый статус</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-serif text-gold mb-1">1-й МГМУ</div>
            <div className="text-sm text-charcoal/60">им. И. М. Сеченова</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-serif text-gold mb-1">Онлайн</div>
            <div className="text-sm text-charcoal/60">из любой точки мира</div>
          </div>
        </div>
      </div>
    </section>
  );
}
