import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "lg";

const base =
  "group relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-[transform,background-color,box-shadow,color] duration-200 ease-out active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-ink shadow-[inset_0_1px_0_oklch(1_0_0/0.35),0_8px_24px_-8px_oklch(var(--accent)/0.55)] hover:shadow-[inset_0_1px_0_oklch(1_0_0/0.35),0_10px_32px_-6px_oklch(var(--accent)/0.7)] hover:brightness-105",
  secondary:
    "bg-ink/[0.06] text-ink shadow-[inset_0_0_0_1px_oklch(var(--ink)/0.12)] hover:bg-ink/[0.1]",
  ghost: "text-ink-2 hover:text-ink",
};

const sizes: Record<Size, string> = {
  md: "h-10 px-4 text-[0.9375rem]",
  lg: "h-12 px-6 text-base",
};

type Props = {
  href: string;
  variant?: Variant;
  size?: Size;
  arrow?: boolean;
  className?: string;
  children: React.ReactNode;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "className" | "children">;

export function Button({ href, variant = "primary", size = "md", arrow, className, children, ...rest }: Props) {
  return (
    <a href={href} className={cn(base, variants[variant], sizes[size], className)} {...rest}>
      {children}
      {arrow && (
        <ArrowRight
          aria-hidden
          className="h-4 w-4 transition-transform duration-300 ease-out group-hover:translate-x-0.5"
          strokeWidth={2}
        />
      )}
    </a>
  );
}
