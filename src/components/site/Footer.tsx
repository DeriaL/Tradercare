import { Logo } from "@/components/ui/Logo";
import { links } from "@/lib/links";

const COLS = [
  {
    title: "Продукт",
    items: [
      { label: "Можливості", href: "#workspace" },
      { label: "Як це працює", href: "#how" },
      { label: "Тарифи", href: "#plans" },
      { label: "Часті питання", href: links.faq },
    ],
  },
  {
    title: "Трейдерам",
    items: [
      { label: "Каталог проп-фірм", href: links.propFirms },
      { label: "Підбір проп-фірми", href: links.propMatch },
      { label: "Безкоштовні інструменти", href: links.tools },
    ],
  },
  {
    title: "Документи",
    items: [
      { label: "Правила користування", href: links.terms },
      { label: "Публічна оферта", href: links.offer },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative border-t border-ink/[0.07]">
      <div className="container-page grid gap-12 py-14 sm:py-16 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Logo />
          <p className="mt-4 max-w-[20rem] text-[14px] leading-relaxed text-muted">
            Журнал угод, аналітика і контроль проп-правил для трейдерів, які торгують за системою.
          </p>
        </div>
        <nav aria-label="Посилання у футері" className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:col-span-8">
          {COLS.map((c) => (
            <div key={c.title}>
              <h2 className="text-[13px] font-medium text-ink">{c.title}</h2>
              <ul className="mt-4 space-y-2.5">
                {c.items.map((it) => (
                  <li key={it.label}>
                    <a href={it.href} className="text-[14px] text-muted transition-colors hover:text-ink">
                      {it.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="container-page flex flex-col gap-4 border-t border-ink/[0.07] py-8 text-[12.5px] leading-relaxed text-muted md:flex-row md:justify-between">
        <p className="max-w-[46rem]">
          Traders Care є інструментом обліку та аналітики. Не є брокером і не дає інвестиційних порад. Торгівля пов'язана з
          високим ризиком втрати коштів. Сервіс недоступний резидентам підсанкційних країн.
        </p>
        <p className="shrink-0">© 2026 Traders Care</p>
      </div>
    </footer>
  );
}
