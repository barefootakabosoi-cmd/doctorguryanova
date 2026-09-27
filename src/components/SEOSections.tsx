const diseases = [
  "Головные боли и мигрени",
  "Остеохондроз и боли в спине",
  "Вегето-сосудистая дистония (ВСД)",
  "Невралгия тройничного нерва",
  "Бессонница и хроническая усталость",
  "Артрозы и артриты",
];

export default function SEOSections() {
  return (
    <section className="max-w-4xl mx-auto px-6 py-16">
      <div className="bg-white rounded-2xl border border-charcoal/10 p-8 md:p-12 shadow-sm">
        <h2 className="text-3xl font-serif text-center mb-8 text-charcoal">Что лечит невролог</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {diseases.map((d, i) => (
            <div key={i} className="flex items-center gap-3 text-charcoal/80">
              <span className="text-gold text-xl">•</span>
              <span>{d}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
