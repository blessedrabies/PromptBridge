import { StatsBanner } from "./stats-banner";

export function HeroSection() {
  return (
    <section className="py-16 text-center">
      <h1 className="text-4xl font-semibold tracking-tight text-zinc-50 sm:text-5xl">
        PromptBridge
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-lg text-zinc-400">
        Convert between SD WebUI (A1111/Forge) prompt text and ComfyUI workflow JSON.
      </p>
      <div className="mt-6">
        <StatsBanner />
      </div>
    </section>
  );
}
