#!/usr/bin/env node
// scripts/test-gigachat.js
// Тест подключения к GigaChat API
// Запуск: node scripts/test-gigachat.js

const GIGACHAT_CLIENT_ID = process.env.GIGACHAT_CLIENT_ID;
const GIGACHAT_CLIENT_SECRET = process.env.GIGACHAT_CLIENT_SECRET;

if (!GIGACHAT_CLIENT_ID || !GIGACHAT_CLIENT_SECRET) {
  console.error("❌ Установи env vars: GIGACHAT_CLIENT_ID и GIGACHAT_CLIENT_SECRET");
  process.exit(1);
}

async function testAuth() {
  console.log("🤖 Тест GigaChat API...");
  console.log("   Client ID:", GIGACHAT_CLIENT_ID.slice(0, 10) + "...");

  const authString = Buffer.from(`${GIGACHAT_CLIENT_ID}:${GIGACHAT_CLIENT_SECRET}`).toString("base64");

  try {
    const response = await fetch("https://ngw.devices.sberbank.ru:9443/api/v2/oauth", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${authString}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
        "RqUID": crypto.randomUUID(),
      },
      body: new URLSearchParams({ scope: "GIGACHAT_API_PERS" }),
    });

    if (!response.ok) {
      console.error("❌ Auth failed:", response.status, await response.text());
      process.exit(1);
    }

    const data = await response.json();
    console.log("✅ Авторизация успешна!");
    console.log("   Token:", data.access_token.slice(0, 20) + "...");
    console.log("   Expires:", new Date(Date.now() + data.expires_at * 1000).toLocaleString());

    // Тест генерации
    console.log("\n📝 Тест генерации...");
    const genResponse = await fetch("https://gigachat.devices.sberbank.ru/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${data.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "GigaChat",
        messages: [
          { role: "system", content: "Ты — помощник врача-невролога." },
          { role: "user", content: "Напиши один совет по профилактике мигрени (50 слов)." },
        ],
        max_tokens: 200,
      }),
    });

    if (!genResponse.ok) {
      console.error("❌ Generation failed:", genResponse.status, await genResponse.text());
      process.exit(1);
    }

    const genData = await genResponse.json();
    console.log("✅ Генерация работает!");
    console.log("   Ответ:", genData.choices[0].message.content);
    console.log("\n🎉 GigaChat API полностью настроен!");

  } catch (err) {
    console.error("❌ Ошибка:", err.message);
    process.exit(1);
  }
}

testAuth();
