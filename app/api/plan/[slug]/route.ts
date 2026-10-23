// GET /api/plan/<slug>.json?does=read|write|both&users=me|team|customers  → plan JSON for agents
// GET /api/plan/<slug>.md?...                                               → same plan as Markdown
import type { NextRequest } from "next/server";
import { getPlan, planMarkdown, planToJson } from "@/lib/plans";
import { parseInputs } from "@/lib/rules";

export async function GET(request: NextRequest, ctx: RouteContext<"/api/plan/[slug]">) {
  const { slug: file } = await ctx.params;
  const match = /^(.+?)(?:\.(json|md))?$/.exec(file)!;
  const slug = match[1];
  const format = match[2] ?? "json";
  const base = request.nextUrl.origin;
  const plan = await getPlan(slug);
  if (!plan) {
    return Response.json(
      { error: `No plan for "${slug}" yet.`, generate: { method: "POST", url: `${base}/api/generate`, body: { query: slug } } },
      { status: 404 },
    );
  }
  const inputs = parseInputs(request.nextUrl.searchParams);
  if (format === "md") {
    return new Response(planMarkdown(plan, inputs, base), { headers: { "content-type": "text/markdown; charset=utf-8" } });
  }
  return Response.json(planToJson(plan, inputs, base));
}
