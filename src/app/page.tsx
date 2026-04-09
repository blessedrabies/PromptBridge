import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { HeroSection } from "@/components/hero/hero-section";
import { ConverterPanel } from "@/components/converter/converter-panel";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16">
        <HeroSection />
        <ConverterPanel />
      </main>
      <Footer />
    </>
  );
}
