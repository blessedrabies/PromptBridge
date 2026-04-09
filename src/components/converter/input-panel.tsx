"use client";

import { useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { ConversionDirection } from "@/lib/types/converter";

interface InputPanelProps {
  direction: ConversionDirection;
  value: string;
  onChange: (value: string) => void;
  onConvert: () => void;
}

export function InputPanel({ direction, value, onChange, onConvert }: InputPanelProps) {
  const isA1111Input = direction === "a1111-to-comfyui";
  const label = isA1111Input ? "SD WebUI Prompt Text" : "ComfyUI Workflow JSON";
  const placeholder = isA1111Input
    ? "CivitAI image → Generation data → COPY ALL → Paste here\n\nExample:\nbeautiful landscape, mountains\nNegative prompt: ugly, blurry\nSteps: 20, Sampler: Euler, CFG scale: 7, Seed: 12345, Size: 512x512, Model: sd_v1-5"
    : "Paste your ComfyUI workflow JSON here...";

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result;
        if (typeof text === "string") {
          onChange(text);
        }
      };
      reader.readAsText(file);
      e.target.value = "";
    },
    [onChange]
  );

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-50">{label}</h3>
        {!isA1111Input && (
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileUpload}
            />
            <span className="text-xs text-zinc-400 transition-colors hover:text-zinc-50">
              Upload JSON
            </span>
          </label>
        )}
      </div>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-[300px] !field-sizing-fixed resize-none overflow-auto border-zinc-800 bg-zinc-950 font-mono text-sm text-zinc-300 placeholder:text-zinc-600 focus:ring-1 focus:ring-zinc-400"
      />
      <Button
        onClick={onConvert}
        disabled={!value.trim()}
        className="w-full bg-zinc-50 text-zinc-900 hover:bg-zinc-200 transition-colors disabled:opacity-40"
      >
        Convert
      </Button>
    </div>
  );
}
