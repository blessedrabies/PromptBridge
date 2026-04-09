import type { A1111Params } from "@/lib/types/a1111";

const FLUX_INCOMPATIBLE_SAMPLERS = new Set([
  "ddim",
  "uni_pc",
  "lms",
  "dpmpp_2s_ancestral",
  "dpm_2",
  "dpm_2_ancestral",
]);

export function isFluxModel(params: A1111Params): boolean {
  // Definitive: model name contains "flux" as a word
  if (/\bflux\b/i.test(params.model)) return true;

  // Distilled CFG Scale is FLUX-specific
  if (params.distilledCfgScale !== undefined) return true;

  // Beta scheduler ALONE is not enough (available in Forge for non-FLUX models)
  // Only consider it FLUX if combined with other signals
  if (params.scheduleType === "Beta" && params.cfgScale <= 1) return true;

  return false;
}

export interface FluxValidationResult {
  isFlux: boolean;
  samplerReplaced: boolean;
  originalSampler?: string;
  warning?: string;
}

export function validateFluxCompatibility(
  params: A1111Params,
  comfySamplerName: string
): FluxValidationResult {
  const flux = isFluxModel(params);
  if (!flux) {
    return { isFlux: false, samplerReplaced: false };
  }

  if (FLUX_INCOMPATIBLE_SAMPLERS.has(comfySamplerName)) {
    return {
      isFlux: true,
      samplerReplaced: true,
      originalSampler: comfySamplerName,
      warning: `FLUX model detected. Sampler "${comfySamplerName}" is incompatible with FLUX — replaced with "euler".`,
    };
  }

  return { isFlux: true, samplerReplaced: false };
}
