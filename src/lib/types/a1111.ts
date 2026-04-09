export interface A1111Params {
  positivePrompt: string;
  negativePrompt: string;
  steps: number;
  cfgScale: number;
  sampler: string;
  seed: number;
  width: number;
  height: number;
  model: string;
  modelHash?: string;
  version?: string;
  denoise?: number;
  scheduleType?: string;
  distilledCfgScale?: number;
  betaScheduleAlpha?: number;
  betaScheduleBeta?: number;
  extra: Record<string, string>;
}

export const DEFAULT_A1111_PARAMS: A1111Params = {
  positivePrompt: "",
  negativePrompt: "",
  steps: 20,
  cfgScale: 7,
  sampler: "Euler",
  seed: -1,
  width: 512,
  height: 512,
  model: "model",
  extra: {},
};
