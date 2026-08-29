import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const redis = new Redis({
  url: process.env.KV_REST_API_URL || "",
  token: process.env.KV_REST_API_TOKEN || "",
});

export async function GET(req: NextRequest) {
  const bookingId = req.nextUrl.searchParams.get("bookingId");
  if (!bookingId || !bookingId.startsWith("NM-")) {
    return NextResponse.json({ error: "Invalid bookingId" }, { status: 400 });
  }

  if (!process.env.KV_REST_API_URL) {
    return NextResponse.json({ status: "pending", error: "KV not configured" });
  }

  const isPaid = await redis.get(`paid:${bookingId}`);

  if (isPaid) {
    const jitsiLink = await redis.get(`jitsi:${bookingId}`);
    return NextResponse.json({ status: "paid", jitsiLink });
  }

  return NextResponse.json({ status: "pending" });
}
