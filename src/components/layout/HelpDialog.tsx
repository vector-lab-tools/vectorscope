"use client";

import { useEffect, useState, type ReactNode } from "react";
import { HelpCircle, X } from "lucide-react";

const HELP_TABS = [
  { id: "start", label: "Getting started" },
  { id: "inspect", label: "Inspect" },
  { id: "trace", label: "Trace" },
  { id: "critique", label: "Critique" },
  { id: "precision", label: "Precision" },
  { id: "keys", label: "Keyboard" },
  { id: "tips", label: "Tips" },
] as const;

type HelpTab = (typeof HELP_TABS)[number]["id"];

const kbd = "font-mono text-[9px] px-1 border border-parchment bg-cream rounded-sm";
const code = "bg-parchment px-1 rounded";

function Op({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div>
      <dt className="font-semibold text-ink">{name}</dt>
      <dd className="ml-4">{children}</dd>
    </div>
  );
}

function PaneTitle({ children }: { children: ReactNode }) {
  return <h3 className="font-display text-heading-sm font-semibold text-ink mb-3">{children}</h3>;
}

export default function HelpDialog() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<HelpTab>("start");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-slate hover:text-burgundy transition-colors"
        title="Help"
      >
        <HelpCircle className="w-4 h-4" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-ivory border border-parchment-dark rounded-lg shadow-editorial-lg w-full max-w-4xl h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-parchment shrink-0">
              <h2 className="font-display text-display-md text-ink">Help</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-slate hover:text-burgundy"
                aria-label="Close help"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col md:flex-row flex-1 min-h-0">
              <nav
                className="flex md:flex-col gap-1 p-3 md:w-52 shrink-0 overflow-x-auto md:overflow-y-auto border-b md:border-b-0 md:border-r border-parchment"
                aria-label="Help sections"
              >
                {HELP_TABS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`text-left whitespace-nowrap px-3 py-1.5 rounded-sm font-sans text-caption transition-colors ${
                      tab === t.id
                        ? "bg-burgundy/10 text-burgundy font-semibold"
                        : "text-slate hover:text-ink hover:bg-parchment/50"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </nav>

              <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 font-sans text-caption text-slate">
                {tab === "start" && (
                  <section>
                    <PaneTitle>Getting started</PaneTitle>
                    <ol className="list-decimal list-inside space-y-2">
                      <li>
                        Start the Python backend (<code className={code}>cd backend &amp;&amp; python main.py</code>) and
                        leave it running. The device indicator in the header turns green when the frontend reaches it.
                      </li>
                      <li>
                        Click the model name in the header and load a model. GPT-2 124M is the quickest start: small,
                        ungated, fast enough on CPU. Llama and Mistral need a Hugging Face token; the full guide covers
                        that step.
                      </li>
                      <li>Pick an operation from the three tab groups: Inspect, Trace, Critique.</li>
                      <li>
                        Most operations have a row of preset chips under the inputs. A chip fills the inputs with a
                        worked example; click <em>Run</em> to execute it. Chips do not run on their own, because some
                        operations are expensive.
                      </li>
                      <li>
                        Each operation opens with a collapsible introduction and a <em>Learn more</em> modal, and ends
                        with a <em>Deep Dive</em> panel holding the full quantitative data.
                      </li>
                    </ol>
                  </section>
                )}

                {tab === "inspect" && (
                  <section>
                    <PaneTitle>Inspect: the weights themselves</PaneTitle>
                    <dl className="space-y-3">
                      <Op name="Embedding Table">
                        Input embedding matrix. Vocab size, hidden dimension, norm statistics, effective rank, isotropy
                        score, PCA 3D scatter of a sampled subset.
                      </Op>
                      <Op name="Projection Head">
                        The lm_head or unembedding matrix. 3D scatter of output-side token directions, weight-tying
                        detection, comparative effective rank.
                      </Op>
                      <Op name="Weight Comparison">
                        Input embeddings and output unembedding side by side. Per-token cosine distribution and norm
                        scatter, showing how the two diverge when weights are not tied.
                      </Op>
                      <Op name="Attention Inspector">
                        Multi-head attention heatmaps at any layer, with per-head entropy and a
                        focused, diagonal or diffuse pattern classifier.
                      </Op>
                    </dl>
                  </section>
                )}

                {tab === "trace" && (
                  <section>
                    <PaneTitle>Trace: data moving through the pipeline</PaneTitle>
                    <dl className="space-y-3">
                      <Op name="Token Trajectory">
                        One token through every layer. 3D PCA path, layer-to-layer cosine similarity, norm profile.
                      </Op>
                      <Op name="Layer Probe">
                        Hidden states at a chosen layer. Token-position similarity heatmap, norm bars, full similarity
                        matrix.
                      </Op>
                      <Op name="Full Trace">
                        The tokens, embeddings, layers and predictions pipeline, streamed progressively as NDJSON.
                        Per-token norm heatmap, top-K prediction chart, entropy series.
                      </Op>
                      <Op name="Generation Vector">
                        Instrumented autoregressive generation. A sticky token-chip header with a playback scrubber,
                        six panels (Tokenisation, Input Embedding, Attention, Layer Progression, Output Distribution,
                        Decoded Text), click-to-focus across all panels, and a global PCA 3D trajectory per token. The
                        Tokenisation panel shows per-token ‖v‖, running ‖Σv‖ and a √t independence baseline; the
                        focused-token card gives bytes, code points, per-layer PCA coordinates, layer-to-layer cosines
                        and sampling detail.
                      </Op>
                      <Op name="Manifold Formation">
                        Animated layer-by-layer PCA geometry with play and pause, showing how the manifold forms through
                        depth.
                      </Op>
                    </dl>
                  </section>
                )}

                {tab === "critique" && (
                  <section>
                    <PaneTitle>Critique: theoretical instruments</PaneTitle>
                    <dl className="space-y-3">
                      <Op name="Vocabulary Map">
                        Global vocabulary topology. Searchable 3D scatter with token highlight and norm distribution.
                      </Op>
                      <Op name="Isotropy Analysis">
                        Per-layer isotropy, mean pairwise cosine, top principal-component variance ratios, and
                        pairwise-cosine histograms at the first, middle and last layer. Makes Ethayarajh&apos;s
                        anisotropy collapse visible through depth.
                      </Op>
                      <Op name="Precision Degradation">
                        Runs a prompt at baseline precision and at each selected target (bf16, fp16, int8, int4,
                        int2), compares hidden states layer by layer, and reports prediction changes. Quantisation is
                        simulated in-process by round-to-nearest; no pre-quantised variant is loaded.
                      </Op>
                      <Op name="Grammar Steering">
                        Contrastive Activation Addition (Turner et al. 2023; Rimsky et al. 2024). Matched positive and
                        negative prompt pairs give a per-layer steering vector for the pattern under study; the
                        &ldquo;Not X but Y&rdquo; antithesis is the default preset. Per-layer norm trajectory,
                        leave-one-out separability and a 3D PCA scatter show the pattern&apos;s activation signature.
                        The generation panel then intervenes: a PyTorch forward hook on the chosen block adds{" "}
                        <code className={code}>scale × steering_vector</code> to the residual stream at every step,
                        one generation per scale, side by side. Negative scales suppress, positive scales amplify.
                      </Op>
                    </dl>
                  </section>
                )}

                {tab === "precision" && (
                  <section className="space-y-3">
                    <PaneTitle>How precision works</PaneTitle>
                    <p>
                      Vectorscope loads each model at its <em>native precision</em>, the numeric format its authors
                      published it in, so the geometry you inspect matches the weights on disk. Qwen, Llama and Mistral
                      ship in bfloat16; GPT-2 ships in float32.
                    </p>
                    <p>
                      <strong>bfloat16</strong> uses 1 sign bit, 8 exponent bits and 7 mantissa bits. It has the same
                      exponent range as float32 (roughly 10⁻³⁸ to 10³⁸) with less precision. Ordinary float16 has 5
                      exponent bits and 10 mantissa bits: more precision near zero, a much narrower range, and so a
                      greater risk of activations overflowing or underflowing. Vectorscope keeps bf16 weights in bf16
                      on Apple Silicon (MPS), NVIDIA (CUDA) and CPU.
                    </p>
                    <p>
                      <strong>Down-cast for float32 models.</strong> On MPS and CUDA, float32 models such as GPT-2 are
                      loaded as <code className={code}>float16</code> to halve memory use. The rounding is small and the
                      structure of the geometry is preserved. On CPU, float32 is kept.
                    </p>
                    <p>
                      Settings shows the <em>loaded precision</em>: <code className={code}>downcast float32→float16</code>{" "}
                      for GPT-2 on a GPU, <code className={code}>bfloat16</code> for Qwen, Llama and Mistral. The model
                      picker shows the <em>native precision</em>, a property of the release. Precision Degradation takes
                      the loaded precision as its baseline.
                    </p>
                  </section>
                )}

                {tab === "keys" && (
                  <section>
                    <PaneTitle>Keyboard</PaneTitle>
                    <dl className="space-y-3">
                      <Op name="Generation Vector, panels">
                        <kbd className={kbd}>←</kbd> <kbd className={kbd}>→</kbd> step between the six panels when no
                        token is focused on Tokenisation.
                      </Op>
                      <Op name="Generation Vector, Tokenisation chips">
                        <kbd className={kbd}>←</kbd> <kbd className={kbd}>→</kbd> step chip by chip;{" "}
                        <kbd className={kbd}>↑</kbd> <kbd className={kbd}>↓</kbd> jump between rows. Focus syncs across
                        every panel.
                      </Op>
                      <Op name="3D plots">
                        <kbd className={kbd}>Shift</kbd> + scroll for fast zoom on any 3D scatter.
                      </Op>
                      <Op name="Dialogs">
                        <kbd className={kbd}>Esc</kbd> or a click outside closes Help, Settings, About, the backend
                        panel, the model picker and any <em>Learn more</em> modal.
                      </Op>
                    </dl>
                  </section>
                )}

                {tab === "tips" && (
                  <section className="space-y-3">
                    <PaneTitle>Tips</PaneTitle>
                    <p>
                      Every operation has an Export menu: JSON for the raw result, CSV where there is a table, PNG for
                      the plot, PDF for a composed document with metadata and summary tables.
                    </p>
                    <p>
                      The model list is a plain file, <code className={code}>backend/config/models.md</code>. Add a
                      Hugging Face model there and it appears in the picker without a rebuild.
                    </p>
                    <p>
                      Clippy drifts in from the margins every few minutes with a short aphorism on vector media and
                      critical theory. Type <code className={code}>hacker</code> anywhere to summon Hackerman, or{" "}
                      <code className={code}>hermes</code> for Hermes Trismegistus. Click a character to cycle through
                      its messages.
                    </p>
                  </section>
                )}
              </div>
            </div>

            <div className="px-6 py-3 border-t border-parchment flex flex-wrap items-center gap-2 shrink-0 font-sans text-caption">
              <a
                href="https://vector-lab-tools.github.io/vectorscope/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate hover:text-burgundy transition-colors"
              >
                Full guide and FAQ
              </a>
              <span className="text-slate/40">·</span>
              <a
                href="https://vector-lab-tools.github.io"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-slate hover:text-burgundy transition-colors"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icons/vector-lab-mark.svg" alt="" width={14} height={14} className="w-3.5 h-3.5 shrink-0" />
                Part of the Vector Lab
              </a>
              <span className="text-slate/40">·</span>
              <a
                href="https://github.com/vector-lab-tools/vectorscope"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate hover:text-burgundy transition-colors"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
