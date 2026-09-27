import nodemailer from "nodemailer"

/**
 * Единая точка отправки уведомлений (Telegram / email).
 * Все функции non-fatal: ошибка доставки логируется, но не роняет запрос.
 */

interface TelegramOptions {
  chatId?: string
  disablePreview?: boolean
  /** Inline-кнопки и прочий reply_markup (передаётся как есть) */
  replyMarkup?: Record<string, unknown>
}

/** Сообщение в Telegram-чат (по умолчанию — чат врача). */
export async function sendTelegramMessage(text: string, opts: TelegramOptions = {}): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId = opts.chatId || process.env.TELEGRAM_CHAT_ID
  if (!botToken || !chatId) return false
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: opts.disablePreview ?? false,
        ...(opts.replyMarkup ? { reply_markup: opts.replyMarkup } : {}),
      }),
    })
    if (!res.ok) {
      console.error(`Telegram sendMessage failed: ${res.status}`, await res.text().catch(() => ""))
      return false
    }
    return true
  } catch (err) {
    console.error("Telegram failed (non-fatal):", err)
    return false
  }
}

interface EmailOptions {
  subject: string
  html: string
  /** Получатель; по умолчанию DOCTOR_EMAIL или SMTP-пользователь */
  to?: string
  /** Имя отправителя; по умолчанию «Запись Гурьянова» */
  fromName?: string
}

/** Письмо через SMTP. Возвращает true, если письмо реально отправлено. */
export async function sendEmail({ subject, html, to, fromName }: EmailOptions): Promise<boolean> {
  const smtpHost = process.env.SMTP_HOST
  const smtpUser = process.env.SMTP_USER
  const smtpPass = process.env.SMTP_PASS
  if (!smtpHost || !smtpUser || !smtpPass) return false
  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(process.env.SMTP_PORT) || 465,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: smtpUser, pass: smtpPass },
    })
    await transporter.sendMail({
      from: `"${fromName || "Запись Гурьянова"}" <${smtpUser}>`,
      to: to || process.env.DOCTOR_EMAIL || smtpUser,
      subject,
      html,
    })
    return true
  } catch (err) {
    console.error("SMTP failed (non-fatal):", err)
    return false
  }
}
