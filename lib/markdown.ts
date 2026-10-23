// Markdown rendering of a plan view, in the same order as the plan page. Used by "Copy as Markdown" and /api/plan/[slug].md.
import type { Plan } from "@/lib/plan-schema";
import { PHASES, SCENARIO_LABEL, type PlanView } from "@/lib/rules";

const OWNER = { you: "You do", agent: "Agent can do" } as const;

export function planToMarkdown(plan: Plan, view: PlanView, url?: string): string {
  const ev = (ids: string[]) => ids.map((id) => `[${id}]`).join("");
  const lines: string[] = [];
  lines.push(`# ${plan.app.name}: OAuth launch plan`, "");
  lines.push(`**${SCENARIO_LABEL[view.scenario]}.** ${view.verdict}`, "");
  if (plan.meta.fallback) lines.push(`**Starter plan:** ${plan.meta.fallback.reason} Full research is incomplete; empty Composio fields are unconfirmed when composioChecked is false.`, "");
  lines.push("Assumptions:", ...view.assumptions.map((a) => `- ${a}`), "");
  lines.push(`- **Setup effort:** ${view.effort}`);
  if (view.wait.none) lines.push(`- **Wait:** ${view.wait.none}`);
  if (view.wait.official) lines.push(`- **Wait (official):** ${view.wait.official}`);
  if (view.wait.reported) lines.push(`- **Wait (reported):** ${view.wait.reported}`);
  if (view.gatekeepers.length) lines.push(`- **Who must approve:** ${view.gatekeepers.join("; ")}`);
  lines.push("", `## Next action`, "", view.nextAction, "", "## Steps", "");
  for (const phase of PHASES) {
    const steps = view.steps.filter((s) => s.phase === phase.id);
    if (!steps.length) continue;
    lines.push(`### ${phase.label}`, "");
    for (const s of steps) {
      lines.push(`${s.number}. **${s.title}** _(${OWNER[s.owner]})_ ${ev(s.evidence)}`);
      lines.push(`   ${s.detail}`);
      for (const c of s.copyValues ?? []) {
        lines.push("", `   ${c.label}:`, "", "   ```", ...c.value.split("\n").map((l) => `   ${l}`), "   ```");
      }
      if (s.link) lines.push(`   Link: [${s.link.label}](${s.link.url})`);
      if (s.blocker) lines.push(`   - If you see "${s.blocker.symptom}": ${s.blocker.cause}. Fix: ${s.blocker.fix}.`);
      lines.push("");
    }
  }
  if (view.scopes.length) {
    lines.push("## Scopes", "", "| Scope | Allows | Tier | Triggers | Sources |", "| --- | --- | --- | --- | --- |");
    for (const s of view.scopes) lines.push(`| \`${s.scope}\` | ${s.allows} | ${s.tier} | ${s.triggers} | ${ev(s.evidence)} |`);
    lines.push("");
  }
  lines.push("## Sources", "");
  for (const e of view.evidence) lines.push(`- [${e.id}] **${e.label}**: ${e.claim} ${e.url ? `([${e.sourceTitle}](${e.url}))` : `(${e.sourceTitle})`}`);
  if (view.unknowns.length) lines.push("", "## What we couldn't verify", "", ...view.unknowns.map((u) => `- ${u}`));
  lines.push("", `_Plan status: ${plan.meta.status}, researched ${plan.meta.generatedAt}.${url ? ` Live version: ${url}` : ""}_`);
  return lines.join("\n") + "\n";
}

/** One step as Markdown, for the per-step copy button. */
export function stepToMarkdown(step: PlanView["steps"][number]): string {
  const parts = [`${step.number}. **${step.title}** _(${OWNER[step.owner]})_`, step.detail];
  for (const c of step.copyValues ?? []) parts.push(`${c.label}:\n\`\`\`\n${c.value}\n\`\`\``);
  if (step.link) parts.push(`${step.link.label}: ${step.link.url}`);
  if (step.blocker) parts.push(`If you see "${step.blocker.symptom}": ${step.blocker.cause}. Fix: ${step.blocker.fix}.`);
  return parts.join("\n\n");
}
