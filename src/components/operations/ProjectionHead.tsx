"use client";

import { useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { ChevronDown, ChevronUp } from "lucide-react";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });
import Plot3DWrapper from "@/components/Plot3DWrapper";
import OperationIntro from "@/components/OperationIntro";
import ExportMenu from "@/components/ExportMenu";
import { useModel } from "@/context/ModelContext";

const BACKEND_URL = "http://localhost:8000";

interface ProjectionHeadResult {
  shape: [number, number];
  weightTied: boolean;
  stats: {
    meanNorm: number;
    stdNorm: number;
    minNorm: number;
    maxNorm: number;
    effectiveRank: number;
    isotropyScore: number;
  };
  sampleTokens: string[];
  sampleCoords3d: [number, number, number][];
  sampleNorms: number[];
}

export default function ProjectionHead() {
  const { backendStatus } = useModel();
  const containerRef = useRef<HTMLDivElement>(null);
  const [result, setResult] = useState<ProjectionHeadResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deepDiveOpen, setDeepDiveOpen] = useState(false);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/projection-head`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sample_size: 3000 }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to extract projection head");
      }
      setResult(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-4" ref={containerRef}>
      <OperationIntro
        name="Projection Head"
        summary="Extracts the output projection matrix (the layer that maps final hidden states back to vocabulary logits) and reports whether it is tied to the input embedding. Computes its norm statistics, effective rank, and isotropy, then projects sampled rows into 3D so you can compare the output geometry against the input embedding."
        details={
          <>
            <p>
              The projection head, sometimes called the unembedding or LM head, is the last matrix in a language model. After the transformer has finished its work, the final hidden state is multiplied by this matrix to produce a score for every token in the vocabulary. The highest scores become the next-token prediction.
            </p>
            <p>
              In many models this matrix is <strong>tied</strong> to the input embedding — they share the same weights, so the space used for reading tokens is identical to the space used for writing them. In others it is separate, which means the model maintains two different geometries for the same vocabulary. This operation reports which regime the model is in.
            </p>
            <p>
              The statistics mirror those of the input embedding: norm distribution, effective rank, isotropy. Comparing the two matrices reveals whether the model treats its read and write sides symmetrically, or whether something has happened during training to distort one relative to the other.
            </p>
            <p>
              For weight-tied models this is largely a sanity check. For separately parameterised heads, it is the beginning of an investigation into why the model sees tokens differently at input than at output.
            </p>
          </>
        }
      />
      <div className="card-editorial p-4">
        <div className="flex items-center gap-4">
          <button onClick={run} disabled={loading} className="btn-editorial-primary">
            {loading ? "Extracting..." : "Extract Projection Head"}
          </button>
          {error && <span className="text-red-600 font-sans text-[11px]">{error}</span>}
        </div>
      </div>

      {result && (
        <>
          <div className="flex justify-end">
            <ExportMenu
              operationName="Projection Head"
              modelName={backendStatus.model?.name}
              getBundle={() => ({
                json: result,
                plotContainer: containerRef.current,
                pdfTitle: "Projection Head",
                pdfMetadata: [
                  { label: "Shape", value: `${result.shape[0]} × ${result.shape[1]}` },
                  { label: "Weight tied", value: result.weightTied ? "yes" : "no" },
                  { label: "Mean norm", value: result.stats.meanNorm.toFixed(3) },
                  { label: "Effective rank", value: String(result.stats.effectiveRank) },
                ],
              })}
            />
          </div>
          {/* Weight tying notice */}
          {result.weightTied && (
            <div className="bg-cream/50 border border-parchment-dark rounded-sm p-3">
              <p className="font-sans text-[11px] text-slate">
                <strong>Weight-tied:</strong> The lm_head shares the same tensor as the input embedding table.
                The geometry below is identical to the Embedding Table view.
              </p>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
            <StatCard label="Vocabulary" value={result.shape[0].toLocaleString()} unit="tokens" />
            <StatCard label="Dimension" value={result.shape[1].toString()} unit="d" />
            <StatCard label="Mean Norm" value={result.stats.meanNorm.toFixed(2)} />
            <StatCard label="Effective Rank" value={result.stats.effectiveRank.toFixed(1)} unit={`/ ${result.shape[1]}`} />
            <StatCard label="Isotropy" value={result.stats.isotropyScore.toFixed(3)} />
            <StatCard label="Weight Tied" value={result.weightTied ? "Yes" : "No"} />
          </div>

          {/* 3D Scatter */}
          <div className="card-editorial p-3">
            <h3 className="font-sans text-xs font-semibold text-slate mb-2">
              Output Projection Space (PCA → 3D, {result.sampleTokens.length.toLocaleString()} tokens)
            </h3>
            <Plot3DWrapper
              data={[{
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
                  colorscale: [[0, "#5B2333"], [0.5, "#A67F6F"], [1, "#F5F0E8"]],
                  colorbar: { title: "Norm", thickness: 15 },
                  opacity: 0.7,
                },
              }]}
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

          {/* Deep dive */}
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
                <table className="w-full font-mono text-[11px] mt-3">
                  <tbody>
                    <tr className="border-b border-parchment"><td className="py-1 text-slate">Shape</td><td className="py-1 text-right">{result.shape[0].toLocaleString()} x {result.shape[1]}</td></tr>
                    <tr className="border-b border-parchment"><td className="py-1 text-slate">Weight tied</td><td className="py-1 text-right">{result.weightTied ? "Yes" : "No"}</td></tr>
                    <tr className="border-b border-parchment"><td className="py-1 text-slate">Effective rank</td><td className="py-1 text-right">{result.stats.effectiveRank.toFixed(2)} / {result.shape[1]}</td></tr>
                    <tr className="border-b border-parchment"><td className="py-1 text-slate">Rank utilisation</td><td className="py-1 text-right">{(result.stats.effectiveRank / result.shape[1] * 100).toFixed(1)}%</td></tr>
                    <tr className="border-b border-parchment"><td className="py-1 text-slate">Isotropy</td><td className="py-1 text-right">{result.stats.isotropyScore.toFixed(4)}</td></tr>
                    <tr className="border-b border-parchment"><td className="py-1 text-slate">Mean norm</td><td className="py-1 text-right">{result.stats.meanNorm.toFixed(4)}</td></tr>
                    <tr className="border-b border-parchment"><td className="py-1 text-slate">Std norm</td><td className="py-1 text-right">{result.stats.stdNorm.toFixed(4)}</td></tr>
                    <tr className="border-b border-parchment"><td className="py-1 text-slate">Min / Max</td><td className="py-1 text-right">{result.stats.minNorm.toFixed(4)} / {result.stats.maxNorm.toFixed(4)}</td></tr>
                  </tbody>
                </table>
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
