# Vectorscope

**Internal geometry of open-weight models.**

A tool for looking inside the vector medium: inspecting embedding tables, tracing token representations through transformer layers, and analysing the material grain of learned geometry.

## Author

David M. Berry, University of Sussex

## Version

0.2.2 (15 April 2026)

## What is Vectorscope?

Vectorscope is a research instrument for examining the internal geometry of open-weight language models. Unlike commercial embedding APIs, which return sentence-level composite vectors from separately trained embedding models, Vectorscope works directly with open-weight models where the weights, activations, and token embeddings can be inspected at each layer.

It is a companion tool to [Manifold Atlas](https://github.com/dmberry/manifold-atlas), which looks *between* models at their output embeddings. Vectorscope looks *inside* a single model at its internal geometry.

## Architecture

- **Frontend:** Next.js 16, React 19, TypeScript 5, Tailwind CSS, Three.js, Plotly
- **Backend:** Python 3.11+, FastAPI, PyTorch, HuggingFace Transformers

## Operations

### Inspect (component-level weight examination)
- **Embedding Table** — Load and visualise the input embedding matrix (PCA 3D scatter, norm histogram, deep dive) ✓
- **Projection Head** — Examine the lm_head / unembedding weights (3D scatter, stats, weight-tying detection) ✓
- **Weight Comparison** — Input embeddings vs output unembedding (cosine similarity distribution, norm scatter) ✓
- **Attention Inspector** — Attention pattern visualisation (Phase 3)

### Trace (following data through the pipeline)
- **Token Trajectory** — Trace a token through all layers (3D trajectory, layer similarity, norm profile) ✓
- **Layer Probe** — Hidden states at a specific layer (similarity heatmap, norm bars) ✓
- **Full Trace** — Tokens → vectors → manifold → vectors → dictionary (Phase 2)
- **Manifold Formation** — Animated layer-by-layer geometry (Phase 3)

### Critique (theoretical/analytical instruments)
- **Vocabulary Map** — Global topology of the vocabulary embedding space (3D scatter with search/highlight, norm distribution) ✓
- **Isotropy Analysis** — Effective dimensionality and direction concentration (Phase 4)
- **Cross-Model Anatomy** — Compare internal geometry across models (Phase 4)
- **Precision Degradation** — Signal Degradation Laboratory (FP32 → BF16 → INT8 → INT4) (Phase 4)

## Supported Models

| Model | Size | Min Memory |
|-------|------|-----------|
| GPT-2 | 124M | 8 GB |
| Qwen3 0.6B | 600M | 16 GB |
| Llama 3.2 1B | 1.2B | 16 GB |
| Llama 3.2 3B | 3B | 16 GB |
| Mistral 7B | 7B | 24 GB |

Primary development target: Apple Silicon Mac with 24 GB unified memory.

## Getting Started

### 1. Start the Python backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python main.py
```

The backend runs on `localhost:8000`.

### 2. Start the frontend

```bash
npm install
npm run dev
```

The frontend runs on `localhost:3000`.

### 3. Load a model

Select a model from the preset list or enter any HuggingFace model ID. The first load will download the model weights to `~/.cache/huggingface/`.

## Vector Lab

Vectorscope is part of the **Vector Lab**, a family of research instruments for the critical study of AI vector media:

- [Manifold Atlas](https://github.com/dmberry/manifold-atlas) — Comparative geometry of AI vector spaces (looks *between* models at output embeddings)
- [LLMbench](https://github.com/dmberry/LLMbench) — Comparative close reading of LLM outputs
- **Vectorscope** — Internal geometry of open-weight models (looks *inside* a single model)

## Theoretical Context

Vectorscope connects to David M. Berry's critical theory of vector space:

- Berry, D.M. (2026) 'What is Vector Space?', *Stunlaw*
- Berry, D.M. (2026) 'Brain Numbers', *Stunlaw*
- Berry, D.M. (2014) *Critical Theory and the Digital*, Bloomsbury

## Licence

MIT
