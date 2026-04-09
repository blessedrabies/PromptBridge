import type { A1111Params } from "@/lib/types/a1111";
import { DEFAULT_A1111_PARAMS } from "@/lib/types/a1111";

// Known metadata keys in the order they commonly appear
const KNOWN_KEYS = [
  "Steps",
  "Sampler",
  "Schedule type",
  "CFG scale",
  "Distilled CFG Scale",
  "Seed",
  "Size",
  "width",
  "height",
  "Model hash",
  "Model",
  "Denoising strength",
  "Version",
  "Beta schedule alpha",
  "Beta schedule beta",
  "Clip skip",
  "ENSD",
  "Hires upscale",
  "Hires steps",
  "Hires upscaler",
  "Hires resize",
  // Forge / Extension keys
  "Pad conds",
  "Lora hashes",
  "TI hashes",
  "Token merging ratio",
  "Token merging ratio hr",
  "ADetailer model",
  "ADetailer prompt",
  "ADetailer negative prompt",
  "ADetailer confidence",
  "ADetailer dilate erode",
  "ADetailer mask blur",
  "ADetailer denoising strength",
  "ADetailer inpaint only masked",
  "ADetailer inpaint padding",
  "FreeU Enabled",
  "FreeU B1",
  "FreeU B2",
  "FreeU S1",
  "FreeU S2",
  "Refiner",
  "Refiner switch at",
  "NGMS",
  "Dynamic thresholding enabled",
  "RNG",
  "VAE",
  "VAE hash",
];

function parseMetadataLine(line: string): Record<string, string> {
  const result: Record<string, string> = {};

  // Build regex that matches any known key followed by ': '
  const keyPattern = KNOWN_KEYS.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const regex = new RegExp(`(${keyPattern}):\\s*`, "g");

  const matches: { key: string; start: number; valueStart: number }[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(line)) !== null) {
    matches.push({
      key: match[1],
      start: match.index,
      valueStart: match.index + match[0].length,
    });
  }

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const nextStart = i + 1 < matches.length ? matches[i + 1].start : line.length;
    let value = line.slice(current.valueStart, nextStart).trim();
    // Remove trailing comma
    if (value.endsWith(",")) {
      value = value.slice(0, -1).trim();
    }
    result[current.key] = value;
  }

  return result;
}

export function parseA1111(input: string): { params: A1111Params; warnings: string[] } {
  const warnings: string[] = [];
  const trimmed = input.trim();

  if (!trimmed) {
    return { params: { ...DEFAULT_A1111_PARAMS }, warnings: ["Empty input"] };
  }

  let positivePrompt = "";
  let negativePrompt = "";
  let metadataLine = "";

  // Find metadata line: \nSteps: followed by a number (to avoid false positives in prompt text)
  function findStepsIndex(text: string): number {
    const match = text.match(/\nSteps:\s*\d/);
    return match ? text.indexOf(match[0]) : -1;
  }

  // Split by "Negative prompt:" line
  const negativeIndex = trimmed.indexOf("\nNegative prompt:");
  if (negativeIndex !== -1) {
    positivePrompt = trimmed.slice(0, negativeIndex).trim();
    const afterNegative = trimmed.slice(negativeIndex + "\nNegative prompt:".length).trim();

    // Find where metadata starts
    const stepsIndex = findStepsIndex(afterNegative);
    if (stepsIndex !== -1) {
      negativePrompt = afterNegative.slice(0, stepsIndex).trim();
      metadataLine = afterNegative.slice(stepsIndex + 1).trim();
    } else {
      negativePrompt = afterNegative;
    }
  } else {
    // No negative prompt — find Steps: line directly
    const stepsIndex = findStepsIndex(trimmed);
    if (stepsIndex !== -1) {
      positivePrompt = trimmed.slice(0, stepsIndex).trim();
      metadataLine = trimmed.slice(stepsIndex + 1).trim();
    } else if (trimmed.match(/^Steps:\s*\d/)) {
      metadataLine = trimmed;
    } else {
      positivePrompt = trimmed;
    }
  }

  // Collapse multi-line metadata into single line
  if (metadataLine) {
    metadataLine = metadataLine.replace(/\n/g, ", ");
  }

  const metadata = metadataLine ? parseMetadataLine(metadataLine) : {};

  // Parse size — supports both "Size: WxH" and "width: W, height: H" (Forge format)
  let width = DEFAULT_A1111_PARAMS.width;
  let height = DEFAULT_A1111_PARAMS.height;
  if (metadata["Size"]) {
    const sizeMatch = metadata["Size"].match(/(\d+)\s*x\s*(\d+)/);
    if (sizeMatch) {
      width = parseInt(sizeMatch[1], 10);
      height = parseInt(sizeMatch[2], 10);
    }
  } else if (metadata["width"] && metadata["height"]) {
    width = parseInt(metadata["width"], 10);
    height = parseInt(metadata["height"], 10);
  }

  // Build extra map for unknown keys
  const handledKeys = new Set([
    "Steps", "Sampler", "Schedule type", "CFG scale", "Distilled CFG Scale",
    "Seed", "Size", "width", "height", "Model hash", "Model", "Denoising strength", "Version",
    "Beta schedule alpha", "Beta schedule beta",
  ]);
  const extra: Record<string, string> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (!handledKeys.has(key)) {
      extra[key] = value;
    }
  }

  const params: A1111Params = {
    positivePrompt,
    negativePrompt,
    steps: metadata["Steps"] ? parseInt(metadata["Steps"], 10) : DEFAULT_A1111_PARAMS.steps,
    cfgScale: metadata["CFG scale"] ? parseFloat(metadata["CFG scale"]) : DEFAULT_A1111_PARAMS.cfgScale,
    sampler: metadata["Sampler"] ?? DEFAULT_A1111_PARAMS.sampler,
    seed: metadata["Seed"] ? parseInt(metadata["Seed"], 10) : DEFAULT_A1111_PARAMS.seed,
    width,
    height,
    model: metadata["Model"] ?? DEFAULT_A1111_PARAMS.model,
    modelHash: metadata["Model hash"],
    version: metadata["Version"],
    denoise: metadata["Denoising strength"] ? parseFloat(metadata["Denoising strength"]) : undefined,
    scheduleType: metadata["Schedule type"],
    distilledCfgScale: metadata["Distilled CFG Scale"] ? parseFloat(metadata["Distilled CFG Scale"]) : undefined,
    betaScheduleAlpha: metadata["Beta schedule alpha"] ? parseFloat(metadata["Beta schedule alpha"]) : undefined,
    betaScheduleBeta: metadata["Beta schedule beta"] ? parseFloat(metadata["Beta schedule beta"]) : undefined,
    extra,
  };

  if (!metadataLine) {
    warnings.push("No metadata found (Steps, Sampler, etc.). Using defaults.");
  }

  return { params, warnings };
}
