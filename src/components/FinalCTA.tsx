export default function FinalCTA() {
  return (
    <section className="bg-charcoal py-20">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <h2 className="text-3xl md:text-4xl font-serif text-cream mb-6">
          Готовы разобраться в вашем здоровье?
        </h2>
        <p className="text-cream/70 mb-10 leading-relaxed text-lg">
          Если вы хотите разобрать симптомы, результаты МРТ или получить второе мнение — запишитесь на онлайн-консультацию.
        </p>
        <a 
          href="/#booking" 
          className="inline-block bg-gold text-charcoal px-10 py-4 rounded-full text-base font-medium hover:bg-cream transition-all duration-300 shadow-lg"
        >
          Записаться на консультацию
        </a>
      </div>
    </section>
  );
}
