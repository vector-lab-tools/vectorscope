---
layout: default
title: Vectorscope
---

# Vectorscope

A workbench for inspecting the vector medium of open-weight large language models. Vectorscope loads a Hugging Face model locally and lets you look at its embeddings, hidden states, attention patterns, and generation dynamics as geometry. It also includes grammar steering: contrastive activation extraction and forward-pass intervention. The tool is a Next.js frontend talking to a FastAPI backend that holds the model in memory.

Vectorscope is one of the [Vector Lab](https://vector-lab-tools.github.io) family of research instruments. It is free software under the GNU General Public License, version 3 or later.

**Repository:** [github.com/vector-lab-tools/vectorscope](https://github.com/vector-lab-tools/vectorscope)

![Vectorscope header]({{ site.baseurl }}/screenshots/01-overview.png)

<p class="screenshot-note"><em>Figure 1. Vectorscope's main view, with the model picker in the header and the Inspect / Trace / Critique tab groups below.</em></p>

---

## Contents

1. [What it does](#what-it-does)
2. [Install and run](getting-started.html)
3. [Getting Hugging Face API keys working](api-keys.html) — the step that trips every new user
4. [Three worked examples](examples.html)
5. [Troubleshooting](troubleshooting.html)

---

## What it does

Vectorscope exposes the internal state of an LLM at three levels, matching the pipeline tokens → vectors → manifold → vectors → dictionary.

### Inspect (static views of the model)

- **Embedding Table.** The input embedding matrix. Mean, norm distribution, cosine-similarity structure, nearest neighbours for any token.
- **Projection Head.** The `lm_head` or output unembedding matrix.
- **Weight Comparison.** Input vs output embeddings. Are the two ends of the pipeline aligned?
- **Attention Inspector.** Per-head attention heatmaps for a given input.

### Trace (data moving through the pipeline)

- **Token Trajectory.** One token through every layer. See where it travels in the residual stream.
- **Layer Probe.** Hidden states at a chosen layer, with pairwise similarity and norm bars.
- **Full Trace.** The complete pipeline as a streaming NDJSON response. Per-token norm heatmap across layers, top-K predictions, entropy per position.
- **Generation Vector.** Instrumented autoregressive generation. Six panels: tokenisation, input embedding, attention, layer progression, output distribution, decoded text. Scrubber playback and click-to-focus across panels.
- **Manifold Formation.** A play / pause animation of layer-by-layer PCA geometry.

### Critique (intervention)

- **Grammar Steering phase 1.** Contrastive activation extraction. Build a steering vector from paired examples.
- **Grammar Steering phase 2.** Forward-pass intervention. Apply the steering vector during generation and see the effect.

### Supported models

Ungated (no account needed):

- GPT-2 (124M, 355M, 774M, 1.5B)
- Qwen3 (0.6B, 1.7B, 4B)

Gated (free account + licence acceptance; see [API keys](api-keys.html)):

- Llama 3.2 (1B, 3B)
- Mistral 7B

---

## Why open-weight only

Vectorscope does not talk to the OpenAI, Anthropic or Google APIs. The internal geometry it visualises simply does not exist through those APIs: no embedding table, no hidden states, no per-head attention. This is a methodological commitment, not an oversight.

---

## Citation

If Vectorscope is useful for your work, please cite:

> Berry, D. M. (2026). *Vectorscope: a workbench for inspecting the vector medium of open-weight language models.* Vector Lab Tools. [github.com/vector-lab-tools/vectorscope](https://github.com/vector-lab-tools/vectorscope).

---

## Licence

GNU General Public License, version 3 or later (GPL-3.0-or-later). All prior versions are retroactively relicensed under the same terms. See [`LICENSE`](https://github.com/vector-lab-tools/vectorscope/blob/main/LICENSE) and [`COPYING`](https://github.com/vector-lab-tools/vectorscope/blob/main/COPYING).

<p class="site-footer-links">
  <a href="https://vector-lab-tools.github.io">Vector Lab hub</a> ·
  <a href="https://github.com/vector-lab-tools/vectorscope">GitHub</a> ·
  <a href="getting-started.html">Install</a> ·
  <a href="api-keys.html">API keys</a> ·
  <a href="examples.html">Examples</a> ·
  <a href="troubleshooting.html">Troubleshooting</a>
</p>
