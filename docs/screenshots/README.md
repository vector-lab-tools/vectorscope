# Screenshot slots

Full-res PNG at `screenshots/NAME.png`, 1600px WebP thumbnail at `screenshots/web/NAME.webp` using:

```bash
cwebp -q 82 -resize 1600 0 in.png -o web/out.webp
```

| Name | Captured from | Shows |
|---|---|---|
| `01-overview` | Vectorscope at `localhost:3000`, GPT-2 loaded | Header with model picker, Inspect/Trace/Critique tabs, StatusBar. Hero slot. |
| `02-inspect-embedding-table` | Inspect → Embedding Table on GPT-2 | Norm histogram, cosine heatmap, nearest-neighbours for a token |
| `03-trace-layer-probe` | Trace → Layer Probe on GPT-2, layer 8, three-cities prompt | Token-token similarity heatmap and per-token norm bars |
| `04-trace-generation-vector` | Trace → Generation Vector on GPT-2 | Six-panel autoregressive view with the scrubber |
| `05-critique-phase1` | Critique → Grammar Steering phase 1, after extraction | Vector norm, nearest-tokens list |
| `06-critique-phase2` | Critique → Grammar Steering phase 2, coefficient 3 | Baseline and steered completions side by side |

Preview the page locally with `python3 -m http.server --directory docs 8080` and open `http://localhost:8080`.
