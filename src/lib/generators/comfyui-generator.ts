import type { A1111Params } from "@/lib/types/a1111";
import type { ComfyUIWorkflow, ComfyUINode, ComfyUILink } from "@/lib/types/comfyui";
import { toComfyUISampler } from "@/lib/mappings/sampler-map";
import { toComfyUIScheduler } from "@/lib/mappings/scheduler-map";
import { validateFluxCompatibility, isFluxModel } from "@/lib/validators/flux-validator";
import { extractLoras, type LoraInfo } from "@/lib/utils/lora-extractor";

interface GeneratorResult {
  workflow: ComfyUIWorkflow;
  warnings: string[];
}

// Helper to build LoraLoader chain between checkpoint and text encoders
interface LoraChainResult {
  nodes: ComfyUINode[];
  links: ComfyUILink[];
  finalModelLinkId: number; // link id carrying MODEL out of last lora
  finalClipLinkId: number;  // link id carrying CLIP out of last lora
  nextNodeId: number;
  nextLinkId: number;
}

function buildLoraChain(
  loras: LoraInfo[],
  checkpointNodeId: number,
  checkpointModelSlot: number,
  checkpointClipSlot: number,
  startNodeId: number,
  startLinkId: number
): LoraChainResult {
  if (loras.length === 0) {
    // No loras — direct links from checkpoint
    const modelLinkId = startLinkId;
    const clipLinkId = startLinkId + 1;
    return {
      nodes: [],
      links: [],
      finalModelLinkId: modelLinkId,
      finalClipLinkId: clipLinkId,
      nextNodeId: startNodeId,
      nextLinkId: startLinkId,
    };
  }

  const nodes: ComfyUINode[] = [];
  const links: ComfyUILink[] = [];
  let nodeId = startNodeId;
  let linkId = startLinkId;

  // First LoRA gets input from checkpoint
  let prevModelSourceNodeId = checkpointNodeId;
  let prevModelSourceSlot = checkpointModelSlot;
  let prevClipSourceNodeId = checkpointNodeId;
  let prevClipSourceSlot = checkpointClipSlot;

  for (let i = 0; i < loras.length; i++) {
    const lora = loras[i];
    const loraNodeId = nodeId++;

    // Input links from previous node
    const modelInLinkId = linkId++;
    const clipInLinkId = linkId++;
    // Output link ids (will be used by next node or final consumers)
    const modelOutLinkId = linkId++;
    const clipOutLinkId = linkId++;

    // Links: prev → this lora inputs
    links.push([modelInLinkId, prevModelSourceNodeId, prevModelSourceSlot, loraNodeId, 0, "MODEL"]);
    links.push([clipInLinkId, prevClipSourceNodeId, prevClipSourceSlot, loraNodeId, 1, "CLIP"]);

    const clipWeight = lora.clipWeight ?? lora.weight;

    nodes.push({
      id: loraNodeId,
      type: "LoraLoader",
      pos: [50 + i * 350, 500 + i * 50],
      size: [300, 130],
      inputs: [
        { name: "model", type: "MODEL", link: modelInLinkId },
        { name: "clip", type: "CLIP", link: clipInLinkId },
      ],
      outputs: [
        { name: "MODEL", type: "MODEL", links: [modelOutLinkId] },
        { name: "CLIP", type: "CLIP", links: [clipOutLinkId] },
      ],
      widgets_values: [`${lora.name}.safetensors`, lora.weight, clipWeight],
    });

    prevModelSourceNodeId = loraNodeId;
    prevModelSourceSlot = 0;
    prevClipSourceNodeId = loraNodeId;
    prevClipSourceSlot = 1;
  }

  // The last model/clip output link ids
  const lastLoraIdx = loras.length - 1;
  const finalModelLinkId = links[lastLoraIdx * 4 + 2][0]; // 3rd link per lora iteration
  const finalClipLinkId = links[lastLoraIdx * 4 + 3][0];  // 4th link per lora iteration

  return {
    nodes,
    links,
    finalModelLinkId,
    finalClipLinkId,
    nextNodeId: nodeId,
    nextLinkId: linkId,
  };
}

export function generateComfyUI(params: A1111Params): GeneratorResult {
  if (isFluxModel(params)) {
    return generateFluxWorkflow(params);
  }
  return generateStandardWorkflow(params);
}

function generateFluxWorkflow(params: A1111Params): GeneratorResult {
  const warnings: string[] = [];
  warnings.push("FLUX model detected — using FLUX-optimized pipeline (cfg=1, euler, simple, no negative prompt).");

  // Extract LoRAs
  const { cleanedPrompt, loras } = extractLoras(params.positivePrompt);

  const denoise = params.denoise ?? 1.0;
  const samplerName = "euler";
  const scheduler = "simple";
  const cfg = 1;

  // Build node graph dynamically
  const nodes: ComfyUINode[] = [];
  const allLinks: ComfyUILink[] = [];
  let nodeId = 1;
  let linkId = 1;

  // 1. CheckpointLoaderSimple
  const checkpointId = nodeId++;
  nodes.push({
    id: checkpointId,
    type: "CheckpointLoaderSimple",
    pos: [50, 100],
    size: [300, 100],
    outputs: [
      { name: "MODEL", type: "MODEL", links: [] },
      { name: "CLIP", type: "CLIP", links: [] },
      { name: "VAE", type: "VAE", links: [] },
    ],
    widgets_values: [`${params.model}.safetensors`],
  });

  // 2. LoRA chain (if any)
  let modelSourceNodeId = checkpointId;
  let modelSourceSlot = 0;
  let clipSourceNodeId = checkpointId;
  let clipSourceSlot = 1;

  if (loras.length > 0) {
    const loraChain = buildLoraChain(loras, checkpointId, 0, 1, nodeId, linkId);
    nodes.push(...loraChain.nodes);
    allLinks.push(...loraChain.links);
    nodeId = loraChain.nextNodeId;
    linkId = loraChain.nextLinkId;

    const lastLoraNode = loraChain.nodes[loraChain.nodes.length - 1];
    modelSourceNodeId = lastLoraNode.id;
    modelSourceSlot = 0;
    clipSourceNodeId = lastLoraNode.id;
    clipSourceSlot = 1;
  }

  // 3. Positive CLIPTextEncode
  const posClipId = nodeId++;
  const clipToPosLinkId = linkId++;
  allLinks.push([clipToPosLinkId, clipSourceNodeId, clipSourceSlot, posClipId, 0, "CLIP"]);
  nodes.push({
    id: posClipId,
    type: "CLIPTextEncode",
    pos: [480, 50],
    size: [400, 200],
    inputs: [{ name: "clip", type: "CLIP", link: clipToPosLinkId }],
    outputs: [{ name: "CONDITIONING", type: "CONDITIONING", links: [] }],
    widgets_values: [cleanedPrompt],
  });

  // 4. Negative CLIPTextEncode (empty for FLUX, connected to same CLIP source)
  const negClipId = nodeId++;
  const clipToNegLinkId = linkId++;
  allLinks.push([clipToNegLinkId, clipSourceNodeId, clipSourceSlot, negClipId, 0, "CLIP"]);
  nodes.push({
    id: negClipId,
    type: "CLIPTextEncode",
    pos: [480, 300],
    size: [400, 100],
    inputs: [{ name: "clip", type: "CLIP", link: clipToNegLinkId }],
    outputs: [{ name: "CONDITIONING", type: "CONDITIONING", links: [] }],
    widgets_values: [""],
  });

  // 5. EmptyLatentImage
  const latentId = nodeId++;
  nodes.push({
    id: latentId,
    type: "EmptyLatentImage",
    pos: [50, 350],
    size: [300, 130],
    outputs: [{ name: "LATENT", type: "LATENT", links: [] }],
    widgets_values: [params.width, params.height, 1],
  });

  // 6. KSampler
  const ksamplerId = nodeId++;
  const modelToKsLinkId = linkId++;
  const posToKsLinkId = linkId++;
  const negToKsLinkId = linkId++;
  const latentToKsLinkId = linkId++;
  allLinks.push([modelToKsLinkId, modelSourceNodeId, modelSourceSlot, ksamplerId, 0, "MODEL"]);
  allLinks.push([posToKsLinkId, posClipId, 0, ksamplerId, 1, "CONDITIONING"]);
  allLinks.push([negToKsLinkId, negClipId, 0, ksamplerId, 2, "CONDITIONING"]);
  allLinks.push([latentToKsLinkId, latentId, 0, ksamplerId, 3, "LATENT"]);
  nodes.push({
    id: ksamplerId,
    type: "KSampler",
    pos: [950, 100],
    size: [350, 450],
    inputs: [
      { name: "model", type: "MODEL", link: modelToKsLinkId },
      { name: "positive", type: "CONDITIONING", link: posToKsLinkId },
      { name: "negative", type: "CONDITIONING", link: negToKsLinkId },
      { name: "latent_image", type: "LATENT", link: latentToKsLinkId },
    ],
    outputs: [{ name: "LATENT", type: "LATENT", links: [] }],
    widgets_values: [params.seed, "randomize", params.steps, cfg, samplerName, scheduler, denoise],
  });

  // 7. VAEDecode
  const vaeDecodeId = nodeId++;
  const ksToVaeLinkId = linkId++;
  const checkpointVaeToVaeLinkId = linkId++;
  allLinks.push([ksToVaeLinkId, ksamplerId, 0, vaeDecodeId, 0, "LATENT"]);
  allLinks.push([checkpointVaeToVaeLinkId, checkpointId, 2, vaeDecodeId, 1, "VAE"]);
  nodes.push({
    id: vaeDecodeId,
    type: "VAEDecode",
    pos: [1350, 150],
    size: [200, 100],
    inputs: [
      { name: "samples", type: "LATENT", link: ksToVaeLinkId },
      { name: "vae", type: "VAE", link: checkpointVaeToVaeLinkId },
    ],
    outputs: [{ name: "IMAGE", type: "IMAGE", links: [] }],
  });

  // 8. SaveImage
  const saveId = nodeId++;
  const vaeToSaveLinkId = linkId++;
  allLinks.push([vaeToSaveLinkId, vaeDecodeId, 0, saveId, 0, "IMAGE"]);
  nodes.push({
    id: saveId,
    type: "SaveImage",
    pos: [1600, 150],
    size: [300, 400],
    inputs: [{ name: "images", type: "IMAGE", link: vaeToSaveLinkId }],
    widgets_values: ["ComfyUI"],
  });

  // Fix output link references
  fixOutputLinks(nodes, allLinks);

  if (loras.length > 0) {
    warnings.push(`${loras.length} LoRA(s) detected and converted to LoraLoader nodes: ${loras.map(l => l.name).join(", ")}`);
  }

  const workflow: ComfyUIWorkflow = {
    last_node_id: nodeId - 1,
    last_link_id: linkId - 1,
    nodes,
    links: allLinks,
    groups: [],
    config: {},
    extra: {},
    version: 0.4,
  };

  return { workflow, warnings };
}

function generateStandardWorkflow(params: A1111Params): GeneratorResult {
  const warnings: string[] = [];

  const samplerInfo = toComfyUISampler(params.sampler);
  let samplerName = samplerInfo.sampler;
  let scheduler = params.scheduleType
    ? toComfyUIScheduler(params.scheduleType)
    : samplerInfo.scheduler ?? toComfyUIScheduler(undefined);

  const fluxResult = validateFluxCompatibility(params, samplerName);
  if (fluxResult.samplerReplaced) {
    samplerName = "euler";
    scheduler = "simple";
    if (fluxResult.warning) warnings.push(fluxResult.warning);
  }

  // Extract LoRAs
  const { cleanedPrompt: cleanedPositive, loras: posLoras } = extractLoras(params.positivePrompt);
  const { cleanedPrompt: cleanedNegative } = extractLoras(params.negativePrompt);

  const denoise = params.denoise ?? 1.0;

  const nodes: ComfyUINode[] = [];
  const allLinks: ComfyUILink[] = [];
  let nodeId = 1;
  let linkId = 1;

  // 1. CheckpointLoaderSimple
  const checkpointId = nodeId++;
  nodes.push({
    id: checkpointId,
    type: "CheckpointLoaderSimple",
    pos: [50, 100],
    size: [300, 100],
    outputs: [
      { name: "MODEL", type: "MODEL", links: [] },
      { name: "CLIP", type: "CLIP", links: [] },
      { name: "VAE", type: "VAE", links: [] },
    ],
    widgets_values: [`${params.model}.safetensors`],
  });

  // 2. LoRA chain
  let modelSourceNodeId = checkpointId;
  let modelSourceSlot = 0;
  let clipSourceNodeId = checkpointId;
  let clipSourceSlot = 1;

  if (posLoras.length > 0) {
    const loraChain = buildLoraChain(posLoras, checkpointId, 0, 1, nodeId, linkId);
    nodes.push(...loraChain.nodes);
    allLinks.push(...loraChain.links);
    nodeId = loraChain.nextNodeId;
    linkId = loraChain.nextLinkId;

    const lastLoraNode = loraChain.nodes[loraChain.nodes.length - 1];
    modelSourceNodeId = lastLoraNode.id;
    modelSourceSlot = 0;
    clipSourceNodeId = lastLoraNode.id;
    clipSourceSlot = 1;
  }

  // 3. Positive CLIPTextEncode
  const posClipId = nodeId++;
  const clipToPosLinkId = linkId++;
  allLinks.push([clipToPosLinkId, clipSourceNodeId, clipSourceSlot, posClipId, 0, "CLIP"]);
  nodes.push({
    id: posClipId,
    type: "CLIPTextEncode",
    pos: [480, 50],
    size: [400, 200],
    inputs: [{ name: "clip", type: "CLIP", link: clipToPosLinkId }],
    outputs: [{ name: "CONDITIONING", type: "CONDITIONING", links: [] }],
    widgets_values: [cleanedPositive],
  });

  // 4. Negative CLIPTextEncode
  const negClipId = nodeId++;
  const clipToNegLinkId = linkId++;
  allLinks.push([clipToNegLinkId, clipSourceNodeId, clipSourceSlot, negClipId, 0, "CLIP"]);
  nodes.push({
    id: negClipId,
    type: "CLIPTextEncode",
    pos: [480, 300],
    size: [400, 200],
    inputs: [{ name: "clip", type: "CLIP", link: clipToNegLinkId }],
    outputs: [{ name: "CONDITIONING", type: "CONDITIONING", links: [] }],
    widgets_values: [cleanedNegative],
  });

  // 5. EmptyLatentImage
  const latentId = nodeId++;
  nodes.push({
    id: latentId,
    type: "EmptyLatentImage",
    pos: [50, 350],
    size: [300, 130],
    outputs: [{ name: "LATENT", type: "LATENT", links: [] }],
    widgets_values: [params.width, params.height, 1],
  });

  // 6. KSampler
  const ksamplerId = nodeId++;
  const modelToKsLinkId = linkId++;
  const posToKsLinkId = linkId++;
  const negToKsLinkId = linkId++;
  const latentToKsLinkId = linkId++;
  allLinks.push([modelToKsLinkId, modelSourceNodeId, modelSourceSlot, ksamplerId, 0, "MODEL"]);
  allLinks.push([posToKsLinkId, posClipId, 0, ksamplerId, 1, "CONDITIONING"]);
  allLinks.push([negToKsLinkId, negClipId, 0, ksamplerId, 2, "CONDITIONING"]);
  allLinks.push([latentToKsLinkId, latentId, 0, ksamplerId, 3, "LATENT"]);
  nodes.push({
    id: ksamplerId,
    type: "KSampler",
    pos: [950, 150],
    size: [350, 450],
    inputs: [
      { name: "model", type: "MODEL", link: modelToKsLinkId },
      { name: "positive", type: "CONDITIONING", link: posToKsLinkId },
      { name: "negative", type: "CONDITIONING", link: negToKsLinkId },
      { name: "latent_image", type: "LATENT", link: latentToKsLinkId },
    ],
    outputs: [{ name: "LATENT", type: "LATENT", links: [] }],
    widgets_values: [params.seed, "randomize", params.steps, params.cfgScale, samplerName, scheduler, denoise],
  });

  // 7. VAEDecode
  const vaeDecodeId = nodeId++;
  const ksToVaeLinkId = linkId++;
  const checkpointVaeToVaeLinkId = linkId++;
  allLinks.push([ksToVaeLinkId, ksamplerId, 0, vaeDecodeId, 0, "LATENT"]);
  allLinks.push([checkpointVaeToVaeLinkId, checkpointId, 2, vaeDecodeId, 1, "VAE"]);
  nodes.push({
    id: vaeDecodeId,
    type: "VAEDecode",
    pos: [1350, 200],
    size: [200, 100],
    inputs: [
      { name: "samples", type: "LATENT", link: ksToVaeLinkId },
      { name: "vae", type: "VAE", link: checkpointVaeToVaeLinkId },
    ],
    outputs: [{ name: "IMAGE", type: "IMAGE", links: [] }],
  });

  // 8. SaveImage
  const saveId = nodeId++;
  const vaeToSaveLinkId = linkId++;
  allLinks.push([vaeToSaveLinkId, vaeDecodeId, 0, saveId, 0, "IMAGE"]);
  nodes.push({
    id: saveId,
    type: "SaveImage",
    pos: [1600, 200],
    size: [300, 400],
    inputs: [{ name: "images", type: "IMAGE", link: vaeToSaveLinkId }],
    widgets_values: ["ComfyUI"],
  });

  // Fix output link references
  fixOutputLinks(nodes, allLinks);

  if (posLoras.length > 0) {
    warnings.push(`${posLoras.length} LoRA(s) detected and converted to LoraLoader nodes: ${posLoras.map(l => l.name).join(", ")}`);
  }

  const workflow: ComfyUIWorkflow = {
    last_node_id: nodeId - 1,
    last_link_id: linkId - 1,
    nodes,
    links: allLinks,
    groups: [],
    config: {},
    extra: {},
    version: 0.4,
  };

  return { workflow, warnings };
}

/**
 * Fix output links arrays on nodes based on the actual links array.
 * Each node's outputs[slot].links should list all link_ids that originate from that slot.
 */
function fixOutputLinks(nodes: ComfyUINode[], links: ComfyUILink[]) {
  // Clear all output links
  for (const node of nodes) {
    if (node.outputs) {
      for (const output of node.outputs) {
        output.links = [];
      }
    }
  }
  // Populate from links array: [link_id, source_node, source_slot, target_node, target_slot, type]
  for (const link of links) {
    const [linkId, sourceNodeId, sourceSlot] = link;
    const sourceNode = nodes.find((n) => n.id === sourceNodeId);
    if (sourceNode?.outputs?.[sourceSlot]) {
      (sourceNode.outputs[sourceSlot].links as number[]).push(linkId);
    }
  }
}
