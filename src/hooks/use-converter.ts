"use client";

import { useState, useCallback } from "react";
import type { ConversionDirection, ConversionResult } from "@/lib/types/converter";
import { convertA1111ToComfyUI } from "@/lib/converters/a1111-to-comfyui";
import { convertComfyUIToA1111 } from "@/lib/converters/comfyui-to-a1111";
import { incrementStat } from "@/lib/supabase";

export function useConverter() {
  const [direction, setDirection] = useState<ConversionDirection>("a1111-to-comfyui");
  const [input, setInput] = useState("");
  const [result, setResult] = useState<ConversionResult | null>(null);

  const convert = useCallback(() => {
    if (!input.trim()) {
      setResult(null);
      return;
    }

    const conversionResult =
      direction === "a1111-to-comfyui"
        ? convertA1111ToComfyUI(input)
        : convertComfyUIToA1111(input);

    setResult(conversionResult);

    // Track conversion count (fire and forget)
    if (conversionResult.success) {
      incrementStat("total_conversions");
    }
  }, [direction, input]);

  const clear = useCallback(() => {
    setInput("");
    setResult(null);
  }, []);

  const toggleDirection = useCallback(() => {
    setDirection((prev) =>
      prev === "a1111-to-comfyui" ? "comfyui-to-a1111" : "a1111-to-comfyui"
    );
    setInput("");
    setResult(null);
  }, []);

  return {
    direction,
    setDirection,
    input,
    setInput,
    result,
    convert,
    clear,
    toggleDirection,
  };
}
