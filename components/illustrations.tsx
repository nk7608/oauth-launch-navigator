// Small contextual diagrams (UPDATE_BRIEF §5). Inline SVG, token colours only, no decoration.
import { cn } from "@/lib/utils";

const ink = "var(--foreground)";
const muted = "var(--muted-foreground)";
const line = "var(--border)";
const action = "var(--primary)";
const done = "var(--done)";

function Box({ x, y, w, label, sub, icon }: { x: number; y: number; w: number; label: string; sub?: string; icon: React.ReactNode }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={w} height="64" rx="12" fill="var(--card)" stroke={line} />
      <g transform="translate(14 20)" stroke={ink} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
        {icon}
      </g>
      <text x="46" y={sub ? 29 : 37} fontSize="14" fontWeight="600" fill={ink}>
        {label}
      </text>
      {sub && (
        <text x="46" y="46" fontSize="12" fill={muted}>
          {sub}
        </text>
      )}
    </g>
  );
}

const Icons = {
  agent: <><rect x="1" y="5" width="20" height="14" rx="4" /><circle cx="8" cy="12" r="1.2" fill={ink} /><circle cx="14" cy="12" r="1.2" fill={ink} /><path d="M11 1v4" /></>,
  layers: <><path d="M11 2 1 7l10 5 10-5-10-5Z" /><path d="m1 12 10 5 10-5" /><path d="m1 17 10 5 10-5" /></>,
  app: <><rect x="2" y="2" width="18" height="20" rx="3" /><path d="M6 8h10M6 12h10M6 16h6" /></>,
  key: <><circle cx="7" cy="12" r="4" /><path d="M11 12h10M17 12v4M20 12v3" /></>,
  user: <><circle cx="11" cy="7" r="4" /><path d="M3 21c1-4 4-6 8-6s7 2 8 6" /></>,
};

/** Home hero (#1): your agent → Composio → the user's app; the user's "Allow" is the link. */
export function AgentConnectDiagram({ className }: { className?: string }) {
  return (
    <figure className={cn("rounded-xl border bg-card p-4", className)}>
      <svg viewBox="0 0 640 104" className="h-auto w-full" role="img" aria-labelledby="acd-title">
        <title id="acd-title">Your agent calls tools through Composio; each user clicks Allow on the provider&apos;s consent screen to connect their app.</title>
        <Box x={8} y={16} w={176} label="Your agent" sub="calls tools" icon={Icons.agent} />
        <Box x={232} y={16} w={176} label="Composio" sub="stores tokens" icon={Icons.layers} />
        <Box x={456} y={16} w={176} label="User's app" sub="Gmail, Slack…" icon={Icons.app} />
        <path d="M184 48h48" stroke={muted} strokeWidth="2" />
        <path d="M408 48h48" stroke={done} strokeWidth="2.5" />
        <circle cx="432" cy="48" r="11" fill="var(--ok-soft)" stroke={done} strokeWidth="2" />
        <path d="m427 48 3.5 3.5L437 45" stroke={done} strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <text x="432" y="100" textAnchor="middle" fontSize="12" fill={done}>user clicks Allow</text>
      </svg>
      <figcaption className="mt-2 text-sm text-muted-foreground">
        Your agent reaches each user&apos;s account through Composio. The link is the user&apos;s &ldquo;Allow&rdquo; on the provider&apos;s
        consent screen, and your OAuth app decides what that screen says and what review it needs.
      </figcaption>
    </figure>
  );
}

/** Plan page (#2): one OAuth app registered once, many users each consent to get a connected account. */
export function OneAppManyUsers() {
  const users = [0, 1, 2];
  return (
    <figure className="rounded-xl border bg-card p-4">
      <svg viewBox="0 0 560 200" className="h-auto w-full" role="img" aria-labelledby="oamu-title">
        <title id="oamu-title">You register one OAuth app and add it to Composio once. Each user then approves access, which creates their own connected account.</title>
        <Box x={40} y={8} w={200} label="Your OAuth app" sub="client ID + secret" icon={Icons.key} />
        <Box x={320} y={8} w={200} label="Composio" sub="auth config" icon={Icons.layers} />
        <path d="M240 40h80" stroke={action} strokeWidth="2" />
        <text x="280" y="32" textAnchor="middle" fontSize="12" fill={action}>once</text>
        {users.map((u) => {
          const x = 70 + u * 170;
          return (
            <g key={u}>
              <path d={`M420 72 L${x + 60} 132`} stroke={line} strokeWidth="1.5" />
              <g transform={`translate(${x} 132)`}>
                <rect width="120" height="52" rx="12" fill="var(--card)" stroke={line} />
                <g transform="translate(12 15)" stroke={ink} strokeWidth="1.6" fill="none" strokeLinecap="round">{Icons.user}</g>
                <text x="42" y="24" fontSize="13" fontWeight="600" fill={ink}>User {u + 1}</text>
                <text x="42" y="40" fontSize="11" fill={done}>✓ connected</text>
              </g>
            </g>
          );
        })}
        <text x="18" y="110" fontSize="12" fill={muted}>each user consents</text>
      </svg>
      <figcaption className="mt-2 text-sm text-muted-foreground">
        You set up the OAuth app once. Every user who clicks Allow gets their own connected account, so changing scopes
        later means users reconnect.
      </figcaption>
    </figure>
  );
}

/** Toggle icons (#4): one person, a small group, many people. */
export function AudienceIcon({ kind, className }: { kind: "me" | "team" | "customers"; className?: string }) {
  const head = (cx: number, cy: number, r = 3) => <circle cx={cx} cy={cy} r={r} />;
  const body = (cx: number, y: number, w = 5) => <path d={`M${cx - w} ${y + 7}c0-3.5 2.2-5.5 ${w} -5.5s${w} 2 ${w} 5.5`} />;
  return (
    <svg viewBox="0 0 24 20" className={cn("h-4 w-5", className)} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
      {kind === "me" && <>{head(12, 6)}{body(12, 11)}</>}
      {kind === "team" && <>{head(8, 7, 2.5)}{body(8, 11, 4)}{head(16, 7, 2.5)}{body(16, 11, 4)}</>}
      {kind === "customers" && (
        <>
          {head(5, 8, 2.2)}{body(5, 11.5, 3.5)}{head(12, 5, 2.5)}{body(12, 9, 4)}{head(19, 8, 2.2)}{body(19, 11.5, 3.5)}
        </>
      )}
    </svg>
  );
}

/** Scenario exits (#5): what path to take instead. */
export function ScenarioExit({ kind }: { kind: "not_oauth" | "not_in_composio" | "insufficient" }) {
  const copy = {
    not_oauth: { from: "API key", to: "Paste it into a Composio auth config", note: "No OAuth app, no consent screen, no review." },
    not_in_composio: { from: "Provider OAuth app", to: "Request the toolkit from Composio", note: "Set up the provider side now; connect it when the toolkit ships." },
    insufficient: { from: "Not enough sources", to: "Ask the provider or add its website", note: "We stop rather than guess steps." },
  }[kind];
  return (
    <figure className="flex items-center gap-4 rounded-xl border bg-card p-4">
      <svg viewBox="0 0 48 48" className="size-12 shrink-0" fill="none" stroke={ink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {kind === "not_oauth" && <><circle cx="16" cy="24" r="8" /><path d="M24 24h18M36 24v6M41 24v5" /></>}
        {kind === "not_in_composio" && <><path d="M18 14v8M30 14v8" /><path d="M13 22h22v6a11 11 0 0 1-22 0v-6Z" strokeDasharray="4 3" /><path d="M24 39v6" /></>}
        {kind === "insufficient" && <><circle cx="21" cy="21" r="12" /><path d="m30 30 12 12" /><path d="M17 18c0-2 2-4 4-4s4 2 4 4-4 3-4 6" /><circle cx="21" cy="28" r=".6" fill={ink} /></>}
      </svg>
      <figcaption className="text-sm">
        <span className="flex flex-wrap items-center gap-2 font-medium">
          {copy.from}
          <span aria-hidden className="text-muted-foreground">→</span>
          {copy.to}
        </span>
        <span className="mt-0.5 block text-muted-foreground">{copy.note}</span>
      </figcaption>
    </figure>
  );
}
