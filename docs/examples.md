---
layout: default
title: Three worked examples
---

# Three worked examples

[← Back to overview](./)

These three flows cover most of what Vectorscope is for. All run on GPT-2 124M, which is ungated and fast enough to work with on CPU. The screenshots below use GPT-2 and the default settings.

Before you start: the backend is running, the frontend is at `http://localhost:3000`, and the header indicator shows a device (`mps`, `cuda`, or `cpu`). If any of that is not true, see [Install and run](getting-started.html).

---

## Example 1. Inspect the embedding table of GPT-2

**What this shows.** The input embedding matrix is where tokens enter the model. Its global statistics (mean vector, norm distribution, cosine structure) are the first thing worth looking at for any new model.

1. Click the model name in the header. Pick **GPT-2 124M**. Click **Load** and wait for the status bar to say "Loaded".
2. In the tab bar, click **Inspect → Embedding Table**.
3. The panel loads the full embedding matrix (50257 × 768 for GPT-2) and computes global statistics. You see:
   - Mean embedding vector norm (not zero; GPT-2 embeddings have a known off-centre bias).
   - A histogram of per-token norms.
   - A cosine-similarity heatmap for a configurable neighbourhood.
4. In the "Nearest neighbours" box at the right, type a token (`king`, say) and press return. The panel lists the ten tokens closest to it in cosine distance, with their similarity scores.

![Embedding Table on GPT-2]({{ site.baseurl }}/screenshots/ex1-embedding-table.png)

<p class="screenshot-note"><em>Figure 8. Embedding Table on GPT-2 124M. The norm histogram shows the long tail of rare tokens, and the nearest-neighbour list for <code>king</code> gives the expected result.</em></p>

**What to look at.** The mean vector norm, and whether the nearest-neighbour relationships are what you expect. If they aren't, you have the wrong tokeniser or the wrong model.

---

## Example 2. UMAP of hidden states across layers

**What this shows.** How a sequence of tokens moves through the residual stream. Layer 0 is close to the embedding; later layers reorganise the geometry around what each token means in context.

1. With GPT-2 loaded, click **Trace → Layer Probe**.
2. In the input box, paste a short passage. Three or four sentences is enough. For example:

   > The capital of France is Paris. The capital of Germany is Berlin. The capital of Italy is Rome.
3. Pick a layer with the slider. Start at layer 0, then step through 1, 4, 8, and 11 (the last layer in GPT-2 124M).
4. For each layer the panel shows:
   - A token-token cosine-similarity heatmap.
   - A norm bar chart (per-token residual-stream norm at that layer).
   - A full pairwise similarity matrix for the sequence.
5. To see the trajectory across all layers for one token, switch to **Trace → Token Trajectory**, keep the same input, and pick a token (e.g. `Paris`). The 3D plot shows that token's position at every layer, projected via PCA fit to the full trajectory.

![Layer Probe on GPT-2]({{ site.baseurl }}/screenshots/ex2-layer-probe.png)

<p class="screenshot-note"><em>Figure 9. Layer Probe at layer 8 on GPT-2 124M. The three city names cluster together, and the three country names cluster separately, which they do not do at layer 0.</em></p>

**What to look at.** How quickly structure appears (usually by layer 3 or 4 for GPT-2 on simple tasks like the one above) and whether norms grow or shrink through depth. In GPT-2, norms grow fairly monotonically; in some newer models they do not.

---

## Example 3. Extract and apply a grammar steering vector

**What this shows.** Vectorscope's Critique group implements the Panickssery, Gale, Jiang et al. contrastive activation addition recipe. You build a steering vector from paired examples and then add it into the residual stream during generation.

### Phase 1: extract the vector

1. Click **Critique → Grammar Steering (Phase 1)**.
2. In the "positive" box, paste prompts whose completions have the trait you want to amplify. For a toy example, the trait "formal tone":

   ```
   Please find enclosed the quarterly
   The Board of Directors has concluded that
   We regret to inform the committee that
   ```
3. In the "negative" box, paste matched prompts with the opposite trait:

   ```
   so yeah basically the thing is
   lol i cant believe they just
   anyway whatever lets just
   ```
4. Pick a layer to extract from. Mid-depth works well; for GPT-2 124M start at layer 6.
5. Click **Extract vector**. The backend runs each prompt through the model, caches the hidden state at the chosen layer for the last token, and returns the mean difference as the steering vector. You see:
   - The vector's norm.
   - Cosine similarity to each individual contrast pair's difference (how coherent the examples are).
   - A top-K list of tokens whose unembedding row is closest to the vector.

![Grammar Steering phase 1]({{ site.baseurl }}/screenshots/ex3-steering-phase1.png)

<p class="screenshot-note"><em>Figure 10. Phase 1 after extraction. The nearest-tokens list is the quickest sanity check that the vector points at the trait you intended.</em></p>

### Phase 2: apply the vector during generation

1. Click **Critique → Grammar Steering (Phase 2)**. The phase 1 vector is reused automatically if one has been extracted this session.
2. Set a prompt in the input box, for example:

   ```
   The engineer told the client that the fix would
   ```
3. Set the **steering coefficient** (a scalar multiplying the vector). Start at 0, then try 1, 2, and 4. Negative values apply the vector in the opposite direction.
4. Click **Generate**. The right-hand panel shows the completion token by token. The left panel shows the same completion for the baseline (coefficient 0) for comparison.
5. Try pushing the coefficient up until the output breaks (usually around 6 to 10 for GPT-2 with a reasonable contrast set). That is where the vector overwhelms the model's own distribution.

![Grammar Steering phase 2]({{ site.baseurl }}/screenshots/ex3-steering-phase2.png)

<p class="screenshot-note"><em>Figure 11. Phase 2 with coefficient 3 on GPT-2 124M. The baseline and steered completions diverge from the first new token.</em></p>

**What to look at.** How large a coefficient you can apply before fluency collapses, and whether the trait transfers across prompts you didn't use in the contrast set.

---

## Where to go next

- The **Full Trace** operation runs the whole pipeline as a streaming NDJSON response. It is the right view when you want to see per-token norms across every layer at once.
- **Generation Vector** gives you the autoregressive view with scrubber playback. It is the easiest way to see what the model is doing step by step.
- **Attention Inspector** is cheap and the right starting point for interpretability questions about where each head is looking.

For reviewer-grade exports, every operation has a JSON / CSV / PNG / PDF export button in its top-right.

[← Back to overview](./) · [Troubleshooting →](troubleshooting.html)
