"use client";

import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/cn";
import { links } from "@/lib/links";

// same links as the shared public header of the product
const ITEMS = [
  { href: links.propFirms, label: "Проп-фірми" },
  { href: links.tools, label: "Інструменти" },
  { href: links.faq, label: "Часті запитання" },
];

export function Nav() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState<string | null>(null);

  useMotionValueEvent(scrollY, "change", (v) => {
    const next = v > 24;
    if (next !== scrolled) setScrolled(next);
  });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 z-nav">
      <div className="container-page pt-3">
        <nav
          aria-label="Основна навігація"
          className={cn(
            "flex h-[var(--nav-h)] items-center justify-between gap-4 rounded-2xl pl-4 pr-2 transition-[background-color,box-shadow,backdrop-filter] duration-500 ease-out",
            scrolled || open ? "glass" : "bg-transparent",
          )}
        >
          <a href="#top" aria-label="Traders Care, на початок" className="shrink-0">
            <Logo />
          </a>

          <ul className="hidden items-center lg:flex" onMouseLeave={() => setHover(null)}>
            {ITEMS.map((it) => (
              <li key={it.href} className="relative">
                <a
                  href={it.href}
                  onMouseEnter={() => setHover(it.href)}
                  className="relative z-base block px-3.5 py-2 text-[14px] text-ink-2 transition-colors hover:text-ink"
                >
                  {it.label}
                </a>
                {hover === it.href && (
                  <motion.span
                    layoutId="nav-hover"
                    className="absolute inset-0 rounded-full bg-ink/[0.07]"
                    transition={{ type: "spring", stiffness: 420, damping: 36 }}
                  />
                )}
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-1.5">
            <a href={links.login} className="hidden px-3 py-2 text-[14px] text-ink-2 transition-colors hover:text-ink sm:block">
              Увійти
            </a>
            <Button href={links.register} className="hidden sm:inline-flex">
              Почати безкоштовно
            </Button>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? "Закрити меню" : "Відкрити меню"}
              className="grid h-10 w-10 place-items-center rounded-full text-ink hover:bg-ink/[0.07] lg:hidden"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>

        <AnimatePresence>
          {open && (
            <motion.div
              id="mobile-menu"
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="glass mt-2 origin-top rounded-2xl p-2 lg:hidden"
            >
              <ul>
                {ITEMS.map((it) => (
                  <li key={it.href}>
                    <a
                      href={it.href}
                      onClick={() => setOpen(false)}
                      className="block rounded-xl px-4 py-3 text-[1.0625rem] text-ink hover:bg-ink/[0.06]"
                    >
                      {it.label}
                    </a>
                  </li>
                ))}
              </ul>
              <div className="mt-2 grid gap-2 border-t border-ink/[0.07] p-2 pt-4">
                <Button href={links.login} variant="secondary">
                  Увійти
                </Button>
                <Button href={links.register}>Почати безкоштовно</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
