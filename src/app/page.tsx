import { Footer } from "@/components/site/Footer";
import { Nav } from "@/components/site/Nav";
import { Assistant } from "@/components/sections/Assistant";
import { DeviationCost } from "@/components/sections/DeviationCost";
import { Faq } from "@/components/sections/Faq";
import { FinalCta } from "@/components/sections/FinalCta";
import { FreeTools } from "@/components/sections/FreeTools";
import { Hero } from "@/components/sections/Hero";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { Manifesto } from "@/components/sections/Manifesto";
import { Platforms } from "@/components/sections/Platforms";
import { Pricing } from "@/components/sections/Pricing";
import { PropRules } from "@/components/sections/PropRules";
import { Verified } from "@/components/sections/Verified";
import { Workspace } from "@/components/sections/Workspace";

export default function Page() {
  return (
    <>
      <a
        href="#top"
        className="sr-only z-overlay rounded-full bg-accent px-4 py-2 text-accent-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Перейти до вмісту
      </a>
      <Nav />
      <main id="top">
        <Hero />
        <Platforms />
        <Manifesto />
        <DeviationCost />
        <HowItWorks />
        <Workspace />
        <PropRules />
        <Assistant />
        <Verified />
        <FreeTools />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
