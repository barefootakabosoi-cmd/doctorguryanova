#!/usr/bin/env node
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require("dotenv").config({ path: ".env.local" });
const crypto = require("crypto");

const GIGACHAT_CLIENT_ID = process.env.GIGACHAT_CLIENT_ID;
const GIGACHAT_CLIENT_SECRET_RAW = process.env.GIGACHAT_CLIENT_SECRET;
const GIGACHAT_CLIENT_SECRET = Buffer.from(GIGACHAT_CLIENT_SECRET_RAW, "base64").toString("utf8");

console.log("🤖 Тест GigaChat API...");
console.log("   Client ID:", GIGACHAT_CLIENT_ID?.slice(0, 12) + "...");

if (!GIGACHAT_CLIENT_ID || !GIGACHAT_CLIENT_SECRET) {
  console.error("❌ Установи env vars: GIGACHAT_CLIENT_ID и GIGACHAT_CLIENT_SECRET");
  process.exit(1);
}

async function testGigaChat() {
  try {
    console.log("\n⏳ Получение access_token...");
    const credentials = Buffer.from(`${GIGACHAT_CLIENT_SECRET}:${GIGACHAT_CLIENT_ID}`).toString("base64");

    const authResponse = await fetch("https://ngw.devices.sberbank.ru:9443/api/v2/oauth", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        Authorization: `Basic ${credentials}`,
        RqUID: crypto.randomUUID(),
      },
      body: new URLSearchParams({ scope: "GIGACHAT_API_PERS" }).toString(),
    });

    if (!authResponse.ok) {
      const text = await authResponse.text();
      throw new Error(`Auth failed: ${authResponse.status} ${text}`);
    }

    const authData = await authResponse.json();
    console.log("✅ Токен получен");

    console.log("\n⏳ Тестовый запрос к Chat Completions...");
    const chatResponse = await fetch("https://gigachat.devices.sberbank.ru/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${authData.access_token}`,
      },
      body: JSON.stringify({
        model: "GigaChat:latest",
        messages: [
          { role: "system", content: "Ты — вежливый ассистент." },
          { role: "user", content: "Привет! Напиши одно короткое приветствие для сайта врача-невролога." },
        ],
        temperature: 0.3,
        max_tokens: 100,
      }),
    });

    if (!chatResponse.ok) {
      const text = await chatResponse.text();
      throw new Error(`Chat failed: ${chatResponse.status} ${text}`);
    }

    const chatData = await chatResponse.json();
    const reply = chatData.choices[0]?.message?.content;

    console.log("✅ Ответ от GigaChat получен:");
    console.log(`   "${reply}"`);
    console.log("\n=== Все тесты пройдены ===");

  } catch (error) {
    console.error("\n❌ Ошибка:", error.message);
    process.exit(1);
  }
}

testGigaChat();
