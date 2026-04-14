"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import type { EmbeddingTableResult } from "@/types/model";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

const BACKEND_URL = "http://localhost:8000";

export default function EmbeddingTable() {
  const [result, setResult] = useState<EmbeddingTableResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sampleSize, setSampleSize] = useState(3000);

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
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Controls */}
      <div className="card-editorial p-6">
        <div className="flex items-center gap-4">
          <label className="font-sans text-caption text-slate">
            Sample size
            <input
              type="number"
              value={sampleSize}
              onChange={(e) => setSampleSize(Number(e.target.value))}
              className="input-editorial ml-2 w-24"
              min={100}
              max={50000}
            />
          </label>
          <button
            onClick={run}
            disabled={loading}
            className="btn-editorial-primary"
          >
            {loading ? "Extracting..." : "Extract Embedding Table"}
          </button>
          {error && <span className="text-red-600 font-sans text-caption">{error}</span>}
        </div>
      </div>

      {result && (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard label="Vocabulary" value={result.shape[0].toLocaleString()} unit="tokens" />
            <StatCard label="Dimension" value={result.shape[1].toString()} unit="d" />
            <StatCard label="Mean Norm" value={result.stats.meanNorm.toFixed(2)} />
            <StatCard label="Effective Rank" value={result.stats.effectiveRank.toFixed(1)} unit={`/ ${result.shape[1]}`} />
            <StatCard label="Isotropy" value={result.stats.isotropyScore.toFixed(3)} />
            <StatCard label="Norm Range" value={`${result.stats.minNorm.toFixed(1)} \u2013 ${result.stats.maxNorm.toFixed(1)}`} />
          </div>

          {/* 3D Scatter */}
          <div className="card-editorial p-4">
            <h3 className="font-heading text-heading-sm mb-4">
              Vocabulary Embedding Space (PCA → 3D, {result.sampleTokens.length.toLocaleString()} tokens sampled)
            </h3>
            <Plot
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
                height: 550,
                margin: { l: 0, r: 0, t: 0, b: 0 },
                paper_bgcolor: "transparent",
                plot_bgcolor: "transparent",
                scene: {
                  xaxis: { title: "PC1", gridcolor: "#E8E0D4", zerolinecolor: "#D4C9B8" },
                  yaxis: { title: "PC2", gridcolor: "#E8E0D4", zerolinecolor: "#D4C9B8" },
                  zaxis: { title: "PC3", gridcolor: "#E8E0D4", zerolinecolor: "#D4C9B8" },
                  bgcolor: "transparent",
                },
                font: { family: "Inter, sans-serif", color: "#4A4A4A" },
              }}
              config={{ displayModeBar: true, displaylogo: false }}
              style={{ width: "100%" }}
            />
          </div>

          {/* Norm histogram */}
          <div className="card-editorial p-4">
            <h3 className="font-heading text-heading-sm mb-4">Norm Distribution</h3>
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
                height: 250,
                margin: { l: 50, r: 20, t: 10, b: 40 },
                paper_bgcolor: "transparent",
                plot_bgcolor: "transparent",
                xaxis: { title: "Norm", gridcolor: "#E8E0D4" },
                yaxis: { title: "Count", gridcolor: "#E8E0D4" },
                font: { family: "Inter, sans-serif", color: "#4A4A4A" },
              }}
              config={{ displayModeBar: false }}
              style={{ width: "100%" }}
            />
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="card-editorial p-4 text-center">
      <div className="font-sans text-caption text-slate uppercase tracking-wider">{label}</div>
      <div className="font-heading text-heading-sm mt-1">
        {value}
        {unit && <span className="font-sans text-caption text-slate ml-1">{unit}</span>}
      </div>
    </div>
  );
}
