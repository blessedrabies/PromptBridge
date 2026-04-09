"use client";

import { useConverter } from "@/hooks/use-converter";
import { DirectionToggle } from "./direction-toggle";
import { InputPanel } from "./input-panel";
import { OutputPanel } from "./output-panel";
import { ParameterPreview } from "./parameter-preview";
import { ActionButtons } from "./action-buttons";
import { Separator } from "@/components/ui/separator";

export function ConverterPanel() {
  const { direction, input, setInput, result, convert, clear, toggleDirection } = useConverter();

  return (
    <section className="space-y-6">
      {/* Direction Toggle */}
      <div className="flex justify-center">
        <DirectionToggle direction={direction} onToggle={toggleDirection} />
      </div>

      {/* Two-panel layout */}
      <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
        <InputPanel
          direction={direction}
          value={input}
          onChange={setInput}
          onConvert={convert}
        />
        <OutputPanel
          direction={direction}
          value={result?.output ?? ""}
        />
      </div>

      {/* Action buttons */}
      {result?.output && (
        <div className="flex justify-end">
          <ActionButtons output={result.output} direction={direction} onClear={clear} />
        </div>
      )}

      {/* Errors */}
      {result?.errors && result.errors.length > 0 && (
        <div className="space-y-1">
          {result.errors.map((err, i) => (
            <div key={i} className="rounded-md border border-red-800/50 bg-red-950/30 px-3 py-2 text-sm text-red-300">
              {err}
            </div>
          ))}
        </div>
      )}

      {/* Parameter preview */}
      {result?.params && (
        <>
          <Separator className="bg-zinc-800" />
          <ParameterPreview params={result.params} warnings={result.warnings} />
        </>
      )}
    </section>
  );
}
