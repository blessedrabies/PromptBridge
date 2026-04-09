"use client";

import { Textarea } from "@/components/ui/textarea";
import type { ConversionDirection } from "@/lib/types/converter";

interface OutputPanelProps {
  direction: ConversionDirection;
  value: string;
}

export function OutputPanel({ direction, value }: OutputPanelProps) {
  const isJsonOutput = direction === "a1111-to-comfyui";
  const label = isJsonOutput ? "ComfyUI Workflow JSON" : "SD WebUI Prompt Text";

  return (
    <div className="flex flex-1 flex-col gap-3">
      <h3 className="text-sm font-semibold text-zinc-50">{label}</h3>
      <Textarea
        value={value}
        readOnly
        placeholder="Conversion result will appear here..."
        className="h-[300px] !field-sizing-fixed resize-none overflow-auto border-zinc-800 bg-zinc-950 font-mono text-sm text-zinc-300 placeholder:text-zinc-600"
      />
    </div>
  );
}
