const reviews = [
  { name: "Анна М.", text: "Валентина Андреевна - врач от Бога. Головные боли, которые мучили годами, прошли после курса иглоукалывания.", rating: 5 },
  { name: "Игорь В.", text: "Обратился по поводу остеохондроза. Очень грамотный подход, всё подробно объяснила. Рекомендую!", rating: 5 },
  { name: "Елена С.", text: "Проходила гирудотерапию. Было немного страшно, но врач всё делала профессионально. Результат отличный!", rating: 5 },
];

export default function Reviews() {
  return (
    <section className="max-w-4xl mx-auto px-6 py-16">
      <h2 className="text-3xl font-serif text-center mb-12 text-charcoal">Отзывы пациентов</h2>
      <div className="grid md:grid-cols-3 gap-6">
        {reviews.map((r, i) => (
          <div key={i} className="bg-white p-6 rounded-xl border border-charcoal/10 shadow-sm">
            <div className="flex gap-1 mb-3 text-gold">
              {Array(r.rating).fill(0).map((_, i) => <span key={i}>★</span>)}
            </div>
            <p className="text-charcoal/80 text-sm mb-4 italic">"{r.text}"</p>
            <p className="text-charcoal font-medium text-sm">{r.name}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
