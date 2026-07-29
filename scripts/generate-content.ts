#!/usr/bin/env ts-node
// scripts/generate-content.ts
// CLI для генерации контента через GigaChat
// Запуск: npx ts-node scripts/generate-content.ts <type> <topic>
// Пример: npx ts-node scripts/generate-content.ts article "мигрень у женщин"

import { GigaChatClient } from "../src/lib/gigachat";

async function main() {
  const [type, ...topicParts] = process.argv.slice(2);
  const topic = topicParts.join(" ");

  if (!type || !topic) {
    console.log("Использование: npx ts-node scripts/generate-content.ts <type> <topic>");
    console.log("Типы: article, telegram_post, meta, faq");
    console.log("Пример: npx ts-node scripts/generate-content.ts article 'мигрень у женщин'");
    process.exit(1);
  }

  const validTypes = ["article", "telegram_post", "meta", "faq"];
  if (!validTypes.includes(type)) {
    console.error(`❌ Неверный тип: ${type}. Доступные: ${validTypes.join(", ")}`);
    process.exit(1);
  }

  console.log(`🤖 Генерация ${type} на тему: "${topic}"...`);
  console.log("⏳ Это может занять 10-30 секунд...\n");

  const client = new GigaChatClient();
  const content = await client.generateContent(type as any, topic);

  console.log("=".repeat(60));
  console.log("✅ ГЕНЕРИРОВАННЫЙ КОНТЕНТ");
  console.log("=".repeat(60));
  console.log(content);
  console.log("=".repeat(60));
  console.log("\n💡 Сохрани результат в файл или скопируй вручную.");
  console.log("⚠️  ОБЯЗАТЕЛЬНО проверь контент перед публикацией!");
}

main().catch((err) => {
  console.error("❌ Ошибка:", err.message);
  process.exit(1);
});
