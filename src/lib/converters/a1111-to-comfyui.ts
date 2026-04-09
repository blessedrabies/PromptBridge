import type { ConversionResult } from "@/lib/types/converter";
import { parseA1111 } from "@/lib/parsers/a1111-parser";
import { generateComfyUI } from "@/lib/generators/comfyui-generator";

export function convertA1111ToComfyUI(input: string): ConversionResult {
  try {
    const { params, warnings: parseWarnings } = parseA1111(input);
    const { workflow, warnings: genWarnings } = generateComfyUI(params);

    const extraWarnings: string[] = [];

    // BREAK keyword warning
    if (params.positivePrompt.includes("BREAK") || params.negativePrompt.includes("BREAK")) {
      extraWarnings.push(
        'BREAK keyword detected. ComfyUI does not support BREAK — prompt conditioning may differ from SD WebUI.'
      );
    }

    // SDXL model detection — warn if resolution looks wrong
    const isSDXL = /\b(xl|sdxl)\b/i.test(params.model) || /\bpony\b/i.test(params.model);
    if (isSDXL && params.width * params.height < 800 * 800) {
      extraWarnings.push(
        `SDXL/Pony model detected but resolution is ${params.width}x${params.height}. SDXL models work best at 1024x1024 or similar (1MP+). Consider adjusting the EmptyLatentImage size in ComfyUI.`
      );
    }

    // SD3 model detection
    if (/\bsd3\b/i.test(params.model)) {
      extraWarnings.push(
        'SD3 model detected. SD3 may require specialized nodes (CLIPTextEncodeSD3, ModelSamplingSD3). The generated workflow uses a standard pipeline — manual adjustment may be needed.'
      );
    }

    // Hires fix warning
    if (params.extra["Hires upscale"] || params.extra["Hires steps"] || params.extra["Hires upscaler"]) {
      extraWarnings.push(
        `Hires fix parameters detected (upscale: ${params.extra["Hires upscale"] ?? "?"}, steps: ${params.extra["Hires steps"] ?? "?"}, upscaler: ${params.extra["Hires upscaler"] ?? "?"}). Hires fix is not converted — add upscaling nodes manually in ComfyUI.`
      );
    }

    // Clip skip warning
    if (params.extra["Clip skip"] && params.extra["Clip skip"] !== "1") {
      extraWarnings.push(
        `Clip skip: ${params.extra["Clip skip"]} detected. Add a CLIPSetLastLayer node in ComfyUI and set skip to -${params.extra["Clip skip"]}.`
      );
    }

    return {
      success: true,
      output: JSON.stringify(workflow, null, 2),
      params,
      warnings: [...parseWarnings, ...genWarnings, ...extraWarnings],
      errors: [],
    };
  } catch (error) {
    return {
      success: false,
      output: "",
      params: null,
      warnings: [],
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}
