"use client";

import { Button } from "@/components/ui/button";
import { useClipboard } from "@/hooks/use-clipboard";
import type { ConversionDirection } from "@/lib/types/converter";

interface ActionButtonsProps {
  output: string;
  direction: ConversionDirection;
  onClear: () => void;
}

export function ActionButtons({ output, direction, onClear }: ActionButtonsProps) {
  const { copied, copy } = useClipboard();

  const handleDownload = () => {
    if (!output) return;

    const isJson = direction === "a1111-to-comfyui";
    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}h${String(now.getMinutes()).padStart(2, "0")}m${String(now.getSeconds()).padStart(2, "0")}s`;
    const filename = isJson ? `workflow_${timestamp}.json` : `prompt_${timestamp}.txt`;
    const mimeType = isJson ? "application/json" : "text/plain";

    const blob = new Blob([output], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => copy(output)}
        disabled={!output}
        className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50 transition-colors disabled:opacity-40"
      >
        {copied ? "Copied!" : "Copy"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleDownload}
        disabled={!output}
        className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50 transition-colors disabled:opacity-40"
      >
        Download
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onClear}
        className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50 transition-colors"
      >
        Clear
      </Button>
    </div>
  );
}
