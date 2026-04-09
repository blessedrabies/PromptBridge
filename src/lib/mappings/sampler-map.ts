interface ComfyUISamplerInfo {
  sampler: string;
  scheduler?: string;
}

const A1111_TO_COMFYUI: Record<string, ComfyUISamplerInfo> = {
  "Euler": { sampler: "euler" },
  "Euler a": { sampler: "euler_ancestral" },
  "DPM++ 2M": { sampler: "dpmpp_2m" },
  "DPM++ 2M Karras": { sampler: "dpmpp_2m", scheduler: "karras" },
  "DPM++ 2M SDE": { sampler: "dpmpp_2m_sde" },
  "DPM++ 2M SDE Karras": { sampler: "dpmpp_2m_sde", scheduler: "karras" },
  "DPM++ 2M SDE Exponential": { sampler: "dpmpp_2m_sde", scheduler: "exponential" },
  "DPM++ 2S a": { sampler: "dpmpp_2s_ancestral" },
  "DPM++ 2S a Karras": { sampler: "dpmpp_2s_ancestral", scheduler: "karras" },
  "DPM++ 3M SDE": { sampler: "dpmpp_3m_sde" },
  "DPM++ 3M SDE Karras": { sampler: "dpmpp_3m_sde", scheduler: "karras" },
  "DPM++ 3M SDE Exponential": { sampler: "dpmpp_3m_sde", scheduler: "exponential" },
  "DPM++ SDE": { sampler: "dpmpp_sde" },
  "DPM++ SDE Karras": { sampler: "dpmpp_sde", scheduler: "karras" },
  "DDIM": { sampler: "ddim" },
  "DDPM": { sampler: "ddpm" },
  "UniPC": { sampler: "uni_pc" },
  "Heun": { sampler: "heun" },
  "LMS": { sampler: "lms" },
  "LMS Karras": { sampler: "lms", scheduler: "karras" },
  "DPM2": { sampler: "dpm_2" },
  "DPM2 Karras": { sampler: "dpm_2", scheduler: "karras" },
  "DPM2 a": { sampler: "dpm_2_ancestral" },
  "DPM2 a Karras": { sampler: "dpm_2_ancestral", scheduler: "karras" },
  "DPM adaptive": { sampler: "dpm_adaptive" },
  "DPM fast": { sampler: "dpm_fast" },
  "Restart": { sampler: "restart" },
  "PLMS": { sampler: "plms" },
};

// Build reverse map: "sampler|scheduler" -> A1111 name
const COMFYUI_TO_A1111 = new Map<string, string>();
for (const [a1111Name, info] of Object.entries(A1111_TO_COMFYUI)) {
  const key = `${info.sampler}|${info.scheduler ?? ""}`;
  // Prefer non-karras variant as default (first match wins)
  if (!COMFYUI_TO_A1111.has(key)) {
    COMFYUI_TO_A1111.set(key, a1111Name);
  }
}

export function toComfyUISampler(a1111Sampler: string): ComfyUISamplerInfo {
  return A1111_TO_COMFYUI[a1111Sampler] ?? { sampler: a1111Sampler.toLowerCase().replace(/\s+/g, "_") };
}

export function toA1111Sampler(comfySampler: string, scheduler?: string): string {
  // Try exact match with scheduler
  if (scheduler && scheduler !== "normal") {
    const withScheduler = COMFYUI_TO_A1111.get(`${comfySampler}|${scheduler}`);
    if (withScheduler) return withScheduler;
  }

  // Try without scheduler
  const withoutScheduler = COMFYUI_TO_A1111.get(`${comfySampler}|`);
  if (withoutScheduler) return withoutScheduler;

  return comfySampler;
}

export function getAllA1111Samplers(): string[] {
  return Object.keys(A1111_TO_COMFYUI);
}
