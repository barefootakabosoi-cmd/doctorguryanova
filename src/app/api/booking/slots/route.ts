import { NextRequest, NextResponse } from "next/server"
import { Redis } from "@upstash/redis"

export const dynamic = "force-dynamic";

const redis = new Redis({
  url: process.env.KV_REST_API_URL || "",
  token: process.env.KV_REST_API_TOKEN || "",
})

const ALL_TIMES = ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"]

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date")
  if (!date) {
    return NextResponse.json({ error: "date parameter required" }, { status: 400 })
  }

  if (!process.env.KV_REST_API_URL) {
    return NextResponse.json({ slots: [] })
  }

  const booked: string[] = []
  for (const t of ALL_TIMES) {
    const val = await redis.get(`booking:${date}:${t}`)
    if (val) booked.push(t)
  }

  return NextResponse.json({ slots: booked })
}
