export interface LoraInfo {
  name: string;
  weight: number;
  clipWeight?: number; // if specified separately like <lora:name:0.8:0.5>
}

/**
 * Extract LoRA tags from prompt text and return cleaned prompt + LoRA list
 * Supports: <lora:name:weight>, <lora:name:model_weight:clip_weight>
 */
export function extractLoras(prompt: string): { cleanedPrompt: string; loras: LoraInfo[] } {
  const loras: LoraInfo[] = [];
  const loraRegex = /<lora:([^:>]+):([0-9.]+)(?::([0-9.]+))?>/g;

  let match: RegExpExecArray | null;
  while ((match = loraRegex.exec(prompt)) !== null) {
    const weight = parseFloat(match[2]);
    const clipWeight = match[3] ? parseFloat(match[3]) : undefined;
    loras.push({
      name: match[1],
      weight,
      clipWeight,
    });
  }

  const cleanedPrompt = prompt.replace(/<lora:[^>]+>/g, "").replace(/\s{2,}/g, " ").trim();

  return { cleanedPrompt, loras };
}
