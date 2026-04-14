"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import type { EmbeddingTableResult } from "@/types/model";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

const BACKEND_URL = "http://localhost:8000";

export default function VocabularyMap() {
  const [result, setResult] = useState<EmbeddingTableResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sampleSize, setSampleSize] = useState(8000);
  const [searchTerm, setSearchTerm] = useState("");

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
        throw new Error(err.detail || "Failed to extract vocabulary");
      }
      const data: EmbeddingTableResult = await res.json();
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [sampleSize]);

  // Filter tokens for highlighting
  const highlightIndices = result && searchTerm.trim()
    ? result.sampleTokens
        .map((t, i) => (t.toLowerCase().includes(searchTerm.toLowerCase()) ? i : -1))
        .filter((i) => i >= 0)
    : [];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Controls */}
      <div className="card-editorial p-6">
        <div className="flex items-center gap-4 flex-wrap">
          <label className="font-sans text-caption text-slate">
            Sample
            <input
              type="number"
              value={sampleSize}
              onChange={(e) => setSampleSize(Number(e.target.value))}
              className="input-editorial ml-2 w-24"
              min={1000}
              max={50000}
            />
          </label>
          <button
            onClick={run}
            disabled={loading}
            className="btn-editorial-primary"
          >
            {loading ? "Mapping..." : "Map Vocabulary"}
          </button>
          {result && (
            <label className="font-sans text-caption text-slate ml-4">
              Highlight
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-editorial ml-2 w-48"
                placeholder="Search tokens..."
              />
            </label>
          )}
          {error && <span className="text-red-600 font-sans text-caption">{error}</span>}
        </div>
      </div>

      {result && (
        <>
          {/* Info bar */}
          <div className="card-editorial p-4">
            <div className="font-sans text-caption text-slate flex items-center gap-6">
              <span>{result.sampleTokens.length.toLocaleString()} tokens sampled from {result.shape[0].toLocaleString()}</span>
              <span>Effective rank: {result.stats.effectiveRank.toFixed(1)} / {result.shape[1]}</span>
              <span>Isotropy: {result.stats.isotropyScore.toFixed(3)}</span>
              {highlightIndices && highlightIndices.length > 0 && (
                <span className="text-burgundy font-semibold">
                  {highlightIndices.length} matches for &ldquo;{searchTerm}&rdquo;
                </span>
              )}
            </div>
          </div>

          {/* 3D Map */}
          <div className="card-editorial p-4">
            <h3 className="font-heading text-heading-sm mb-4">
              Vocabulary Topology (PCA → 3D)
            </h3>
            <Plot
              data={[
                // All tokens (background)
                {
                  type: "scatter3d",
                  mode: "markers",
                  x: result.sampleCoords3d.map((c) => c[0]),
                  y: result.sampleCoords3d.map((c) => c[1]),
                  z: result.sampleCoords3d.map((c) => c[2]),
                  text: result.sampleTokens,
                  hovertemplate: "<b>%{text}</b><br>norm: %{marker.color:.2f}<extra></extra>",
                  marker: {
                    size: 1.5,
                    color: result.sampleNorms,
                    colorscale: [
                      [0, "#D4C9B8"],
                      [0.5, "#A67F6F"],
                      [1, "#5B2333"],
                    ],
                    opacity: highlightIndices && highlightIndices.length > 0 ? 0.2 : 0.5,
                  },
                  name: "Vocabulary",
                },
                // Highlighted tokens
                ...(highlightIndices && highlightIndices.length > 0
                  ? [
                      {
                        type: "scatter3d" as const,
                        mode: "markers+text" as const,
                        x: highlightIndices.map((i) => result.sampleCoords3d[i][0]),
                        y: highlightIndices.map((i) => result.sampleCoords3d[i][1]),
                        z: highlightIndices.map((i) => result.sampleCoords3d[i][2]),
                        text: highlightIndices.map((i) => result.sampleTokens[i]),
                        textposition: "top center" as const,
                        hovertemplate: "<b>%{text}</b><extra></extra>",
                        marker: {
                          size: 5,
                          color: "#5B8C5A",
                          opacity: 1,
                        },
                        name: "Matches",
                      },
                    ]
                  : []),
              ]}
              layout={{
                height: 650,
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
                showlegend: true,
                legend: { x: 0.02, y: 0.98 },
              }}
              config={{ displayModeBar: true, displaylogo: false }}
              style={{ width: "100%" }}
            />
          </div>
        </>
      )}
    </div>
  );
}
