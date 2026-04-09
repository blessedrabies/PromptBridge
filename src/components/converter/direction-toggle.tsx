"use client";

import { Button } from "@/components/ui/button";
import type { ConversionDirection } from "@/lib/types/converter";

interface DirectionToggleProps {
  direction: ConversionDirection;
  onToggle: () => void;
}

export function DirectionToggle({ direction, onToggle }: DirectionToggleProps) {
  const isA1111ToComfy = direction === "a1111-to-comfyui";

  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onToggle}
        className="border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50 transition-colors"
      >
        {isA1111ToComfy ? (
          <span className="flex items-center gap-1.5">
            <span className="text-xs font-mono">SD WebUI</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-zinc-400">
              <path d="M3 8h10M10 5l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-xs font-mono">ComfyUI</span>
          </span>
        ) : (
          <span className="flex items-center gap-1.5">
            <span className="text-xs font-mono">ComfyUI</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-zinc-400">
              <path d="M3 8h10M10 5l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-xs font-mono">SD WebUI</span>
          </span>
        )}
      </Button>
    </div>
  );
}
