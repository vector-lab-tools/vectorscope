# Vectorscope preset models

This file is the canonical source of the models shown in the **Vectorscope
model picker**. Edit this list and restart the backend (or call
`POST /presets/reload`) to update the UI. The frontend reads `/presets` on
startup; if the endpoint fails, it falls back to a small hardcoded list so
the app never ends up empty.

## How to add a model

Append a new entry to the `models:` list in the YAML block below. Field names
match the HTTP API (snake_case); the frontend converts to camelCase.

### Required fields

| Field              | Meaning                                                              |
|--------------------|----------------------------------------------------------------------|
| `id`               | HuggingFace repo ID (e.g. `Qwen/Qwen3-0.6B`)                         |
| `name`             | Display label in the picker                                          |
| `size`             | Approximate download / on-disk size                                  |
| `min_ram`          | Minimum system RAM recommended at native precision                   |
| `architecture`     | Model family (shown in detail panel)                                 |
| `params`           | Parameter count (e.g. `1.2 B`)                                       |
| `native_dtype`     | `float32`, `float16`, or `bfloat16`                                  |
| `hidden_size`      | Embedding dimension                                                  |
| `num_layers`       | Transformer layer count                                              |
| `num_heads`        | Attention heads per layer                                            |
| `vocab_size`       | Tokenizer vocabulary                                                 |
| `context_length`   | Maximum sequence length                                              |
| `organisation`     | Releasing organisation                                               |
| `release_year`     | Year first released                                                  |
| `description`      | One-paragraph explanation shown in the detail panel                  |

### Notes on model choice

Vectorscope can only inspect models that expose hidden states through
HuggingFace Transformers. GGUF / Ollama-style releases hide the internals
and should not be added here. Prefer small, well-documented base models
over instruction-tuned variants when the goal is geometry inspection —
instruction tuning changes the representation structure in ways that
complicate interpretation. Gated models (Llama, Mistral) require
`huggingface-cli login` before the first load.

## Preset list

```yaml
models:
  - id: openai-community/gpt2
    name: GPT-2 (124M)
    size: ~500 MB
    min_ram: 8 GB
    architecture: GPT-2
    params: 124 M
    native_dtype: float32
    hidden_size: 768
    num_layers: 12
    num_heads: 12
    vocab_size: 50257
    context_length: 1024
    organisation: OpenAI
    release_year: 2019
    description: >
      The original small GPT-2. Fast, well-understood, the de facto
      reference model for mechanistic interpretability work. Tied
      input/output embeddings. BPE tokenizer.

  - id: Qwen/Qwen3-0.6B
    name: Qwen3 0.6B
    size: ~1.2 GB
    min_ram: 16 GB
    architecture: Qwen3
    params: 0.6 B
    native_dtype: bfloat16
    hidden_size: 1024
    num_layers: 28
    num_heads: 16
    vocab_size: 151936
    context_length: 32768
    organisation: Alibaba
    release_year: 2025
    description: >
      Alibaba's smallest Qwen 3 dense model. Multilingual, strong
      reasoning for its size, native bf16. Good stress test for
      anisotropy / isotropy work at small scale.

  - id: meta-llama/Llama-3.2-1B
    name: Llama 3.2 1B
    size: ~2.4 GB
    min_ram: 16 GB
    architecture: Llama
    params: 1.2 B
    native_dtype: bfloat16
    hidden_size: 2048
    num_layers: 16
    num_heads: 32
    vocab_size: 128256
    context_length: 131072
    organisation: Meta
    release_year: 2024
    description: >
      Meta's small Llama 3.2 base. Long context window (128k),
      grouped-query attention, native bf16. Useful for tracing how a
      modern production architecture builds up geometry.

  - id: meta-llama/Llama-3.2-3B
    name: Llama 3.2 3B
    size: ~6.4 GB
    min_ram: 16 GB
    architecture: Llama
    params: 3.2 B
    native_dtype: bfloat16
    hidden_size: 3072
    num_layers: 28
    num_heads: 24
    vocab_size: 128256
    context_length: 131072
    organisation: Meta
    release_year: 2024
    description: >
      Larger Llama 3.2. Same architecture family as the 1B, deeper and
      wider. A useful point of comparison for layer-count effects on
      representation geometry.

  - id: mistralai/Mistral-7B-v0.3
    name: Mistral 7B
    size: ~14 GB
    min_ram: 24 GB
    architecture: Mistral
    params: 7.2 B
    native_dtype: bfloat16
    hidden_size: 4096
    num_layers: 32
    num_heads: 32
    vocab_size: 32768
    context_length: 32768
    organisation: Mistral AI
    release_year: 2024
    description: >
      Mistral's flagship 7B base. Sliding-window attention,
      grouped-query attention, native bf16. Tight fit on a 24 GB Mac;
      prefer to run with nothing else open.
```
