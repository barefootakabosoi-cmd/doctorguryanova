import { describe, it, expect } from "vitest";
import {
  normalizeQuery,
  significantWords,
  isQueryCovered,
  findOpportunities,
  queryId,
} from "../src/lib/semantics";

describe("normalizeQuery — нормализация поисковых фраз", () => {
  it("нижний регистр, ё→е, без пунктуации", () => {
    expect(normalizeQuery("Лечение Мигрени!")).toBe("лечение мигрени");
    expect(normalizeQuery("Ёлка, иглы")).toBe("елка иглы");
  });
  it("схлопывает множественные пробелы", () => {
    expect(normalizeQuery("  боль   в   спине  ")).toBe("боль в спине");
  });
});

describe("significantWords — значимые слова", () => {
  it("убирает стоп-слова и короткие слова", () => {
    expect(significantWords("как лечить боль в спине")).toEqual(["лечить", "боль", "спине"]);
  });
  it("пустой результат для мусорного запроса", () => {
    expect(significantWords("и что в")).toEqual([]);
  });
});

describe("isQueryCovered — покрытие запроса статьями", () => {
  const posts = [
    { slug: "migraine", title: "Лечение мигрени без таблеток", keywords: ["мигрень", "головная боль"] },
  ];

  it("покрытый запрос — true", () => {
    expect(isQueryCovered("как лечить мигрень", posts)).toBe(true);
  });
  it("непокрытый запрос — false", () => {
    expect(isQueryCovered("остеопатия для младенцев", posts)).toBe(false);
  });
  it("мусорный запрос без значимых слов считается покрытым", () => {
    expect(isQueryCovered("и что", posts)).toBe(true);
  });
  it("работает по корням слов (частичное совпадение)", () => {
    expect(isQueryCovered("лечение мигрени у взрослых", posts)).toBe(true);
  });
});

describe("findOpportunities — отбор пробелов семантики", () => {
  const posts = [{ slug: "a", title: "Лечение мигрени без таблеток" }];
  const queries = [
    { phrase: "остеопат для грудничка отзывы", visits: 30 },   // брендовый/отзывы — отсев
    { phrase: "лечение мигрени", visits: 50 },                  // покрыто
    { phrase: "гирудотерапия при остеохондрозе", visits: 40 }, // шанс №1
    { phrase: "гирудотерапия при остеохондрозе!", visits: 12 },// дубль после нормализации
    { phrase: "иглоукалывание цена", visits: 3 },               // шанс №2
    { phrase: "коротко", visits: 100 },                         // слишком короткое
  ];

  it("сортирует по визитам, режет дубли/бренд/покрытое", () => {
    const res = findOpportunities(queries, posts);
    expect(res.map((r) => r.phrase)).toEqual([
      "гирудотерапия при остеохондрозе",
      "иглоукалывание цена",
    ]);
  });
  it("уважает limit и minVisits", () => {
    const res = findOpportunities(queries, posts, { limit: 1, minVisits: 10 });
    expect(res).toHaveLength(1);
    expect(res[0].visits).toBeGreaterThanOrEqual(10);
  });
});

describe("queryId — стабильные короткие ID для callback_data", () => {
  it("детерминирован и компактен (<64 байта с префиксом kwgen|)", () => {
    const id = queryId("Гирудотерапия при остеохондрозе!");
    expect(queryId("гирудотерапия при остеохондрозе")).toBe(id); // нормализация внутри
    expect(`kwgen|${id}`.length).toBeLessThan(64);
  });
  it("разные фразы — разные ID", () => {
    expect(queryId("мигрень")).not.toBe(queryId("остеопат"));
  });
});
