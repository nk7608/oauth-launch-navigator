// GET /api/quota?token=<DEMO_TOKEN> → today's remaining free AI requests (owner only), and marks this browser
// as the demo browser so it can use the daily reserve. Without the right token it reveals nothing.
import type { NextRequest } from "next/server";
import { remainingQuota, secondProviderConfigured } from "@/lib/llm";
import { DAILY_RESERVE, DEMO_COOKIE } from "@/lib/quota";

export async function GET(request: NextRequest) {
  const token = process.env.DEMO_TOKEN?.trim();
  if (!token || request.nextUrl.searchParams.get("token") !== token) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  const res = Response.json({
    freeRequestsRemainingToday: (await remainingQuota()) ?? null,
    reservedForDemo: DAILY_RESERVE,
    secondProvider: secondProviderConfigured(),
    demoBrowser: true,
  });
  res.headers.append("Set-Cookie", `${DEMO_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`);
  return res;
}
