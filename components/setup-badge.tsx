import { CheckIcon, KeyRoundIcon, WrenchIcon } from "lucide-react";
import { SETUP_TYPE_LABEL, type SetupType } from "@/lib/apps";
import { cn } from "@/lib/utils";

const STYLE: Record<SetupType, { className: string; Icon: typeof CheckIcon }> = {
  ready: { className: "bg-ok-soft text-ok", Icon: CheckIcon },
  own_app: { className: "bg-own-soft text-own", Icon: WrenchIcon },
  not_oauth: { className: "bg-muted text-muted-foreground", Icon: KeyRoundIcon },
};

export function SetupBadge({ type, className }: { type: SetupType; className?: string }) {
  const { className: tone, Icon } = STYLE[type];
  return (
    <span className={cn("inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", tone, className)}>
      <Icon className="size-3" aria-hidden />
      {SETUP_TYPE_LABEL[type]}
    </span>
  );
}
