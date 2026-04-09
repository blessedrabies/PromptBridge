import type { A1111Params } from "./a1111";

export type ConversionDirection = "a1111-to-comfyui" | "comfyui-to-a1111";

export interface ConversionResult {
  success: boolean;
  output: string;
  params: A1111Params | null;
  warnings: string[];
  errors: string[];
}
