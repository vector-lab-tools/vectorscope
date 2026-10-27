# Screenshot slots

Each file name below is referenced from a page in `../`. Drop a PNG at the exact path.

| File | Captured from | Shows |
|---|---|---|
| `01-overview.png` | Vectorscope at `localhost:3000`, nothing loaded | The header with model picker, Inspect / Trace / Critique tabs, StatusBar |
| `02-backend-ready.png` | Terminal | `Uvicorn running on http://127.0.0.1:8000` with device line above it |
| `03-model-picker.png` | Vectorscope header, model picker open | GPT-2 124M highlighted, Load button visible |
| `hf-01-join.png` | `huggingface.co/join` in a browser | The sign-up form |
| `hf-02-gated-form.png` | A gated model page (Llama 3.2 1B or Mistral 7B), signed in | The "Access gated model" box |
| `hf-03-new-token.png` | `huggingface.co/settings/tokens`, "New token" dialog open | Form with Read role selected |
| `hf-04-cli-login.png` | Terminal | `huggingface-cli login` output ending in `Login successful` |
| `ex1-embedding-table.png` | Vectorscope, Inspect → Embedding Table on GPT-2 | Norm histogram and nearest-neighbour panel with a token typed in |
| `ex2-layer-probe.png` | Vectorscope, Trace → Layer Probe on GPT-2, layer 8, three-cities prompt | Token-token heatmap and norm bars |
| `ex3-steering-phase1.png` | Vectorscope, Critique → Grammar Steering (Phase 1) | After an extraction: vector norm, nearest-tokens list |
| `ex3-steering-phase2.png` | Vectorscope, Critique → Grammar Steering (Phase 2) | Baseline and steered completions side by side |

Keep images under 400 KB each where possible (crop tight, 2× resolution for retina, PNG). Nothing in this folder is served except what is referenced.
