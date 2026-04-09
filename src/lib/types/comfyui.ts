export interface ComfyUINodeInput {
  name: string;
  type: string;
  link: number | null;
}

export interface ComfyUINodeOutput {
  name: string;
  type: string;
  links: number[] | null;
}

export interface ComfyUINode {
  id: number;
  type: string;
  pos: [number, number];
  size: [number, number];
  inputs?: ComfyUINodeInput[];
  outputs?: ComfyUINodeOutput[];
  widgets_values?: unknown[];
}

// [link_id, source_node_id, source_slot, target_node_id, target_slot, type_string]
export type ComfyUILink = [number, number, number, number, number, string];

export interface ComfyUIWorkflow {
  last_node_id: number;
  last_link_id: number;
  nodes: ComfyUINode[];
  links: ComfyUILink[];
  groups: unknown[];
  config: Record<string, unknown>;
  extra: Record<string, unknown>;
  version: number;
}
