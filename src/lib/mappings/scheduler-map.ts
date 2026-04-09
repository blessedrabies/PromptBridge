const A1111_TO_COMFYUI_SCHEDULER: Record<string, string> = {
  "Normal": "normal",
  "Karras": "karras",
  "Beta": "beta",
  "Simple": "simple",
  "Exponential": "exponential",
  "SGM Uniform": "sgm_uniform",
  "Align Your Steps": "align_your_steps",
  "Automatic": "normal",
};

const COMFYUI_TO_A1111_SCHEDULER: Record<string, string> = {};
for (const [a1111, comfy] of Object.entries(A1111_TO_COMFYUI_SCHEDULER)) {
  if (a1111 !== "Automatic") {
    COMFYUI_TO_A1111_SCHEDULER[comfy] = a1111;
  }
}

export function toComfyUIScheduler(a1111Scheduler: string | undefined): string {
  if (!a1111Scheduler) return "normal";
  return A1111_TO_COMFYUI_SCHEDULER[a1111Scheduler] ?? a1111Scheduler.toLowerCase();
}

export function toA1111Scheduler(comfyScheduler: string): string | undefined {
  if (comfyScheduler === "normal") return undefined;
  return COMFYUI_TO_A1111_SCHEDULER[comfyScheduler] ?? comfyScheduler;
}
