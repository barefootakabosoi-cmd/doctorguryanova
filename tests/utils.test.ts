import { describe, it, expect } from "vitest";
import { esc, slugify, calculateReadTime } from "../src/lib/utils";
import { SERVICES, getService } from "../src/lib/services";

describe("esc — экранирование HTML в письмах", () => {
  it("экранирует опасные символы", () => {
    expect(esc('<img src=x onerror="alert(1)">')).toBe(
      "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;"
    );
  });
  it("обрабатывает null/undefined без падения", () => {
    expect(esc(null)).toBe("");
    expect(esc(undefined)).toBe("");
  });
  it("не ломает обычный текст", () => {
    expect(esc("Иванов Иван")).toBe("Иванов Иван");
  });
});

describe("slugify — транслитерация заголовков", () => {
  it("транслитерирует русский текст", () => {
    expect(slugify("Лечение мигрени без таблеток")).toBe("lechenie-migreni-bez-tabletok");
  });
  it("вырезает спецсимволы и схлопывает пробелы", () => {
    expect(slugify("  Мигрень: симптомы & лечение!  ")).toBe("migren-simptomy-lechenie");
  });
  it("ограничивает длину 80 символами", () => {
    expect(slugify("а ".repeat(100)).length).toBeLessThanOrEqual(80);
  });
});

describe("calculateReadTime — время чтения", () => {
  it("минимум 3 минуты даже для короткого текста", () => {
    expect(calculateReadTime("<p>Коротко</p>")).toBe(3);
  });
  it("считает по ~200 слов в минуту, игнорируя HTML-теги", () => {
    const words = Array(601).fill("слово").join(" ");
    expect(calculateReadTime(`<p>${words}</p>`)).toBe(4);
  });
});

describe("SERVICES — серверный каталог цен", () => {
  it("ID совпадают с направлениями формы бронирования", () => {
    expect(getService("nevro")?.price).toBe(3500);
    expect(getService("osteopat")?.name).toContain("Остеопатия");
  });
  it("несуществующий ID не возвращает цену (клиент не может навязать сумму)", () => {
    expect(getService("hacked")).toBeUndefined();
    expect(getService("__proto__")).toBeUndefined();
  });
  it("все цены — положительные целые рубли", () => {
    for (const s of SERVICES) {
      expect(Number.isInteger(s.price)).toBe(true);
      expect(s.price).toBeGreaterThan(0);
      expect(s.id).not.toContain("/");
    }
  });
});
