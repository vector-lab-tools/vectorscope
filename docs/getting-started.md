---
layout: default
title: Install and run
---

# Install and run

[← Back to overview](./)

Vectorscope has two parts, both run locally: a Python FastAPI backend that holds the model, and a Next.js frontend that talks to it.

## Prerequisites

- **Python 3.9 or newer** (3.11 recommended).
- **Node.js 18 or newer** (20 LTS recommended) and **npm**.
- **Git**.
- **Disk.** Models cache to `~/.cache/huggingface/`. GPT-2 is roughly 500 MB; Llama 3.2 1B around 2.5 GB; Mistral 7B around 14 GB.
- **Memory.** GPT-2 runs in 8 GB. 1B to 3B models want 16 GB. 7B wants 24 GB of unified memory on Apple Silicon or equivalent.
- **Optional, Apple Silicon.** PyTorch's MPS backend is picked up automatically on macOS 13.3 and newer. CUDA on Linux works too; the backend logs the device at startup.
- **Optional, gated models.** A Hugging Face account and access token. GPT-2 and Qwen3 do not need one. Llama and Mistral do. The full walkthrough for that is on the [API keys page](api-keys.html).

## Clone

```bash
git clone https://github.com/vector-lab-tools/vectorscope.git
cd vectorscope
```

## Backend

In the first terminal, from the project root:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate              # Windows PowerShell: .venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r requirements.txt
python main.py
```

The first `pip install` pulls PyTorch, Transformers, FastAPI and scikit-learn. On a fast connection it takes two to five minutes. When the backend is ready you will see:

```
Uvicorn running on http://127.0.0.1:8000
```

Leave this terminal running.

![Backend ready in terminal]({{ site.baseurl }}/screenshots/02-backend-ready.png)

<p class="screenshot-note"><em>Figure 2. Backend startup log. The last line reports the device (`mps`, `cuda`, or `cpu`).</em></p>

## Frontend

In a second terminal, from the project root:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

In the top-right of the header you will see a model-server indicator. Green with `mps`, `cuda`, or `cpu` means the frontend has reached the backend. Red means it hasn't; see [Troubleshooting](troubleshooting.html).

## Load your first model

Click the model name in the header. The picker opens. Pick **GPT-2 124M**, the smallest and the de facto reference model for interpretability work. Click **Load**.

![Model picker with GPT-2 selected]({{ site.baseurl }}/screenshots/03-model-picker.png)

<p class="screenshot-note"><em>Figure 3. Model picker. GPT-2 is ungated and will download on first load, roughly 500 MB.</em></p>

The first load for a given model downloads the weights to `~/.cache/huggingface/`. Subsequent loads are near-instant.

Once the status bar shows the model is loaded, pick an operation from the **Inspect / Trace / Critique** tabs. **Embedding Table** is the cheapest operation and a good smoke test.

[Three worked examples →](examples.html)
