"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { ChevronDown, ChevronUp } from "lucide-react";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });
import OperationIntro from "@/components/OperationIntro";

const BACKEND_URL = "http://localhost:8000";

interface WeightComparisonResult {
  weightTied: boolean;
  shape: [number, number];
  message?: string;
  sampleTokens?: string[];
  cosineSimilarities?: number[];
  embedNorms?: number[];
  headNorms?: number[];
  stats?: {
    meanCosine: number;
    stdCosine: number;
    minCosine: number;
    maxCosine: number;
    meanEmbedNorm: number;
    meanHeadNorm: number;
  };
  mostDifferent?: Array<{ token: string; cosine: number }>;
  mostSimilar?: Array<{ token: string; cosine: number }>;
}

export default function WeightComparison() {
  const [result, setResult] = useState<WeightComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deepDiveOpen, setDeepDiveOpen] = useState(false);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/weight-comparison`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sample_size: 3000 }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to compare weights");
      }
      setResult(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <OperationIntro
        name="Weight Comparison"
        summary="Compares the input embedding matrix against the output projection head token by token. Reports cosine similarity per row, the distribution of norms on each side, and surfaces the tokens where input and output geometry diverge most sharply. Reveals whether the model treats its two vocabulary-facing matrices as mirror images or as different spaces."
        details={
          <>
            <p>
              A language model has two vocabulary-facing matrices: the input embedding (which turns a token id into a vector) and the output projection head (which turns a final hidden state back into logits over the vocabulary). When these two matrices are tied, they share weights and the comparison is trivial. When they are untied, each token has two geometries, and those geometries can drift apart during training.
            </p>
            <p>
              This operation walks through a sample of the vocabulary, picks the corresponding row from each matrix, and computes the cosine similarity. A cosine of 1 means the token is treated identically on input and output. A low cosine means the model has developed a meaningful asymmetry — it expects the token to mean one thing when it arrives and another when it is produced.
            </p>
            <p>
              The most-similar and most-different token lists are usually the most revealing output. Function words, punctuation, and high-frequency tokens tend to stay aligned. Rare, semantically rich tokens often drift. That pattern is a fingerprint of the training objective.
            </p>
          </>
        }
      />
      <div className="card-editorial p-4">
        <div className="flex items-center gap-4">
          <button onClick={run} disabled={loading} className="btn-editorial-primary">
            {loading ? "Comparing..." : "Compare Input vs Output Weights"}
          </button>
          {error && <span className="text-red-600 font-sans text-[11px]">{error}</span>}
        </div>
      </div>

      {result && result.weightTied && (
        <div className="card-editorial p-4">
          <p className="font-sans text-xs text-slate">
            <strong>Weight-tied model.</strong> {result.message}
          </p>
        </div>
      )}

      {result && !result.weightTied && result.stats && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
            <StatCard label="Mean Cosine" value={result.stats.meanCosine.toFixed(3)} />
            <StatCard label="Std Cosine" value={result.stats.stdCosine.toFixed(3)} />
            <StatCard label="Min Cosine" value={result.stats.minCosine.toFixed(3)} />
            <StatCard label="Max Cosine" value={result.stats.maxCosine.toFixed(3)} />
            <StatCard label="Embed Norm" value={result.stats.meanEmbedNorm.toFixed(2)} unit="mean" />
            <StatCard label="Head Norm" value={result.stats.meanHeadNorm.toFixed(2)} unit="mean" />
          </div>

          {/* Cosine similarity distribution */}
          <div className="card-editorial p-3">
            <h3 className="font-sans text-xs font-semibold text-slate mb-2">
              Per-Token Cosine Similarity (Input Embedding vs lm_head)
            </h3>
            <Plot
              data={[{
                type: "histogram",
                x: result.cosineSimilarities,
                nbinsx: 60,
                marker: { color: "#5B2333", opacity: 0.8 },
              }]}
              layout={{
                height: 220,
                margin: { l: 40, r: 15, t: 5, b: 30 },
                paper_bgcolor: "transparent",
                plot_bgcolor: "transparent",
                xaxis: { title: "Cosine Similarity", gridcolor: "#E8E0D4", range: [-1, 1] },
                yaxis: { title: "Count", gridcolor: "#E8E0D4" },
                font: { family: "Inter, sans-serif", color: "#4A4A4A", size: 10 },
              }}
              config={{ displayModeBar: false }}
              style={{ width: "100%" }}
            />
          </div>

          {/* Norm scatter: embed norm vs head norm */}
          <div className="card-editorial p-3">
            <h3 className="font-sans text-xs font-semibold text-slate mb-2">
              Embed Norm vs Head Norm (per token)
            </h3>
            <Plot
              data={[{
                type: "scatter",
                mode: "markers",
                x: result.embedNorms,
                y: result.headNorms,
                text: result.sampleTokens,
                hovertemplate: "<b>%{text}</b><br>embed: %{x:.2f}<br>head: %{y:.2f}<extra></extra>",
                marker: {
                  size: 3,
                  color: result.cosineSimilarities,
                  colorscale: [[0, "#5B2333"], [0.5, "#A67F6F"], [1, "#5B8C5A"]],
                  colorbar: { title: "cos", thickness: 12 },
                  opacity: 0.5,
                },
              }]}
              layout={{
                height: 350,
                margin: { l: 40, r: 15, t: 5, b: 35 },
                paper_bgcolor: "transparent",
                plot_bgcolor: "transparent",
                xaxis: { title: "Input Embedding Norm", gridcolor: "#E8E0D4" },
                yaxis: { title: "lm_head Norm", gridcolor: "#E8E0D4" },
                font: { family: "Inter, sans-serif", color: "#4A4A4A", size: 10 },
              }}
              config={{ displayModeBar: false }}
              style={{ width: "100%" }}
            />
          </div>

          {/* Deep dive: most different / most similar tokens */}
          <div className="card-editorial">
            <button
              onClick={() => setDeepDiveOpen(!deepDiveOpen)}
              className="w-full flex items-center justify-between px-4 py-2 font-sans text-xs font-medium text-slate hover:text-ink transition-colors"
            >
              <span>Deep Dive</span>
              {deepDiveOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {deepDiveOpen && (
              <div className="px-4 pb-4 border-t border-parchment">
                <div className="grid grid-cols-2 gap-6 mt-3">
                  <div>
                    <h4 className="font-sans text-[11px] font-semibold text-slate uppercase tracking-wider mb-2">
                      Most Different (lowest cosine)
                    </h4>
                    <table className="w-full font-mono text-[11px]">
                      <tbody>
                        {result.mostDifferent?.map((t, i) => (
                          <tr key={i} className="border-b border-parchment">
                            <td className="py-0.5">{t.token}</td>
                            <td className="py-0.5 text-right text-slate">{t.cosine.toFixed(4)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div>
                    <h4 className="font-sans text-[11px] font-semibold text-slate uppercase tracking-wider mb-2">
                      Most Similar (highest cosine)
                    </h4>
                    <table className="w-full font-mono text-[11px]">
                      <tbody>
                        {result.mostSimilar?.map((t, i) => (
                          <tr key={i} className="border-b border-parchment">
                            <td className="py-0.5">{t.token}</td>
                            <td className="py-0.5 text-right text-slate">{t.cosine.toFixed(4)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="card-editorial p-2 text-center">
      <div className="font-sans text-[10px] text-slate uppercase tracking-wider">{label}</div>
      <div className="font-sans text-xs font-semibold mt-0.5">
        {value}
        {unit && <span className="font-sans text-[10px] text-slate font-normal ml-0.5">{unit}</span>}
      </div>
    </div>
  );
}
