const PLATFORMS = ["MetaTrader 4", "MetaTrader 5", "cTrader", "Match-Trader", "DXtrade"];

/** Where the data comes from. Quiet strip directly under the hero. */
export function Platforms() {
  return (
    <section aria-label="Підтримувані платформи" className="relative">
      <div className="container-page">
        <div className="flex flex-col gap-6 border-y border-ink/[0.07] py-8 md:flex-row md:items-center md:justify-between md:gap-10">
          <p className="max-w-[18rem] shrink-0 text-[14px] leading-snug text-muted">
            Синхронізація лише на читання з платформами, які використовують проп-фірми
          </p>
          <ul className="flex flex-wrap items-center gap-x-8 gap-y-3 md:justify-end lg:gap-x-12">
            {PLATFORMS.map((p) => (
              <li key={p} className="text-[1.125rem] font-semibold tracking-[-0.02em] text-ink/55 transition-colors hover:text-ink sm:text-[1.25rem]">
                {p}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
