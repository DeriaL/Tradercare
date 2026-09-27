import { cn } from "@/lib/cn";

/** The existing Traders Care mark (C + T), kept as-is. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth={5.6}
      strokeLinecap="butt"
      strokeLinejoin="miter"
      aria-hidden
      className={cn("shrink-0", className)}
    >
      <path d="M51 17C46.5 11.6 40 8.5 32 8.5C19 8.5 8.5 19 8.5 32C8.5 45 19 55.5 32 55.5C40 55.5 46.5 52.4 51 47" />
      <path d="M21 24.5H55" />
      <path d="M38 24.5V44" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 text-ink", className)}>
      <LogoMark className="h-6 w-6" />
      <span className="text-[1.0625rem] font-semibold tracking-[-0.02em]">Traders Care</span>
    </span>
  );
}
