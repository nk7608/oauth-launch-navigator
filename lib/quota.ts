// OpenRouter's limit_remaining is a spending cap, not a free-model request count.
export function freeRequestsRemaining(data: { free_model_daily_requests?: { remaining?: unknown } } | undefined): number | undefined {
  const remaining = data?.free_model_daily_requests?.remaining;
  return typeof remaining === "number" && Number.isFinite(remaining) && remaining >= 0 ? remaining : undefined;
}
