import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = "https://promptbridge.dev";

export const metadata: Metadata = {
  title: "PromptBridge - SD WebUI ↔ ComfyUI Converter",
  description:
    "Convert between Stable Diffusion WebUI (A1111/Forge) prompt text and ComfyUI workflow JSON. Free online tool for SD prompt conversion. Supports FLUX, SDXL, LoRA, and 20+ samplers.",
  keywords: [
    "stable diffusion",
    "comfyui",
    "a1111",
    "automatic1111",
    "forge",
    "prompt converter",
    "workflow json",
    "sd webui",
    "flux",
    "sdxl",
    "lora",
    "sampler",
    "txt2img",
    "image generation",
    "ai art",
  ],
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: "PromptBridge - SD WebUI ↔ ComfyUI Converter",
    description:
      "Convert SD WebUI (A1111/Forge) prompt text to ComfyUI workflow JSON and vice versa. Free online tool.",
    url: siteUrl,
    siteName: "PromptBridge",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "PromptBridge - SD WebUI ↔ ComfyUI Converter",
    description:
      "Convert SD WebUI prompt text to ComfyUI workflow JSON. Free online tool.",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: siteUrl,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
