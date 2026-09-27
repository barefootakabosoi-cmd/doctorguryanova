import { NextRequest, NextResponse } from "next/server"
import { Redis } from "@upstash/redis"
import { getWorkingHoursForDate } from "@/lib/schedule"

export const dynamic = "force-dynamic";

const redis = new Redis({
  url: process.env.KV_REST_API_URL || "",
  token: process.env.KV_REST_API_TOKEN || "",
})



export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date")
  if (!date) {
    return NextResponse.json({ error: "date parameter required" }, { status: 400 })
  }

  const workingHours = getWorkingHoursForDate(date);
  if (workingHours.length === 0) {
    return NextResponse.json({ slots: [] });
  }

  if (!process.env.KV_REST_API_URL) {
    return NextResponse.json({ slots: workingHours });
  }

  // Один pipeline вместо 10 последовательных запросов к Redis
  const pipeline = redis.pipeline()
  for (const t of workingHours) {
    pipeline.get(`booking:${date}:${t}`)
  }
  const results = await pipeline.exec()

  const available = workingHours.filter((_, i) => !Boolean(results[i]))

  return NextResponse.json({ slots: available })
}
