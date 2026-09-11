import { cn } from "@/lib/utils";

export function Logo({
  className,
  light = false,
  compact = false,
}: {
  className?: string;
  light?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", compact && "justify-center", className)}>
      <svg width="30" height="30" viewBox="0 0 32 32" fill="none" aria-hidden>
        <rect width="32" height="32" rx="9" fill={light ? "#10b981" : "#1e4230"} />
        <path d="M8 21c3-8 8-11 16-11-1 8-6 12-13 12" stroke="#a7f3d0" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M11 21c2-3 4-5 8-7" stroke="#34d399" strokeWidth="1.6" strokeLinecap="round" />
      </svg>

      {!compact && (
        <div className="leading-tight">
          <p className={cn("text-[15px] font-semibold tracking-tight", light ? "text-white" : "text-charcoal-900")}>TerraScore</p>
          <p className={cn("text-[10px] font-medium uppercase tracking-[.14em]", light ? "text-emerald-200/80" : "text-charcoal-400")}>Climate Risk Intelligence</p>
        </div>
      )}
    </div>
  );
}
