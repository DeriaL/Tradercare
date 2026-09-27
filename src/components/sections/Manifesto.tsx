"use client";

import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useRef } from "react";

// The three mistakes the next section puts a price on light up in the loss colour.
const TEXT: { t: string; mark?: boolean }[] = [
  { t: "Ти знаєш свою систему. Проблема не в ній." },
  { t: "Стоп, зсунутий «лише цього разу».", mark: true },
  { t: "Вхід без сетапу, бо рух уже пішов.", mark: true },
  { t: "Реванш після двох мінусів.", mark: true },
  { t: "Кожне таке рішення має ціну. Вона накопичується тихо, поки її ніхто не рахує." },
];

const WORDS = TEXT.flatMap((s) => s.t.split(" ").map((w) => ({ w, mark: !!s.mark })));

/** A paragraph that is read as you scroll: each word lights up in turn. */
export function Manifesto() {
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.82", "end 0.45"] });

  return (
    <section aria-label="Навіщо Traders Care" className="relative py-28 sm:py-40">
      <div className="container-page">
        <p
          ref={ref}
          className="max-w-[62rem] text-[clamp(1.75rem,0.95rem+2.7vw,3.35rem)] font-medium leading-[1.2] tracking-[-0.028em] text-ink"
        >
          {WORDS.map((x, i) => (
            <Word key={i} p={scrollYProgress} range={[i / WORDS.length, (i + 1) / WORDS.length]} mark={x.mark}>
              {x.w}
            </Word>
          ))}
        </p>
      </div>
    </section>
  );
}

function Word({ p, range, mark, children }: { p: MotionValue<number>; range: [number, number]; mark: boolean; children: string }) {
  const opacity = useTransform(p, range, [0.14, 1]);
  return (
    <>
      <motion.span style={{ opacity }} className={mark ? "text-loss motion-reduce:!opacity-100" : "motion-reduce:!opacity-100"}>
        {children}
      </motion.span>{" "}
    </>
  );
}
