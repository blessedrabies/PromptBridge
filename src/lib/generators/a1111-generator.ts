import type { A1111Params } from "@/lib/types/a1111";

export function generateA1111(params: A1111Params): string {
  const lines: string[] = [];

  // Positive prompt
  lines.push(params.positivePrompt);

  // Negative prompt (only if present)
  if (params.negativePrompt) {
    lines.push(`Negative prompt: ${params.negativePrompt}`);
  }

  // Metadata
  const meta: string[] = [];
  meta.push(`Steps: ${params.steps}`);
  meta.push(`Sampler: ${params.sampler}`);
  if (params.scheduleType) {
    meta.push(`Schedule type: ${params.scheduleType}`);
  }
  meta.push(`CFG scale: ${params.cfgScale}`);
  if (params.distilledCfgScale !== undefined) {
    meta.push(`Distilled CFG Scale: ${params.distilledCfgScale}`);
  }
  meta.push(`Seed: ${params.seed}`);
  meta.push(`Size: ${params.width}x${params.height}`);
  if (params.modelHash) {
    meta.push(`Model hash: ${params.modelHash}`);
  }
  meta.push(`Model: ${params.model}`);
  if (params.denoise !== undefined) {
    meta.push(`Denoising strength: ${params.denoise}`);
  }
  if (params.betaScheduleAlpha !== undefined) {
    meta.push(`Beta schedule alpha: ${params.betaScheduleAlpha}`);
  }
  if (params.betaScheduleBeta !== undefined) {
    meta.push(`Beta schedule beta: ${params.betaScheduleBeta}`);
  }
  if (params.version) {
    meta.push(`Version: ${params.version}`);
  }

  // Extra params
  for (const [key, value] of Object.entries(params.extra)) {
    meta.push(`${key}: ${value}`);
  }

  lines.push(meta.join(", "));

  return lines.join("\n");
}
