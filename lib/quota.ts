// OpenRouter's limit_remaining is a spending cap, not a free-model request count.
export function freeRequestsRemaining(data: { free_model_daily_requests?: { remaining?: unknown } } | undefined): number | undefined {
  const remaining = data?.free_model_daily_requests?.remaining;
  return typeof remaining === "number" && Number.isFinite(remaining) && remaining >= 0 ? remaining : undefined;
}

/** Free AI requests kept back each day for the owner's demo path (UPDATE_BRIEF §6.7). */
export const DAILY_RESERVE = Number(process.env.DAILY_RESERVE ?? 5);
export const DEMO_COOKIE = "scopewise_demo";

/** The owner unlocks the reserve with a cookie set by /api/quota?token=<DEMO_TOKEN>. */
export function isDemoRequest(request: { cookies: { get(name: string): { value: string } | undefined } }) {
  const token = process.env.DEMO_TOKEN?.trim();
  return Boolean(token) && request.cookies.get(DEMO_COOKIE)?.value === token;
}
