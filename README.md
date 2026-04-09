# PromptBridge

Convert between SD WebUI (A1111/Forge) prompt text and ComfyUI workflow JSON.

**Live**: [promptbridge.dev](https://promptbridge.dev)

## Features

- **SD WebUI → ComfyUI**: Paste generation data from CivitAI or SD WebUI, get a ready-to-use ComfyUI workflow JSON
- **ComfyUI → SD WebUI**: Upload or paste ComfyUI workflow JSON, get SD WebUI format text
- **FLUX support**: Auto-detects FLUX models and generates optimized pipeline (cfg=1, euler, simple)
- **LoRA conversion**: Extracts `<lora:name:weight>` tags and creates LoraLoader nodes
- **20+ samplers**: DPM++ 2M/3M SDE, Euler, DDIM, UniPC, Heun, and more with Karras/Exponential variants
- **Forge compatibility**: Supports Forge-specific metadata format (`width`/`height` keys)
- **Smart warnings**: SDXL resolution mismatch, Hires fix, Clip skip, BREAK keyword, SD3 models

## How to Use

1. Go to a CivitAI image page
2. Click **Generation data** → **COPY ALL**
3. Paste into PromptBridge
4. Click **Convert**
5. Download the ComfyUI workflow JSON

## Tech Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (stats tracking)
- Vercel (hosting)

## Development

```bash
npm install
npm run dev
```

## Contributing

Issues and pull requests are welcome. Please report bugs with the input data that caused the issue.

## License

GPL-3.0
