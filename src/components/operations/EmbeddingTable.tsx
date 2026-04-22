"use client";

import { useState, useCallback, useRef, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { EmbeddingTableResult } from "@/types/model";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });
import Plot3DWrapper from "@/components/Plot3DWrapper";
import OperationIntro from "@/components/OperationIntro";
import PresetChipRow from "@/components/PresetChipRow";
import ExportMenu from "@/components/ExportMenu";
import { EMBEDDING_TABLE_PRESETS } from "@/lib/presets/defaults";
import { useModel } from "@/context/ModelContext";

const STAT_EXPLANATIONS: Record<string, { title: string; body: ReactNode }> = {
  Vocabulary: {
    title: "Vocabulary size",
    body: (
      <>
        <p>
          The number of distinct tokens the model can address. Each one has a fixed entry in the
          input embedding matrix, which is the lookup table the model consults when a token first
          enters the forward pass.
        </p>
        <p>
          For GPT-2 this is 50,257: bytes, whole words, word pieces, and a few special symbols.
          The vocabulary is fixed at training time and is the boundary of what the model can
          perceive at the input layer. Anything outside it has to be broken into pieces by the
          tokeniser first.
        </p>
      </>
    ),
  },
  Dimension: {
    title: "Hidden dimension",
    body: (
      <>
        <p>
          The width of each embedding vector. Every token lives in a space of this many
          dimensions, and every hidden state at every layer inherits the same width.
        </p>
        <p>
          GPT-2 small is 768. Llama 3.2 1B is 2048. Mistral 7B is 4096. The dimension sets the
          geometric budget: how many independent directions the model has to encode meaning,
          syntax, context, register, and everything else it needs to carry through the stack.
        </p>
      </>
    ),
  },
  "Mean Norm": {
    title: "Mean embedding norm",
    body: (
      <>
        <p>
          The average Euclidean length of an input embedding vector across the sample. A rough
          measure of how much geometric energy the model assigns to a typical token.
        </p>
        <p>
          Low norms mean the embedding layer is squeezing tokens toward the origin; high norms
          mean it is spreading them out. The interesting thing is almost never the mean itself
          but the variance around it: rare tokens tend to have inflated norms, common function
          words tend to cluster near the mean.
        </p>
      </>
    ),
  },
  "Effective Rank": {
    title: "Effective rank",
    body: (
      <>
        <p>
          The number of dimensions the embedding matrix actually uses, computed from the Shannon
          entropy of its singular value spectrum. If the value is close to the full dimension,
          every direction is doing work; if it is much smaller, the matrix has collapsed onto a
          lower-dimensional subspace.
        </p>
        <p>
          A rank of 400 in a 768-dimensional model means roughly half the available directions
          are empty. The gap between effective rank and full dimension is one of the clearest
          signatures of anisotropic geometry, and it is a standard diagnostic in the
          representation-degeneration literature.
        </p>
      </>
    ),
  },
  Isotropy: {
    title: "Isotropy score",
    body: (
      <>
        <p>
          A measure of directional uniformity on the unit sphere. Value of 1.0 means the vectors
          are spread evenly in every direction; value near 0 means they crowd into a narrow cone.
        </p>
        <p>
          Mu et al. (2018) and Ethayarajh (2019) showed that transformer embeddings are
          notoriously anisotropic: they occupy a thin slice of the space rather than filling it.
          This has knock-on effects for cosine similarity (all vectors look more similar than
          they should) and is part of why projection heads and normalisation layers exist.
        </p>
      </>
    ),
  },
  "Weight Tied": {
    title: "Weight tying",
    body: (
      <>
        <p>
          Whether the input embedding matrix and the output projection (the unembedding, also
          called the language-model head) share the same weights. If tied, the same matrix is
          used to look tokens up at the input and to score them at the output.
        </p>
        <p>
          Weight tying halves the parameter count of the vocabulary layers and was popularised by
          Press and Wolf (2017). GPT-2 ties; Llama models do not. When untied, the input and
          output spaces can drift apart geometrically, which matters for any operation that
          assumes they live in the same frame of reference.
        </p>
      </>
    ),
  },
};

const BACKEND_URL = "http://localhost:8000";

export default function EmbeddingTable() {
  const { backendStatus } = useModel();
  const model = backendStatus.model;
  const containerRef = useRef<HTMLDivElement>(null);
  const [result, setResult] = useState<EmbeddingTableResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sampleSize, setSampleSize] = useState(3000);
  const [deepDiveOpen, setDeepDiveOpen] = useState(false);
  const [showTokens, setShowTokens] = useState(false);
  const [explainedStat, setExplainedStat] = useState<string | null>(null);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/embedding-table`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sample_size: sampleSize }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to extract embedding table");
      }
      const data: EmbeddingTableResult = await res.json();
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [sampleSize]);

  return (
    <div className="max-w-7xl mx-auto space-y-4" ref={containerRef}>
      <OperationIntro
        name="Embedding Table"
        summary="Loads the model's full input embedding matrix and reports its geometric shape. Computes mean norm, effective rank, isotropy, and norm range across the vocabulary, then projects a random sample of tokens into 3D via PCA so you can see where words live in the model's internal space."
        details={
          <>
            <p>
              The input embedding is the first thing that happens to a token inside a language model. Every item in the vocabulary is assigned a fixed vector in a high-dimensional space. This operation pulls that entire matrix out of the model&apos;s weights and treats it as an object of geometric inspection.
            </p>
            <p>
              The statistics report four properties of that matrix. <strong>Mean norm</strong> is the average length of an embedding vector: a rough measure of how much geometric energy the model assigns to a typical token. <strong>Effective rank</strong> (computed from the Shannon entropy of the singular value spectrum) tells you how many dimensions the model actually uses — a rank of 400 in a 768-dimensional model means a third of the available directions are empty. <strong>Isotropy</strong> measures directional uniformity: a value near 1.0 means the vectors are evenly distributed, a value near 0 means they crowd into a narrow cone.
            </p>
            <p>
              The 3D scatter is a PCA projection of a random sample of tokens. It cannot show you the real topology of a 768-dimensional space, but it can show you clusters, outliers, and anisotropy that would otherwise be invisible.
            </p>
            <p>
              Theoretically, this is the model&apos;s raw ontology before any context is applied. Anisotropy here is the geometric signature of the training corpus. Every downstream operation in Vectorscope starts from this matrix.
            </p>
          </>
        }
      />
      {/* Controls */}
      <div className="card-editorial p-4 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="embedding-sample-size" className="font-sans text-[11px] text-slate">
              Sample size
            </label>
            <input
              id="embedding-sample-size"
              type="number"
              value={sampleSize}
              onChange={(e) => setSampleSize(Number(e.target.value))}
              className="input-editorial w-28"
              min={100}
              max={50000}
            />
          </div>
          <button
            onClick={run}
            disabled={loading}
            className="btn-editorial-primary"
          >
            {loading ? "Extracting..." : "Extract Embedding Table"}
          </button>
          {error && <span className="text-red-600 font-sans text-[11px] self-center">{error}</span>}
        </div>
        <PresetChipRow
          disabled={loading}
          items={EMBEDDING_TABLE_PRESETS.map((p) => ({
            label: p.label,
            title: p.title,
            onClick: () => setSampleSize(p.value),
          }))}
        />
      </div>

      {result && (
        <>
          <div className="flex justify-end">
            <ExportMenu
              operationName="Embedding Table"
              modelName={model?.name}
              getBundle={() => ({
                json: result,
                plotContainer: containerRef.current,
                pdfTitle: "Embedding Table",
                pdfMetadata: [
                  { label: "Vocab size", value: result.shape[0].toLocaleString() },
                  { label: "Hidden dim", value: String(result.shape[1]) },
                  { label: "Sample size", value: String(sampleSize) },
                ],
              })}
            />
          </div>
          {/* Stats cards */}
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
            <StatCard
              label="Vocabulary"
              value={result.shape[0].toLocaleString()}
              unit="tokens"
              secondaryAction={{ label: showTokens ? "hide tokens" : "view tokens", onClick: () => setShowTokens(!showTokens) }}
              explained={explainedStat === "Vocabulary"}
              onExplain={() => setExplainedStat(explainedStat === "Vocabulary" ? null : "Vocabulary")}
            />
            <StatCard
              label="Dimension"
              value={result.shape[1].toString()}
              unit="d"
              explained={explainedStat === "Dimension"}
              onExplain={() => setExplainedStat(explainedStat === "Dimension" ? null : "Dimension")}
            />
            <StatCard
              label="Mean Norm"
              value={result.stats.meanNorm.toFixed(2)}
              explained={explainedStat === "Mean Norm"}
              onExplain={() => setExplainedStat(explainedStat === "Mean Norm" ? null : "Mean Norm")}
            />
            <StatCard
              label="Effective Rank"
              value={result.stats.effectiveRank.toFixed(1)}
              unit={`/ ${result.shape[1]}`}
              explained={explainedStat === "Effective Rank"}
              onExplain={() => setExplainedStat(explainedStat === "Effective Rank" ? null : "Effective Rank")}
            />
            <StatCard
              label="Isotropy"
              value={result.stats.isotropyScore.toFixed(3)}
              explained={explainedStat === "Isotropy"}
              onExplain={() => setExplainedStat(explainedStat === "Isotropy" ? null : "Isotropy")}
            />
            <StatCard
              label="Weight Tied"
              value={model?.weightTied ? "Yes" : "No"}
              explained={explainedStat === "Weight Tied"}
              onExplain={() => setExplainedStat(explainedStat === "Weight Tied" ? null : "Weight Tied")}
            />
          </div>

          {/* Stat explanation panel */}
          {explainedStat && STAT_EXPLANATIONS[explainedStat] && (
            <div className="card-editorial p-4 border-burgundy/30">
              <div className="flex items-start justify-between gap-4 mb-2">
                <h3 className="font-sans text-xs font-semibold text-burgundy uppercase tracking-wider">
                  {STAT_EXPLANATIONS[explainedStat].title}
                </h3>
                <button
                  onClick={() => setExplainedStat(null)}
                  className="font-sans text-[11px] text-slate hover:text-ink"
                  aria-label="Dismiss explanation"
                >
                  Close
                </button>
              </div>
              <div className="font-sans text-[12px] text-slate leading-relaxed space-y-2 prose-editorial">
                {STAT_EXPLANATIONS[explainedStat].body}
              </div>
            </div>
          )}

          {/* Token list (toggled from Vocabulary card) */}
          {showTokens && (
            <div className="card-editorial p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-sans text-xs font-semibold text-slate">
                  Sampled Vocabulary Tokens ({result.sampleTokens.length.toLocaleString()})
                </h3>
                <button onClick={() => setShowTokens(false)} className="font-sans text-[11px] text-slate hover:text-ink">
                  Close
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto border border-parchment rounded-sm p-2">
                <div className="flex flex-wrap gap-1">
                  {result.sampleTokens.map((token, i) => (
                    <span
                      key={i}
                      className="inline-block bg-cream px-1.5 py-0.5 rounded-sm font-mono text-[10px] text-slate hover:bg-parchment hover:text-ink transition-colors cursor-default"
                      title={`norm: ${result.sampleNorms[i].toFixed(3)}`}
                    >
                      {token}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 3D Scatter */}
          <div className="card-editorial p-3">
            <h3 className="font-sans text-xs font-semibold text-slate mb-2">
              Vocabulary Embedding Space (PCA → 3D, {result.sampleTokens.length.toLocaleString()} tokens sampled)
            </h3>
            <Plot3DWrapper
              data={[
                {
                  type: "scatter3d",
                  mode: "markers",
                  x: result.sampleCoords3d.map((c) => c[0]),
                  y: result.sampleCoords3d.map((c) => c[1]),
                  z: result.sampleCoords3d.map((c) => c[2]),
                  text: result.sampleTokens,
                  hovertemplate: "<b>%{text}</b><br>norm: %{marker.color:.2f}<extra></extra>",
                  marker: {
                    size: 2,
                    color: result.sampleNorms,
                    colorscale: [
                      [0, "#5B2333"],
                      [0.5, "#A67F6F"],
                      [1, "#F5F0E8"],
                    ],
                    colorbar: {
                      title: "Norm",
                      thickness: 15,
                    },
                    opacity: 0.7,
                  },
                },
              ]}
              layout={{
                height: 500,
                margin: { l: 0, r: 0, t: 0, b: 0 },
                paper_bgcolor: "transparent",
                plot_bgcolor: "transparent",
                scene: {
                  xaxis: { title: "PC1", gridcolor: "#E8E0D4", zerolinecolor: "#D4C9B8" },
                  yaxis: { title: "PC2", gridcolor: "#E8E0D4", zerolinecolor: "#D4C9B8" },
                  zaxis: { title: "PC3", gridcolor: "#E8E0D4", zerolinecolor: "#D4C9B8" },
                  bgcolor: "transparent",
                },
                font: { family: "Inter, sans-serif", color: "#4A4A4A", size: 10 },
              }}
              config={{ displayModeBar: true, displaylogo: false }}
              style={{ width: "100%" }}
            />
          </div>

          {/* Norm histogram */}
          <div className="card-editorial p-3">
            <h3 className="font-sans text-xs font-semibold text-slate mb-2">Norm Distribution</h3>
            <Plot
              data={[
                {
                  type: "histogram",
                  x: result.sampleNorms,
                  nbinsx: 50,
                  marker: {
                    color: "#5B2333",
                    opacity: 0.8,
                  },
                },
              ]}
              layout={{
                height: 200,
                margin: { l: 40, r: 15, t: 5, b: 30 },
                paper_bgcolor: "transparent",
                plot_bgcolor: "transparent",
                xaxis: { title: "Norm", gridcolor: "#E8E0D4" },
                yaxis: { title: "Count", gridcolor: "#E8E0D4" },
                font: { family: "Inter, sans-serif", color: "#4A4A4A", size: 10 },
              }}
              config={{ displayModeBar: false }}
              style={{ width: "100%" }}
            />
          </div>

          {/* Deep dive panel */}
          <div className="card-editorial">
            <button
              onClick={() => setDeepDiveOpen(!deepDiveOpen)}
              className="w-full flex items-center justify-between px-4 py-2 font-sans text-xs font-medium text-slate hover:text-ink transition-colors"
            >
              <span>Deep Dive</span>
              {deepDiveOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {deepDiveOpen && (
              <div className="px-4 pb-4 border-t border-parchment space-y-4">
                <div className="grid grid-cols-2 gap-6 mt-3">
                  {/* Left column: detailed stats */}
                  <div>
                    <h4 className="font-sans text-[11px] font-semibold text-slate uppercase tracking-wider mb-2">Embedding Matrix</h4>
                    <table className="w-full font-mono text-[11px]">
                      <tbody>
                        <tr className="border-b border-parchment">
                          <td className="py-1 text-slate">Shape</td>
                          <td className="py-1 text-right">{result.shape[0].toLocaleString()} × {result.shape[1]}</td>
                        </tr>
                        <tr className="border-b border-parchment">
                          <td className="py-1 text-slate">Total parameters</td>
                          <td className="py-1 text-right">{(result.shape[0] * result.shape[1]).toLocaleString()}</td>
                        </tr>
                        <tr className="border-b border-parchment">
                          <td className="py-1 text-slate">Effective rank</td>
                          <td className="py-1 text-right">{result.stats.effectiveRank.toFixed(2)} / {result.shape[1]}</td>
                        </tr>
                        <tr className="border-b border-parchment">
                          <td className="py-1 text-slate">Rank utilisation</td>
                          <td className="py-1 text-right">{(result.stats.effectiveRank / result.shape[1] * 100).toFixed(1)}%</td>
                        </tr>
                        <tr className="border-b border-parchment">
                          <td className="py-1 text-slate">Isotropy score</td>
                          <td className="py-1 text-right">{result.stats.isotropyScore.toFixed(4)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Right column: norm stats */}
                  <div>
                    <h4 className="font-sans text-[11px] font-semibold text-slate uppercase tracking-wider mb-2">Norm Statistics</h4>
                    <table className="w-full font-mono text-[11px]">
                      <tbody>
                        <tr className="border-b border-parchment">
                          <td className="py-1 text-slate">Mean</td>
                          <td className="py-1 text-right">{result.stats.meanNorm.toFixed(4)}</td>
                        </tr>
                        <tr className="border-b border-parchment">
                          <td className="py-1 text-slate">Std dev</td>
                          <td className="py-1 text-right">{result.stats.stdNorm.toFixed(4)}</td>
                        </tr>
                        <tr className="border-b border-parchment">
                          <td className="py-1 text-slate">Min</td>
                          <td className="py-1 text-right">{result.stats.minNorm.toFixed(4)}</td>
                        </tr>
                        <tr className="border-b border-parchment">
                          <td className="py-1 text-slate">Max</td>
                          <td className="py-1 text-right">{result.stats.maxNorm.toFixed(4)}</td>
                        </tr>
                        <tr className="border-b border-parchment">
                          <td className="py-1 text-slate">Range</td>
                          <td className="py-1 text-right">{(result.stats.maxNorm - result.stats.minNorm).toFixed(4)}</td>
                        </tr>
                        <tr className="border-b border-parchment">
                          <td className="py-1 text-slate">CV (σ/μ)</td>
                          <td className="py-1 text-right">{(result.stats.stdNorm / result.stats.meanNorm).toFixed(4)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Interpretation notes */}
                <div className="bg-cream/50 rounded-sm p-3">
                  <p className="font-sans text-[11px] text-slate leading-relaxed">
                    <strong>Effective rank</strong> measures how many dimensions carry significant variance (via Shannon entropy of singular values).
                    A rank of {result.stats.effectiveRank.toFixed(0)} / {result.shape[1]} means {(result.stats.effectiveRank / result.shape[1] * 100).toFixed(0)}% of
                    available dimensions are utilised. <strong>Isotropy</strong> measures directional uniformity: 1.0 = perfectly uniform,
                    0.0 = all vectors aligned. Low isotropy indicates anisotropic geometry with privileged directions.
                  </p>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  unit,
  explained,
  onExplain,
  secondaryAction,
}: {
  label: string;
  value: string;
  unit?: string;
  explained?: boolean;
  onExplain?: () => void;
  secondaryAction?: { label: string; onClick: () => void };
}) {
  return (
    <div
      className={`card-editorial p-2 text-center transition-colors ${
        explained ? "border-burgundy/60 shadow-editorial-md" : ""
      }`}
    >
      <button
        type="button"
        onClick={onExplain}
        title="Click for explanation"
        className={`font-sans text-[10px] uppercase tracking-wider underline decoration-dotted underline-offset-2 decoration-slate/40 hover:decoration-burgundy hover:text-burgundy cursor-help transition-colors ${
          explained ? "text-burgundy decoration-burgundy" : "text-slate"
        }`}
      >
        {label}
      </button>
      <div className="font-sans text-xs font-semibold mt-0.5">
        {value}
        {unit && <span className="font-sans text-[10px] text-slate font-normal ml-0.5">{unit}</span>}
      </div>
      {secondaryAction && (
        <button
          type="button"
          onClick={secondaryAction.onClick}
          className="font-sans text-[9px] text-burgundy/70 hover:text-burgundy mt-0.5 underline decoration-dotted underline-offset-2"
        >
          {secondaryAction.label}
        </button>
      )}
    </div>
  );
}
