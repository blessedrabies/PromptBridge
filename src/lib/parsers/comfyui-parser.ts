import type { A1111Params } from "@/lib/types/a1111";
import { DEFAULT_A1111_PARAMS } from "@/lib/types/a1111";
import type { ComfyUIWorkflow, ComfyUINode, ComfyUILink } from "@/lib/types/comfyui";
import { toA1111Sampler } from "@/lib/mappings/sampler-map";
import { toA1111Scheduler } from "@/lib/mappings/scheduler-map";

function findNodeById(nodes: ComfyUINode[], id: number): ComfyUINode | undefined {
  return nodes.find((n) => n.id === id);
}

function findSourceNodeByInputName(
  node: ComfyUINode,
  inputName: string,
  links: ComfyUILink[],
  nodes: ComfyUINode[]
): ComfyUINode | undefined {
  const input = node.inputs?.find((i) => i.name === inputName);
  if (!input?.link) return undefined;

  const link = links.find((l) => l[0] === input.link);
  if (!link) return undefined;

  return findNodeById(nodes, link[1]);
}

interface SamplerValues {
  seed: number;
  steps: number;
  cfg: number;
  samplerName: string;
  scheduler: string;
  denoise?: number;
}

function parseKSamplerValues(wv: unknown[]): SamplerValues {
  // KSampler widgets_values: [seed, control_after_generate, steps, cfg, sampler_name, scheduler, denoise]
  return {
    seed: typeof wv[0] === "number" ? wv[0] : -1,
    steps: typeof wv[2] === "number" ? wv[2] : DEFAULT_A1111_PARAMS.steps,
    cfg: typeof wv[3] === "number" ? wv[3] : DEFAULT_A1111_PARAMS.cfgScale,
    samplerName: typeof wv[4] === "string" ? wv[4] : "euler",
    scheduler: typeof wv[5] === "string" ? wv[5] : "normal",
    denoise: typeof wv[6] === "number" ? wv[6] : undefined,
  };
}

function parseKSamplerAdvancedValues(wv: unknown[]): SamplerValues {
  // KSamplerAdvanced widgets_values: [add_noise, noise_seed, control_after_generate, steps, cfg, sampler_name, scheduler, start_at_step, end_at_step, return_with_leftover_noise]
  return {
    seed: typeof wv[1] === "number" ? wv[1] : -1,
    steps: typeof wv[3] === "number" ? wv[3] : DEFAULT_A1111_PARAMS.steps,
    cfg: typeof wv[4] === "number" ? wv[4] : DEFAULT_A1111_PARAMS.cfgScale,
    samplerName: typeof wv[5] === "string" ? wv[5] : "euler",
    scheduler: typeof wv[6] === "string" ? wv[6] : "normal",
    denoise: undefined,
  };
}

export function parseComfyUI(input: string): { params: A1111Params; warnings: string[] } {
  const warnings: string[] = [];

  let workflow: ComfyUIWorkflow;
  try {
    const parsed = JSON.parse(input);

    // Detect API format: { "1": { "class_type": "...", "inputs": {...} }, ... }
    if (!parsed.nodes && !parsed.links && typeof parsed === "object") {
      const firstKey = Object.keys(parsed)[0];
      if (firstKey && parsed[firstKey]?.class_type) {
        workflow = convertApiToUiFormat(parsed);
        warnings.push("API format detected — converted to UI format for parsing.");
      } else {
        return {
          params: { ...DEFAULT_A1111_PARAMS },
          warnings: ["Invalid ComfyUI workflow: unrecognized format"],
        };
      }
    } else {
      workflow = parsed;
    }
  } catch {
    return {
      params: { ...DEFAULT_A1111_PARAMS },
      warnings: ["Invalid JSON input"],
    };
  }

  if (!workflow.nodes || !workflow.links) {
    return {
      params: { ...DEFAULT_A1111_PARAMS },
      warnings: ["Invalid ComfyUI workflow: missing nodes or links"],
    };
  }

  const { nodes, links } = workflow;

  // Find sampler node: KSampler or KSamplerAdvanced
  let samplerNode = nodes.find((n) => n.type === "KSampler");
  let isAdvanced = false;

  if (!samplerNode) {
    samplerNode = nodes.find((n) => n.type === "KSamplerAdvanced");
    isAdvanced = true;
  }

  if (!samplerNode) {
    // Check for multiple KSamplers and pick the one connected to a checkpoint
    const allSamplers = nodes.filter((n) => n.type === "KSampler" || n.type === "KSamplerAdvanced");
    if (allSamplers.length > 0) {
      samplerNode = allSamplers[0];
      isAdvanced = samplerNode.type === "KSamplerAdvanced";
      if (allSamplers.length > 1) {
        warnings.push(`Multiple sampler nodes found (${allSamplers.length}). Using the first one.`);
      }
    } else {
      warnings.push("No KSampler or KSamplerAdvanced node found in workflow.");
      return { params: { ...DEFAULT_A1111_PARAMS }, warnings };
    }
  }

  // Parse sampler values
  const wv = samplerNode.widgets_values ?? [];
  const samplerValues = isAdvanced ? parseKSamplerAdvancedValues(wv) : parseKSamplerValues(wv);

  // Find connected nodes via input names
  const checkpointNode = findSourceNodeByInputName(samplerNode, "model", links, nodes);
  const positiveNode = findSourceNodeByInputName(samplerNode, "positive", links, nodes);
  const negativeNode = findSourceNodeByInputName(samplerNode, "negative", links, nodes);
  const latentNode = findSourceNodeByInputName(samplerNode, "latent_image", links, nodes);

  // Extract model name
  let model = DEFAULT_A1111_PARAMS.model;
  if (checkpointNode?.widgets_values?.[0]) {
    if (checkpointNode.type === "CheckpointLoaderSimple" || checkpointNode.type === "CheckpointLoader") {
      model = String(checkpointNode.widgets_values[0]).replace(/\.(safetensors|ckpt|pt)$/, "");
    } else if (checkpointNode.type === "UNETLoader") {
      model = String(checkpointNode.widgets_values[0]).replace(/\.(safetensors|gguf|pt)$/, "");
    }
  }

  // Extract prompts
  const positivePrompt = positiveNode?.widgets_values?.[0]
    ? String(positiveNode.widgets_values[0])
    : "";
  const negativePrompt = negativeNode?.widgets_values?.[0]
    ? String(negativeNode.widgets_values[0])
    : "";

  // Extract size
  let width = DEFAULT_A1111_PARAMS.width;
  let height = DEFAULT_A1111_PARAMS.height;
  if (latentNode?.widgets_values) {
    if (latentNode.type === "EmptyLatentImage" || latentNode.type === "EmptySD3LatentImage") {
      width = typeof latentNode.widgets_values[0] === "number" ? latentNode.widgets_values[0] : width;
      height = typeof latentNode.widgets_values[1] === "number" ? latentNode.widgets_values[1] : height;
    }
  }

  // Map sampler/scheduler back to A1111 names
  const a1111Sampler = toA1111Sampler(samplerValues.samplerName, samplerValues.scheduler);
  const a1111Scheduler = toA1111Scheduler(samplerValues.scheduler);

  // Detect custom nodes and warn
  const standardTypes = new Set([
    "CheckpointLoaderSimple", "CheckpointLoader", "UNETLoader", "DualCLIPLoader", "VAELoader",
    "CLIPTextEncode", "CLIPTextEncodeFlux", "CLIPTextEncodeSDXL",
    "KSampler", "KSamplerAdvanced", "SamplerCustomAdvanced",
    "EmptyLatentImage", "EmptySD3LatentImage",
    "VAEDecode", "VAEEncode", "SaveImage", "PreviewImage", "LoadImage",
    "LoraLoader", "LoraLoaderModelOnly", "CLIPSetLastLayer",
    "LatentUpscale", "LatentUpscaleBy", "ImageUpscaleWithModel", "UpscaleModelLoader",
    "ConditioningCombine", "ConditioningConcat", "ConditioningSetArea",
    "ModelSamplingFlux", "FluxGuidance", "BasicGuider", "BasicScheduler", "RandomNoise",
  ]);
  const customNodes = nodes.filter((n) => !standardTypes.has(n.type)).map((n) => n.type);
  const uniqueCustom = [...new Set(customNodes)];
  if (uniqueCustom.length > 0) {
    warnings.push(`Custom nodes detected (not converted): ${uniqueCustom.join(", ")}`);
  }

  const params: A1111Params = {
    positivePrompt,
    negativePrompt,
    steps: samplerValues.steps,
    cfgScale: samplerValues.cfg,
    sampler: a1111Sampler,
    seed: samplerValues.seed,
    width,
    height,
    model,
    denoise: samplerValues.denoise !== undefined && samplerValues.denoise < 1 ? samplerValues.denoise : undefined,
    scheduleType: a1111Scheduler,
    extra: {},
  };

  return { params, warnings };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convertApiToUiFormat(apiWorkflow: Record<string, any>): ComfyUIWorkflow {
  const nodes: ComfyUINode[] = [];
  const links: ComfyUILink[] = [];
  let linkId = 1;

  // First pass: create nodes
  for (const [id, nodeData] of Object.entries(apiWorkflow)) {
    const numId = parseInt(id, 10);
    const widgets: unknown[] = [];

    // Collect non-link input values as widgets
    if (nodeData.inputs) {
      for (const [, value] of Object.entries(nodeData.inputs)) {
        if (!Array.isArray(value)) {
          widgets.push(value);
        }
      }
    }

    nodes.push({
      id: numId,
      type: nodeData.class_type ?? "Unknown",
      pos: [numId * 300, 200],
      size: [300, 150],
      inputs: [],
      outputs: [],
      widgets_values: widgets,
    });
  }

  // Second pass: build links from input references [node_id, slot]
  for (const [id, nodeData] of Object.entries(apiWorkflow)) {
    const targetId = parseInt(id, 10);
    const targetNode = nodes.find((n) => n.id === targetId);
    if (!targetNode || !nodeData.inputs) continue;

    let inputSlot = 0;
    for (const [inputName, value] of Object.entries(nodeData.inputs)) {
      if (Array.isArray(value) && value.length === 2) {
        const [sourceId, sourceSlot] = value as [number, number];
        const lid = linkId++;
        links.push([lid, sourceId, sourceSlot, targetId, inputSlot, "?"]);

        targetNode.inputs!.push({ name: inputName, type: "*", link: lid });
        inputSlot++;
      }
    }
  }

  // Set output links on source nodes
  for (const link of links) {
    const [lid, sourceId, sourceSlot] = link;
    const sourceNode = nodes.find((n) => n.id === sourceId);
    if (sourceNode) {
      while ((sourceNode.outputs?.length ?? 0) <= sourceSlot) {
        sourceNode.outputs!.push({ name: `output_${sourceNode.outputs!.length}`, type: "*", links: [] });
      }
      (sourceNode.outputs![sourceSlot].links as number[]).push(lid);
    }
  }

  return {
    last_node_id: Math.max(...nodes.map((n) => n.id)),
    last_link_id: linkId - 1,
    nodes,
    links,
    groups: [],
    config: {},
    extra: {},
    version: 0.4,
  };
}
