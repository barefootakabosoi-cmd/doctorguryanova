import { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { amount, description, returnUrl, bookingId, email } = body

    const shopId = process.env.YOOKASSA_SHOP_ID
    const secretKey = process.env.YOOKASSA_SECRET_KEY

    if (!shopId || !secretKey) {
      return Response.json({ error: "YooKassa not configured" }, { status: 500 })
    }

    const idempotenceKey = `${Date.now()}-${Math.random()}`

    const res = await fetch("https://api.yookassa.ru/v3/payments", {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${shopId}:${secretKey}`).toString("base64"),
        "Idempotence-Key": idempotenceKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: { value: amount.toFixed(2), currency: "RUB" },
        capture: true,
        confirmation: {
          type: "redirect",
          return_url: returnUrl,
        },
        description,
        metadata: { booking_id: bookingId, patient_email: email },
        receipt: {
          customer: { email: email || "info@doctorguryanova.ru" },
          items: [{
            description: description,
            quantity: "1.00",
            amount: { value: amount.toFixed(2), currency: "RUB" },
            vat_code: 1,
          }],
        },
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      console.error("YooKassa error:", data)
      return Response.json({ error: data.description || "Payment creation failed" }, { status: 400 })
    }

    return Response.json({
      paymentUrl: data.confirmation.confirmation_url,
      paymentId: data.id,
    })
  } catch (error) {
    console.error("Payment create error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
