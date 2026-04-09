"use client";

import type { A1111Params } from "@/lib/types/a1111";
import { Badge } from "@/components/ui/badge";
import { isFluxModel } from "@/lib/validators/flux-validator";

interface ParameterPreviewProps {
  params: A1111Params | null;
  warnings: string[];
}

function ParamCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2">
      <div className="text-xs text-zinc-400">{label}</div>
      <div className="mt-0.5 truncate font-mono text-sm text-zinc-50">{value}</div>
    </div>
  );
}

export function ParameterPreview({ params, warnings }: ParameterPreviewProps) {
  if (!params) return null;

  const flux = isFluxModel(params);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-zinc-50">Parameters</h3>
        {flux && (
          <Badge variant="secondary" className="bg-amber-900/50 text-amber-300 text-xs">
            FLUX
          </Badge>
        )}
      </div>

      {warnings.length > 0 && (
        <div className="space-y-1">
          {warnings.map((w, i) => (
            <div key={i} className="rounded-md border border-amber-800/50 bg-amber-950/30 px-3 py-2 text-xs text-amber-300">
              {w}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        <ParamCard label="Model" value={params.model} />
        <ParamCard label="Steps" value={params.steps} />
        <ParamCard label="CFG Scale" value={params.cfgScale} />
        <ParamCard label="Sampler" value={params.sampler} />
        <ParamCard label="Seed" value={params.seed} />
        <ParamCard label="Size" value={`${params.width}x${params.height}`} />
        {params.scheduleType && <ParamCard label="Schedule" value={params.scheduleType} />}
        {params.distilledCfgScale !== undefined && (
          <ParamCard label="Distilled CFG" value={params.distilledCfgScale} />
        )}
      </div>

      {(params.positivePrompt || params.negativePrompt) && (
        <div className="space-y-2">
          {params.positivePrompt && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
              <div className="text-xs text-zinc-400">Positive Prompt</div>
              <div className="mt-1 text-sm text-zinc-300 leading-relaxed break-words">
                {params.positivePrompt}
              </div>
            </div>
          )}
          {params.negativePrompt && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
              <div className="text-xs text-zinc-400">Negative Prompt</div>
              <div className="mt-1 text-sm text-zinc-300 leading-relaxed break-words">
                {params.negativePrompt}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
