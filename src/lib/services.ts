// Серверный каталог услуг — ЕДИНСТВЕННЫЙ источник цен.
// Клиент присылает только serviceId (id направления из формы),
// цена и название подставляются здесь. Цену с фронта не доверяем.
export interface Service {
  id: string;
  name: string;
  price: number; // рубли
}

export const SERVICES: Service[] = [
  { id: "nevro",    name: "Консультация невролога",   price: 3500 },
  { id: "reflex",   name: "Рефлексотерапия",          price: 4000 },
  { id: "girudo",   name: "Гирудотерапия",            price: 3800 },
  { id: "manual",   name: "Мануальная терапия",       price: 3200 },
  { id: "osteopat", name: "Остеопатия",               price: 4200 },
  { id: "complex",  name: "Комплексная консультация", price: 5000 },
];

export function getService(id: string): Service | undefined {
  return SERVICES.find((s) => s.id === id);
}
