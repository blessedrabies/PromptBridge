import type { ConversionResult } from "@/lib/types/converter";
import { parseComfyUI } from "@/lib/parsers/comfyui-parser";
import { generateA1111 } from "@/lib/generators/a1111-generator";

export function convertComfyUIToA1111(input: string): ConversionResult {
  try {
    const { params, warnings } = parseComfyUI(input);
    const output = generateA1111(params);

    return {
      success: true,
      output,
      params,
      warnings,
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
