import { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { event, object } = body

    if (event === "payment.succeeded" && object?.status === "succeeded") {
      const bookingId = object.metadata?.booking_id
      const paymentId = object.id
      const amount = object.amount?.value

      console.log("Payment succeeded:", { bookingId, paymentId, amount })

      // Telegram уведомление
      const botToken = process.env.TELEGRAM_BOT_TOKEN
      const chatId = process.env.TELEGRAM_CHAT_ID
      if (botToken && chatId && bookingId) {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: `✅ Оплата получена!\n\n💰 ${amount} ₽\n🆔 Бронь: ${bookingId}\n💳 Платёж: ${paymentId}`,
            parse_mode: "HTML",
          }),
        })
      }
    }

    return Response.json({ received: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return Response.json({ received: true })
  }
}
